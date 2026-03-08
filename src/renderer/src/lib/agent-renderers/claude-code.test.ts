import { describe, expect, it } from 'vitest'
import { ClaudeCodeStreamParser } from './claude-code'

/** Helper: wrap an event object in the stream_event envelope and return as NDJSON line. */
function line(event: Record<string, unknown>): string {
	return `${JSON.stringify({ type: 'stream_event', event })}\n`
}

describe('ClaudeCodeStreamParser', () => {
	it('starts empty', () => {
		const parser = new ClaudeCodeStreamParser()
		expect(parser.getMessages()).toEqual([])
	})

	describe('message lifecycle', () => {
		it('creates a message on message_start', () => {
			const parser = new ClaudeCodeStreamParser()
			parser.feed(
				line({
					type: 'message_start',
					message: {
						id: 'msg_001',
						role: 'assistant',
						model: 'claude-opus-4-6',
						usage: { input_tokens: 100, output_tokens: 0 },
						content: [],
					},
				}),
			)

			const msgs = parser.getMessages()
			expect(msgs).toHaveLength(1)
			expect(msgs[0].id).toBe('msg_001')
			expect(msgs[0].role).toBe('assistant')
			expect(msgs[0].model).toBe('claude-opus-4-6')
			expect(msgs[0].streaming).toBe(true)
			expect(msgs[0].usage).toEqual({ inputTokens: 100, outputTokens: 0 })
		})

		it('finalizes message on message_stop', () => {
			const parser = new ClaudeCodeStreamParser()
			parser.feed(
				line({
					type: 'message_start',
					message: { id: 'msg_001', role: 'assistant' },
				}),
			)
			parser.feed(line({ type: 'message_stop' }))

			expect(parser.getMessages()[0].streaming).toBe(false)
		})

		it('updates stop_reason and usage via message_delta', () => {
			const parser = new ClaudeCodeStreamParser()
			parser.feed(
				line({
					type: 'message_start',
					message: {
						id: 'msg_001',
						role: 'assistant',
						usage: { input_tokens: 50, output_tokens: 0 },
					},
				}),
			)
			parser.feed(
				line({
					type: 'message_delta',
					delta: { stop_reason: 'end_turn' },
					usage: { output_tokens: 150 },
				}),
			)

			const msg = parser.getMessages()[0]
			expect(msg.stopReason).toBe('end_turn')
			expect(msg.usage?.outputTokens).toBe(150)
		})
	})

	describe('text blocks', () => {
		it('accumulates text_delta into a text block', () => {
			const parser = new ClaudeCodeStreamParser()
			parser.feed(
				line({
					type: 'message_start',
					message: { id: 'msg_001', role: 'assistant' },
				}),
			)
			parser.feed(
				line({
					type: 'content_block_start',
					index: 0,
					content_block: { type: 'text' },
				}),
			)
			parser.feed(
				line({
					type: 'content_block_delta',
					index: 0,
					delta: { type: 'text_delta', text: 'Hello ' },
				}),
			)
			parser.feed(
				line({
					type: 'content_block_delta',
					index: 0,
					delta: { type: 'text_delta', text: 'world!' },
				}),
			)
			parser.feed(line({ type: 'content_block_stop', index: 0 }))

			const blocks = parser.getMessages()[0].blocks
			expect(blocks).toHaveLength(1)
			expect(blocks[0]).toEqual({ type: 'text', text: 'Hello world!' })
		})
	})

	describe('tool_use blocks', () => {
		it('accumulates input_json_delta into a tool_use block', () => {
			const parser = new ClaudeCodeStreamParser()
			parser.feed(
				line({
					type: 'message_start',
					message: { id: 'msg_001', role: 'assistant' },
				}),
			)
			// Text block first
			parser.feed(
				line({
					type: 'content_block_start',
					index: 0,
					content_block: { type: 'text' },
				}),
			)
			parser.feed(
				line({
					type: 'content_block_delta',
					index: 0,
					delta: { type: 'text_delta', text: 'Let me read that file.' },
				}),
			)
			parser.feed(line({ type: 'content_block_stop', index: 0 }))

			// Tool use block
			parser.feed(
				line({
					type: 'content_block_start',
					index: 1,
					content_block: { type: 'tool_use', id: 'toolu_123', name: 'read', input: {} },
				}),
			)
			parser.feed(
				line({
					type: 'content_block_delta',
					index: 1,
					delta: { type: 'input_json_delta', partial_json: '{"file_' },
				}),
			)
			parser.feed(
				line({
					type: 'content_block_delta',
					index: 1,
					delta: { type: 'input_json_delta', partial_json: 'path": "/src/index.ts"}' },
				}),
			)
			parser.feed(line({ type: 'content_block_stop', index: 1 }))

			const blocks = parser.getMessages()[0].blocks
			expect(blocks).toHaveLength(2)
			expect(blocks[0]).toEqual({ type: 'text', text: 'Let me read that file.' })
			expect(blocks[1]).toEqual({
				type: 'tool_use',
				id: 'toolu_123',
				name: 'read',
				inputJson: '{"file_path": "/src/index.ts"}',
			})
		})
	})

	describe('thinking blocks', () => {
		it('accumulates thinking_delta into a thinking block', () => {
			const parser = new ClaudeCodeStreamParser()
			parser.feed(
				line({
					type: 'message_start',
					message: { id: 'msg_001', role: 'assistant' },
				}),
			)
			parser.feed(
				line({
					type: 'content_block_start',
					index: 0,
					content_block: { type: 'thinking' },
				}),
			)
			parser.feed(
				line({
					type: 'content_block_delta',
					index: 0,
					delta: { type: 'thinking_delta', thinking: 'I need to ' },
				}),
			)
			parser.feed(
				line({
					type: 'content_block_delta',
					index: 0,
					delta: { type: 'thinking_delta', thinking: 'analyze this code...' },
				}),
			)
			// signature_delta should be ignored
			parser.feed(
				line({
					type: 'content_block_delta',
					index: 0,
					delta: { type: 'signature_delta', signature: 'abc123' },
				}),
			)
			parser.feed(line({ type: 'content_block_stop', index: 0 }))

			const blocks = parser.getMessages()[0].blocks
			expect(blocks).toHaveLength(1)
			expect(blocks[0]).toEqual({
				type: 'thinking',
				text: 'I need to analyze this code...',
			})
		})
	})

	describe('partial line buffering', () => {
		it('handles chunks that split across line boundaries', () => {
			const parser = new ClaudeCodeStreamParser()

			// Feed message_start in two partial chunks
			const fullLine = JSON.stringify({
				type: 'stream_event',
				event: { type: 'message_start', message: { id: 'msg_001', role: 'assistant' } },
			})
			const half = Math.floor(fullLine.length / 2)
			parser.feed(fullLine.slice(0, half))
			// No message yet — line is incomplete
			expect(parser.getMessages()).toHaveLength(0)

			// Complete the line
			parser.feed(`${fullLine.slice(half)}\n`)
			expect(parser.getMessages()).toHaveLength(1)
		})

		it('handles multiple complete lines in one chunk', () => {
			const parser = new ClaudeCodeStreamParser()
			const chunk =
				line({
					type: 'message_start',
					message: { id: 'msg_001', role: 'assistant' },
				}) +
				line({
					type: 'content_block_start',
					index: 0,
					content_block: { type: 'text' },
				}) +
				line({
					type: 'content_block_delta',
					index: 0,
					delta: { type: 'text_delta', text: 'Hello' },
				})

			parser.feed(chunk)
			expect(parser.getMessages()).toHaveLength(1)
			expect(parser.getMessages()[0].blocks).toHaveLength(1)
			expect(parser.getMessages()[0].blocks[0]).toEqual({ type: 'text', text: 'Hello' })
		})
	})

	describe('non-JSON lines', () => {
		it('ignores shell prompts and other non-JSON output', () => {
			const parser = new ClaudeCodeStreamParser()
			parser.feed('$ claude --output-format stream-json\n')
			parser.feed('Loading...\n')
			parser.feed(
				line({
					type: 'message_start',
					message: { id: 'msg_001', role: 'assistant' },
				}),
			)

			expect(parser.getMessages()).toHaveLength(1)
		})

		it('ignores malformed JSON lines', () => {
			const parser = new ClaudeCodeStreamParser()
			parser.feed('{ broken json\n')
			parser.feed(
				line({
					type: 'message_start',
					message: { id: 'msg_001', role: 'assistant' },
				}),
			)

			expect(parser.getMessages()).toHaveLength(1)
		})

		it('ignores JSON that is not a stream_event or known API event', () => {
			const parser = new ClaudeCodeStreamParser()
			parser.feed(`${JSON.stringify({ type: 'other', data: 'test' })}\n`)
			expect(parser.getMessages()).toHaveLength(0)
		})
	})

	describe('multi-message sequences', () => {
		it('merges consecutive assistant messages into one (tool use → next response)', () => {
			const parser = new ClaudeCodeStreamParser()

			// First message: assistant with tool use
			parser.feed(
				line({
					type: 'message_start',
					message: { id: 'msg_001', role: 'assistant' },
				}),
			)
			parser.feed(
				line({
					type: 'content_block_start',
					index: 0,
					content_block: { type: 'tool_use', id: 'toolu_1', name: 'bash', input: {} },
				}),
			)
			parser.feed(
				line({
					type: 'content_block_delta',
					index: 0,
					delta: { type: 'input_json_delta', partial_json: '{"command": "ls"}' },
				}),
			)
			parser.feed(line({ type: 'content_block_stop', index: 0 }))
			parser.feed(line({ type: 'message_delta', delta: { stop_reason: 'tool_use' } }))
			parser.feed(line({ type: 'message_stop' }))

			// Second message_start: same role — should merge into first
			parser.feed(
				line({
					type: 'message_start',
					message: { id: 'msg_002', role: 'assistant' },
				}),
			)
			parser.feed(
				line({
					type: 'content_block_start',
					index: 0,
					content_block: { type: 'text' },
				}),
			)
			parser.feed(
				line({
					type: 'content_block_delta',
					index: 0,
					delta: { type: 'text_delta', text: 'Here are the files.' },
				}),
			)
			parser.feed(line({ type: 'content_block_stop', index: 0 }))
			parser.feed(line({ type: 'message_stop' }))

			const msgs = parser.getMessages()
			// Consecutive assistant messages are merged into one
			expect(msgs).toHaveLength(1)

			expect(msgs[0].id).toBe('msg_001')
			expect(msgs[0].streaming).toBe(false)
			// Both blocks accumulated in one message
			expect(msgs[0].blocks).toHaveLength(2)
			expect(msgs[0].blocks[0]).toMatchObject({ type: 'tool_use', name: 'bash' })
			expect(msgs[0].blocks[1]).toEqual({ type: 'text', text: 'Here are the files.' })
		})
	})

	describe('interleaved thinking and text', () => {
		it('handles thinking → text → tool_use in one message', () => {
			const parser = new ClaudeCodeStreamParser()
			parser.feed(
				line({
					type: 'message_start',
					message: { id: 'msg_001', role: 'assistant' },
				}),
			)

			// Thinking block
			parser.feed(
				line({ type: 'content_block_start', index: 0, content_block: { type: 'thinking' } }),
			)
			parser.feed(
				line({
					type: 'content_block_delta',
					index: 0,
					delta: { type: 'thinking_delta', thinking: 'Hmm...' },
				}),
			)
			parser.feed(line({ type: 'content_block_stop', index: 0 }))

			// Text block
			parser.feed(line({ type: 'content_block_start', index: 1, content_block: { type: 'text' } }))
			parser.feed(
				line({
					type: 'content_block_delta',
					index: 1,
					delta: { type: 'text_delta', text: 'I will read' },
				}),
			)
			parser.feed(line({ type: 'content_block_stop', index: 1 }))

			// Tool use block
			parser.feed(
				line({
					type: 'content_block_start',
					index: 2,
					content_block: { type: 'tool_use', id: 'toolu_1', name: 'read', input: {} },
				}),
			)
			parser.feed(
				line({
					type: 'content_block_delta',
					index: 2,
					delta: { type: 'input_json_delta', partial_json: '{"file_path": "a.ts"}' },
				}),
			)
			parser.feed(line({ type: 'content_block_stop', index: 2 }))
			parser.feed(line({ type: 'message_stop' }))

			const blocks = parser.getMessages()[0].blocks
			expect(blocks).toHaveLength(3)
			expect(blocks[0].type).toBe('thinking')
			expect(blocks[1].type).toBe('text')
			expect(blocks[2].type).toBe('tool_use')
		})
	})

	describe('bare API events (no stream_event wrapper)', () => {
		it('handles message lifecycle with bare top-level events', () => {
			const parser = new ClaudeCodeStreamParser()
			parser.feed(
				`${JSON.stringify({
					type: 'message_start',
					message: { id: 'msg_bare', role: 'assistant', model: 'claude-opus-4-6' },
				})}\n`,
			)
			parser.feed(
				`${JSON.stringify({
					type: 'content_block_start',
					index: 0,
					content_block: { type: 'text' },
				})}\n`,
			)
			parser.feed(
				`${JSON.stringify({
					type: 'content_block_delta',
					index: 0,
					delta: { type: 'text_delta', text: 'Hello from bare!' },
				})}\n`,
			)
			parser.feed(`${JSON.stringify({ type: 'content_block_stop', index: 0 })}\n`)
			parser.feed(
				`${JSON.stringify({
					type: 'message_delta',
					delta: { stop_reason: 'end_turn' },
					usage: { output_tokens: 5 },
				})}\n`,
			)
			parser.feed(`${JSON.stringify({ type: 'message_stop' })}\n`)

			const msgs = parser.getMessages()
			expect(msgs).toHaveLength(1)
			expect(msgs[0].id).toBe('msg_bare')
			expect(msgs[0].streaming).toBe(false)
			expect(msgs[0].stopReason).toBe('end_turn')
			expect(msgs[0].blocks).toHaveLength(1)
			expect(msgs[0].blocks[0]).toEqual({ type: 'text', text: 'Hello from bare!' })
		})

		it('can mix bare and wrapped events', () => {
			const parser = new ClaudeCodeStreamParser()
			// Bare message_start
			parser.feed(
				`${JSON.stringify({
					type: 'message_start',
					message: { id: 'msg_mix', role: 'assistant' },
				})}\n`,
			)
			// Wrapped content_block_start
			parser.feed(
				line({
					type: 'content_block_start',
					index: 0,
					content_block: { type: 'text' },
				}),
			)
			// Bare delta
			parser.feed(
				`${JSON.stringify({
					type: 'content_block_delta',
					index: 0,
					delta: { type: 'text_delta', text: 'mixed' },
				})}\n`,
			)
			parser.feed(`${JSON.stringify({ type: 'message_stop' })}\n`)

			const msgs = parser.getMessages()
			expect(msgs).toHaveLength(1)
			expect(msgs[0].blocks[0]).toEqual({ type: 'text', text: 'mixed' })
		})
	})

	describe('reset', () => {
		it('clears all state', () => {
			const parser = new ClaudeCodeStreamParser()
			parser.feed(
				line({
					type: 'message_start',
					message: { id: 'msg_001', role: 'assistant' },
				}),
			)
			parser.feed(
				line({
					type: 'content_block_start',
					index: 0,
					content_block: { type: 'text' },
				}),
			)

			parser.reset()
			expect(parser.getMessages()).toEqual([])

			// Can start fresh after reset
			parser.feed(
				line({
					type: 'message_start',
					message: { id: 'msg_002', role: 'assistant' },
				}),
			)
			expect(parser.getMessages()).toHaveLength(1)
			expect(parser.getMessages()[0].id).toBe('msg_002')
		})
	})

	describe('verbose stream-json format', () => {
		it('handles top-level system events (ignored)', () => {
			const parser = new ClaudeCodeStreamParser()
			parser.feed(`${JSON.stringify({ type: 'system', subtype: 'init', session_id: 'sess_1' })}\n`)
			expect(parser.getMessages()).toHaveLength(0)
		})

		it('handles top-level assistant snapshots (ignored — redundant with stream_event deltas)', () => {
			const parser = new ClaudeCodeStreamParser()
			parser.feed(
				`${JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'hi' }] } })}\n`,
			)
			expect(parser.getMessages()).toHaveLength(0)
		})

		it('handles top-level rate_limit_event (ignored)', () => {
			const parser = new ClaudeCodeStreamParser()
			parser.feed(
				`${JSON.stringify({ type: 'rate_limit_event', rate_limit_info: { status: 'allowed' } })}\n`,
			)
			expect(parser.getMessages()).toHaveLength(0)
		})

		it('extracts session_id from result event', () => {
			const parser = new ClaudeCodeStreamParser()
			parser.feed(
				line({
					type: 'message_start',
					message: { id: 'msg_001', role: 'assistant' },
				}),
			)
			parser.feed(
				line({
					type: 'content_block_start',
					index: 0,
					content_block: { type: 'text' },
				}),
			)
			parser.feed(
				line({
					type: 'content_block_delta',
					index: 0,
					delta: { type: 'text_delta', text: 'Hello!' },
				}),
			)
			parser.feed(line({ type: 'message_stop' }))

			// Result event from verbose stream-json
			parser.feed(
				`${JSON.stringify({
					type: 'result',
					session_id: 'abc-123-def',
					stop_reason: 'end_turn',
					usage: { input_tokens: 50, output_tokens: 10 },
				})}\n`,
			)

			expect(parser.getSessionId()).toBe('abc-123-def')
		})

		it('result event marks streaming message as done', () => {
			const parser = new ClaudeCodeStreamParser()
			parser.feed(
				line({
					type: 'message_start',
					message: { id: 'msg_001', role: 'assistant' },
				}),
			)
			parser.feed(
				line({
					type: 'content_block_start',
					index: 0,
					content_block: { type: 'text' },
				}),
			)
			parser.feed(
				line({
					type: 'content_block_delta',
					index: 0,
					delta: { type: 'text_delta', text: 'Hi' },
				}),
			)

			// No message_stop — result event should finalize
			parser.feed(
				`${JSON.stringify({
					type: 'result',
					session_id: 'sess_1',
					stop_reason: 'end_turn',
				})}\n`,
			)

			expect(parser.getMessages()[0].streaming).toBe(false)
			expect(parser.getMessages()[0].stopReason).toBe('end_turn')
		})

		it('preserves session_id across reset (for multi-turn --resume)', () => {
			const parser = new ClaudeCodeStreamParser()
			parser.feed(`${JSON.stringify({ type: 'result', session_id: 'sess_keep' })}\n`)
			parser.reset()
			expect(parser.getSessionId()).toBe('sess_keep')
		})
	})

	describe('edge cases', () => {
		it('ignores deltas before message_start', () => {
			const parser = new ClaudeCodeStreamParser()
			parser.feed(
				line({
					type: 'content_block_delta',
					index: 0,
					delta: { type: 'text_delta', text: 'orphan' },
				}),
			)
			expect(parser.getMessages()).toHaveLength(0)
		})

		it('ignores content_block_start before message_start', () => {
			const parser = new ClaudeCodeStreamParser()
			parser.feed(
				line({
					type: 'content_block_start',
					index: 0,
					content_block: { type: 'text' },
				}),
			)
			expect(parser.getMessages()).toHaveLength(0)
		})

		it('ignores delta for unknown block index', () => {
			const parser = new ClaudeCodeStreamParser()
			parser.feed(
				line({
					type: 'message_start',
					message: { id: 'msg_001', role: 'assistant' },
				}),
			)
			// Delta for index 5 but no block started at that index
			parser.feed(
				line({
					type: 'content_block_delta',
					index: 5,
					delta: { type: 'text_delta', text: 'ghost' },
				}),
			)
			expect(parser.getMessages()[0].blocks).toHaveLength(0)
		})

		it('handles empty chunks', () => {
			const parser = new ClaudeCodeStreamParser()
			parser.feed('')
			parser.feed('')
			expect(parser.getMessages()).toHaveLength(0)
		})

		it('handles message_start without usage', () => {
			const parser = new ClaudeCodeStreamParser()
			parser.feed(
				line({
					type: 'message_start',
					message: { id: 'msg_001', role: 'assistant' },
				}),
			)
			expect(parser.getMessages()[0].usage).toBeNull()
		})

		it('handles message_delta that creates usage when none existed', () => {
			const parser = new ClaudeCodeStreamParser()
			parser.feed(
				line({
					type: 'message_start',
					message: { id: 'msg_001', role: 'assistant' },
				}),
			)
			parser.feed(
				line({
					type: 'message_delta',
					delta: { stop_reason: 'end_turn' },
					usage: { output_tokens: 42 },
				}),
			)
			expect(parser.getMessages()[0].usage).toEqual({ inputTokens: 0, outputTokens: 42 })
		})

		it('handles ANSI escape sequences mixed with NDJSON', () => {
			const parser = new ClaudeCodeStreamParser()
			parser.feed('\x1b[?2004h\n')
			parser.feed('\x1b[0m\n')
			parser.feed(
				line({
					type: 'message_start',
					message: { id: 'msg_001', role: 'assistant' },
				}),
			)
			expect(parser.getMessages()).toHaveLength(1)
			expect(parser.getMessages()[0].id).toBe('msg_001')
		})

		it('strips ANSI codes wrapping a JSON line and parses it', () => {
			const parser = new ClaudeCodeStreamParser()
			const json = JSON.stringify({
				type: 'stream_event',
				event: { type: 'message_start', message: { id: 'msg_ansi', role: 'assistant' } },
			})
			// Simulate PTY wrapping JSON in ANSI sequences
			parser.feed(`\x1b[0m${json}\x1b[0m\n`)
			expect(parser.getMessages()).toHaveLength(1)
			expect(parser.getMessages()[0].id).toBe('msg_ansi')
		})

		it('handles \\r\\n (Windows-style) line endings', () => {
			const parser = new ClaudeCodeStreamParser()
			const event = JSON.stringify({
				type: 'stream_event',
				event: { type: 'message_start', message: { id: 'msg_001', role: 'assistant' } },
			})
			parser.feed(`${event}\r\n`)
			expect(parser.getMessages()).toHaveLength(1)
			expect(parser.getMessages()[0].id).toBe('msg_001')
		})

		it('ignores text_delta sent to a tool_use block (delta-type mismatch)', () => {
			const parser = new ClaudeCodeStreamParser()
			parser.feed(
				line({
					type: 'message_start',
					message: { id: 'msg_001', role: 'assistant' },
				}),
			)
			parser.feed(
				line({
					type: 'content_block_start',
					index: 0,
					content_block: { type: 'tool_use', id: 'toolu_1', name: 'bash', input: {} },
				}),
			)
			// Send text_delta to a tool_use block — should be a no-op
			parser.feed(
				line({
					type: 'content_block_delta',
					index: 0,
					delta: { type: 'text_delta', text: 'should not appear' },
				}),
			)
			const block = parser.getMessages()[0].blocks[0]
			expect(block.type).toBe('tool_use')
			if (block.type === 'tool_use') {
				expect(block.inputJson).toBe('')
			}
		})

		it('ignores message_start without message property', () => {
			const parser = new ClaudeCodeStreamParser()
			parser.feed(line({ type: 'message_start' }))
			expect(parser.getMessages()).toHaveLength(0)
		})

		it('validates role and defaults invalid values to assistant', () => {
			const parser = new ClaudeCodeStreamParser()
			parser.feed(
				line({
					type: 'message_start',
					message: { id: 'msg_001', role: 'tool' },
				}),
			)
			expect(parser.getMessages()[0].role).toBe('assistant')
		})

		it('discards partial line buffer on reset', () => {
			const parser = new ClaudeCodeStreamParser()
			// Feed half a line (no newline), then reset
			const fullLine = JSON.stringify({
				type: 'stream_event',
				event: { type: 'message_start', message: { id: 'msg_001', role: 'assistant' } },
			})
			parser.feed(fullLine.slice(0, 20))
			parser.reset()

			// Feed a completely different message — should not produce a frankenstein line
			parser.feed(
				line({
					type: 'message_start',
					message: { id: 'msg_002', role: 'assistant' },
				}),
			)
			expect(parser.getMessages()).toHaveLength(1)
			expect(parser.getMessages()[0].id).toBe('msg_002')
		})
	})

	describe('user events (tool results)', () => {
		it('attaches tool_result blocks to the last assistant message', () => {
			const parser = new ClaudeCodeStreamParser()
			parser.feed(
				line({
					type: 'message_start',
					message: { id: 'msg_001', role: 'assistant' },
				}),
			)
			parser.feed(
				line({
					type: 'content_block_start',
					index: 0,
					content_block: { type: 'tool_use', id: 'toolu_001', name: 'Bash' },
				}),
			)
			parser.feed(
				line({
					type: 'content_block_delta',
					index: 0,
					delta: { type: 'input_json_delta', partial_json: '{"command":"ls"}' },
				}),
			)
			parser.feed(line({ type: 'content_block_stop', index: 0 }))
			parser.feed(line({ type: 'message_stop' }))

			parser.feed(
				`${JSON.stringify({
					type: 'user',
					message: {
						role: 'user',
						content: [
							{
								type: 'tool_result',
								tool_use_id: 'toolu_001',
								content: 'file1.txt\nfile2.txt',
								is_error: false,
							},
						],
					},
					tool_use_result: {
						stdout: 'file1.txt\nfile2.txt',
						stderr: '',
						interrupted: false,
					},
				})}\n`,
			)

			const msgs = parser.getMessages()
			expect(msgs).toHaveLength(1)
			expect(msgs[0].blocks).toHaveLength(2)
			expect(msgs[0].blocks[1].type).toBe('tool_result')
			if (msgs[0].blocks[1].type === 'tool_result') {
				expect(msgs[0].blocks[1].toolUseId).toBe('toolu_001')
				expect(msgs[0].blocks[1].content).toBe('file1.txt\nfile2.txt')
				expect(msgs[0].blocks[1].isError).toBe(false)
			}
		})

		it('handles error tool results', () => {
			const parser = new ClaudeCodeStreamParser()
			parser.feed(
				line({
					type: 'message_start',
					message: { id: 'msg_001', role: 'assistant' },
				}),
			)
			parser.feed(line({ type: 'message_stop' }))

			parser.feed(
				`${JSON.stringify({
					type: 'user',
					message: {
						role: 'user',
						content: [
							{
								type: 'tool_result',
								tool_use_id: 'toolu_002',
								content: 'File does not exist.',
								is_error: true,
							},
						],
					},
					tool_use_result: 'Error: File does not exist.',
				})}\n`,
			)

			const msgs = parser.getMessages()
			expect(msgs[0].blocks).toHaveLength(1)
			expect(msgs[0].blocks[0].type).toBe('tool_result')
			if (msgs[0].blocks[0].type === 'tool_result') {
				expect(msgs[0].blocks[0].isError).toBe(true)
				expect(msgs[0].blocks[0].content).toBe('File does not exist.')
			}
		})

		it('handles tool_reference lists (ToolSearch results)', () => {
			const parser = new ClaudeCodeStreamParser()
			parser.feed(
				line({
					type: 'message_start',
					message: { id: 'msg_001', role: 'assistant' },
				}),
			)
			parser.feed(line({ type: 'message_stop' }))

			parser.feed(
				`${JSON.stringify({
					type: 'user',
					message: {
						role: 'user',
						content: [
							{
								type: 'tool_result',
								tool_use_id: 'toolu_003',
								content: [
									{ type: 'tool_reference', tool_name: 'Read' },
									{ type: 'tool_reference', tool_name: 'Edit' },
								],
							},
						],
					},
					tool_use_result: { matches: ['Read', 'Edit'], query: 'select:Read,Edit' },
				})}\n`,
			)

			const msgs = parser.getMessages()
			expect(msgs[0].blocks).toHaveLength(1)
			if (msgs[0].blocks[0].type === 'tool_result') {
				expect(msgs[0].blocks[0].content).toBe('Read, Edit')
			}
		})

		it('skips user events with no tool_result content', () => {
			const parser = new ClaudeCodeStreamParser()
			parser.feed(
				line({
					type: 'message_start',
					message: { id: 'msg_001', role: 'assistant' },
				}),
			)
			parser.feed(line({ type: 'message_stop' }))

			parser.feed(
				`${JSON.stringify({
					type: 'user',
					message: { role: 'user', content: [] },
				})}\n`,
			)

			const msgs = parser.getMessages()
			expect(msgs).toHaveLength(1)
			expect(msgs[0].blocks).toHaveLength(0)
		})
	})
})

describe('TRACE: multi-turn merge flow', () => {
	it('preserves all blocks across merged turns', () => {
		const parser = new ClaudeCodeStreamParser()

		// Turn 1: thinking + text + tool_use
		parser.feed(line({ type: 'message_start', message: { id: 'msg_001', role: 'assistant' } }))
		parser.feed(
			line({ type: 'content_block_start', index: 0, content_block: { type: 'thinking' } }),
		)
		parser.feed(
			line({
				type: 'content_block_delta',
				index: 0,
				delta: { type: 'thinking_delta', thinking: 'Let me think...' },
			}),
		)
		parser.feed(line({ type: 'content_block_stop', index: 0 }))
		parser.feed(line({ type: 'content_block_start', index: 1, content_block: { type: 'text' } }))
		parser.feed(
			line({
				type: 'content_block_delta',
				index: 1,
				delta: { type: 'text_delta', text: 'Let me gather.' },
			}),
		)
		parser.feed(line({ type: 'content_block_stop', index: 1 }))
		parser.feed(
			line({
				type: 'content_block_start',
				index: 2,
				content_block: { type: 'tool_use', id: 'toolu_001', name: 'ToolSearch' },
			}),
		)
		parser.feed(
			line({
				type: 'content_block_delta',
				index: 2,
				delta: { type: 'input_json_delta', partial_json: '{"query":"select:Read"}' },
			}),
		)
		parser.feed(line({ type: 'content_block_stop', index: 2 }))
		parser.feed(line({ type: 'message_delta', delta: { stop_reason: 'tool_use' } }))
		parser.feed(line({ type: 'message_stop' }))

		expect(parser.getMessages()[0].blocks.map((b) => b.type)).toEqual([
			'thinking',
			'text',
			'tool_use',
		])

		// Tool result
		parser.feed(
			`${JSON.stringify({ type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_001', content: 'Read' }] } })}\n`,
		)

		expect(parser.getMessages()[0].blocks.map((b) => b.type)).toEqual([
			'thinking',
			'text',
			'tool_use',
			'tool_result',
		])

		// Turn 2: merged — Bash tool
		parser.feed(line({ type: 'message_start', message: { id: 'msg_002', role: 'assistant' } }))
		parser.feed(
			line({
				type: 'content_block_start',
				index: 0,
				content_block: { type: 'tool_use', id: 'toolu_002', name: 'Bash' },
			}),
		)
		parser.feed(
			line({
				type: 'content_block_delta',
				index: 0,
				delta: { type: 'input_json_delta', partial_json: '{"command":"ls"}' },
			}),
		)
		parser.feed(line({ type: 'content_block_stop', index: 0 }))
		parser.feed(line({ type: 'message_delta', delta: { stop_reason: 'tool_use' } }))
		parser.feed(line({ type: 'message_stop' }))

		const bashBlock = parser.getMessages()[0].blocks[4]
		expect(bashBlock.type).toBe('tool_use')
		if (bashBlock.type === 'tool_use') {
			expect(bashBlock.name).toBe('Bash')
			expect(bashBlock.inputJson).toBe('{"command":"ls"}')
		}

		// Turn 3: final text
		parser.feed(line({ type: 'message_start', message: { id: 'msg_003', role: 'assistant' } }))
		parser.feed(line({ type: 'content_block_start', index: 0, content_block: { type: 'text' } }))
		parser.feed(
			line({
				type: 'content_block_delta',
				index: 0,
				delta: { type: 'text_delta', text: 'Here is the status.' },
			}),
		)
		parser.feed(line({ type: 'content_block_stop', index: 0 }))
		parser.feed(line({ type: 'message_stop' }))

		expect(parser.getMessages()).toHaveLength(1)
		expect(parser.getMessages()[0].blocks.map((b) => b.type)).toEqual([
			'thinking',
			'text',
			'tool_use',
			'tool_result',
			'tool_use',
			'text',
		])

		const finalText = parser.getMessages()[0].blocks[5]
		expect(finalText.type).toBe('text')
		if (finalText.type === 'text') {
			expect(finalText.text).toBe('Here is the status.')
		}
	})
})

describe('per-block usage tracking', () => {
	it('computes output token deltas per content block', () => {
		const parser = new ClaudeCodeStreamParser()
		parser.feed(
			line({
				type: 'message_start',
				message: {
					id: 'msg_usage',
					role: 'assistant',
					model: 'claude-opus-4-6',
					usage: { input_tokens: 100, output_tokens: 0 },
				},
			}),
		)

		// Block 0: text — tokens go from 0 to 50
		parser.feed(line({ type: 'content_block_start', index: 0, content_block: { type: 'text' } }))
		parser.feed(
			line({
				type: 'content_block_delta',
				index: 0,
				delta: { type: 'text_delta', text: 'Hello' },
			}),
		)
		parser.feed(line({ type: 'message_delta', delta: {}, usage: { output_tokens: 50 } }))
		parser.feed(line({ type: 'content_block_stop', index: 0 }))

		// Block 1: tool_use — tokens go from 50 to 120
		parser.feed(
			line({
				type: 'content_block_start',
				index: 1,
				content_block: { type: 'tool_use', id: 'tool1', name: 'Read' },
			}),
		)
		parser.feed(
			line({
				type: 'content_block_delta',
				index: 1,
				delta: { type: 'input_json_delta', partial_json: '{}' },
			}),
		)
		parser.feed(line({ type: 'message_delta', delta: {}, usage: { output_tokens: 120 } }))
		parser.feed(line({ type: 'content_block_stop', index: 1 }))

		// Block 2: thinking — tokens go from 120 to 200
		parser.feed(
			line({ type: 'content_block_start', index: 2, content_block: { type: 'thinking' } }),
		)
		parser.feed(
			line({
				type: 'content_block_delta',
				index: 2,
				delta: { type: 'thinking_delta', thinking: 'hmm' },
			}),
		)
		parser.feed(line({ type: 'message_delta', delta: {}, usage: { output_tokens: 200 } }))
		parser.feed(line({ type: 'content_block_stop', index: 2 }))

		parser.feed(line({ type: 'message_stop' }))

		const blocks = parser.getMessages()[0].blocks
		expect(blocks).toHaveLength(3)
		expect(blocks[0].type).toBe('text')
		if (blocks[0].type === 'text') expect(blocks[0].usage).toEqual({ outputTokens: 50 })
		expect(blocks[1].type).toBe('tool_use')
		if (blocks[1].type === 'tool_use') expect(blocks[1].usage).toEqual({ outputTokens: 70 })
		expect(blocks[2].type).toBe('thinking')
		if (blocks[2].type === 'thinking') expect(blocks[2].usage).toEqual({ outputTokens: 80 })
	})

	it('does not set usage when no token deltas received', () => {
		const parser = new ClaudeCodeStreamParser()
		parser.feed(
			line({
				type: 'message_start',
				message: { id: 'msg_no_usage', role: 'assistant' },
			}),
		)
		parser.feed(
			line({
				type: 'content_block_start',
				index: 0,
				content_block: { type: 'text' },
			}),
		)
		parser.feed(
			line({
				type: 'content_block_delta',
				index: 0,
				delta: { type: 'text_delta', text: 'Hi' },
			}),
		)
		parser.feed(line({ type: 'content_block_stop', index: 0 }))
		parser.feed(line({ type: 'message_stop' }))

		const blocks = parser.getMessages()[0].blocks
		if (blocks[0].type === 'text') expect(blocks[0].usage).toBeUndefined()
	})

	it('tracks per-block usage across merged multi-turn messages', () => {
		const parser = new ClaudeCodeStreamParser()

		// Turn 1: assistant message with one text block (50 tokens)
		parser.feed(
			line({
				type: 'message_start',
				message: {
					id: 'msg_t1',
					role: 'assistant',
					usage: { input_tokens: 100, output_tokens: 0 },
				},
			}),
		)
		parser.feed(
			line({
				type: 'content_block_start',
				index: 0,
				content_block: { type: 'text' },
			}),
		)
		parser.feed(
			line({
				type: 'content_block_delta',
				index: 0,
				delta: { type: 'text_delta', text: 'Turn 1' },
			}),
		)
		parser.feed(line({ type: 'message_delta', delta: {}, usage: { output_tokens: 50 } }))
		parser.feed(line({ type: 'content_block_stop', index: 0 }))
		parser.feed(line({ type: 'message_stop' }))

		// Turn 2: merged assistant message (API resets output_tokens to 0)
		parser.feed(
			line({
				type: 'message_start',
				message: {
					id: 'msg_t2',
					role: 'assistant',
					usage: { input_tokens: 200, output_tokens: 0 },
				},
			}),
		)
		parser.feed(
			line({
				type: 'content_block_start',
				index: 0,
				content_block: { type: 'text' },
			}),
		)
		parser.feed(
			line({
				type: 'content_block_delta',
				index: 0,
				delta: { type: 'text_delta', text: 'Turn 2' },
			}),
		)
		parser.feed(line({ type: 'message_delta', delta: {}, usage: { output_tokens: 30 } }))
		parser.feed(line({ type: 'content_block_stop', index: 0 }))
		parser.feed(line({ type: 'message_stop' }))

		// Merged into one message with two text blocks
		const msgs = parser.getMessages()
		expect(msgs).toHaveLength(1)
		const blocks = msgs[0].blocks
		expect(blocks).toHaveLength(2)

		// Turn 1 block: 50 tokens
		if (blocks[0].type === 'text') expect(blocks[0].usage).toEqual({ outputTokens: 50 })
		// Turn 2 block: 30 tokens (NOT negative due to reset)
		if (blocks[1].type === 'text') expect(blocks[1].usage).toEqual({ outputTokens: 30 })

		// inputTokens updated to 200 (Turn 2's message_start) — tracks latest turn
		expect(msgs[0].usage?.inputTokens).toBe(200)
	})

	it('initializes usage on merged message when first message_start had no usage', () => {
		const parser = new ClaudeCodeStreamParser()

		// Turn 1: no usage field
		parser.feed(
			line({
				type: 'message_start',
				message: { id: 'msg_no', role: 'assistant' },
			}),
		)
		parser.feed(line({ type: 'content_block_start', index: 0, content_block: { type: 'text' } }))
		parser.feed(
			line({
				type: 'content_block_delta',
				index: 0,
				delta: { type: 'text_delta', text: 'Hi' },
			}),
		)
		parser.feed(line({ type: 'content_block_stop', index: 0 }))
		parser.feed(line({ type: 'message_stop' }))

		expect(parser.getMessages()[0].usage).toBeNull()

		// Turn 2: merged, now has usage
		parser.feed(
			line({
				type: 'message_start',
				message: {
					id: 'msg_yes',
					role: 'assistant',
					usage: { input_tokens: 5000, output_tokens: 0 },
				},
			}),
		)
		parser.feed(line({ type: 'content_block_start', index: 0, content_block: { type: 'text' } }))
		parser.feed(
			line({
				type: 'content_block_delta',
				index: 0,
				delta: { type: 'text_delta', text: 'Now' },
			}),
		)
		parser.feed(line({ type: 'message_stop' }))

		// Usage should be initialized from the merged message_start
		expect(parser.getMessages()[0].usage).toEqual({ inputTokens: 5000, outputTokens: 0 })
	})

	it('sums cache_read + cache_creation + input_tokens for total context', () => {
		const parser = new ClaudeCodeStreamParser()

		parser.feed(
			line({
				type: 'message_start',
				message: {
					id: 'msg_cached',
					role: 'assistant',
					model: 'claude-opus-4-6',
					usage: {
						input_tokens: 7,
						cache_creation_input_tokens: 0,
						cache_read_input_tokens: 15000,
						output_tokens: 0,
					},
				},
			}),
		)

		const msg = parser.getMessages()[0]
		// Total context = 7 + 0 + 15000 = 15007
		expect(msg.usage).toEqual({ inputTokens: 15007, outputTokens: 0 })
	})

	it('result event updates outputTokens but NOT inputTokens (result aggregates across API calls)', () => {
		const parser = new ClaudeCodeStreamParser()

		// message_start has per-call context (the real context window usage)
		parser.feed(
			line({
				type: 'message_start',
				message: {
					id: 'msg_prelim',
					role: 'assistant',
					usage: { input_tokens: 7, cache_read_input_tokens: 32000, output_tokens: 0 },
				},
			}),
		)
		parser.feed(line({ type: 'content_block_start', index: 0, content_block: { type: 'text' } }))
		parser.feed(
			line({
				type: 'content_block_delta',
				index: 0,
				delta: { type: 'text_delta', text: 'Hello' },
			}),
		)
		parser.feed(
			line({
				type: 'message_delta',
				delta: { stop_reason: 'end_turn' },
				usage: { output_tokens: 100 },
			}),
		)
		parser.feed(line({ type: 'content_block_stop', index: 0 }))
		parser.feed(line({ type: 'message_stop' }))

		// Result event has aggregated usage across all API calls in the turn — inflated inputTokens
		parser.feed(
			`${JSON.stringify({ type: 'result', session_id: 'sess_1', usage: { input_tokens: 500, cache_read_input_tokens: 147000, output_tokens: 850 } })}\n`,
		)

		const msg = parser.getMessages()[0]
		// inputTokens stays from message_start (32007), NOT overridden by result's aggregated 147500
		expect(msg.usage?.inputTokens).toBe(32007)
		// outputTokens updated from result (turn total)
		expect(msg.usage?.outputTokens).toBe(850)
	})
})

describe('isResponding', () => {
	it('becomes true on message_start and false on result', () => {
		const parser = new ClaudeCodeStreamParser()
		expect(parser.isResponding()).toBe(false)

		parser.feed(
			line({
				type: 'message_start',
				message: { id: 'msg_001', role: 'assistant' },
			}),
		)
		expect(parser.isResponding()).toBe(true)

		parser.feed(line({ type: 'message_stop' }))
		// Still responding after message_stop — turn is not done until result
		expect(parser.isResponding()).toBe(true)

		parser.feed(`${JSON.stringify({ type: 'result', session_id: 'sess_1' })}\n`)
		expect(parser.isResponding()).toBe(false)
	})

	it('stays true across tool-use round trips (merged messages)', () => {
		const parser = new ClaudeCodeStreamParser()

		// Turn 1: tool use
		parser.feed(line({ type: 'message_start', message: { id: 'msg_001', role: 'assistant' } }))
		parser.feed(
			line({
				type: 'content_block_start',
				index: 0,
				content_block: { type: 'tool_use', id: 'toolu_1', name: 'Bash' },
			}),
		)
		parser.feed(line({ type: 'content_block_stop', index: 0 }))
		parser.feed(line({ type: 'message_delta', delta: { stop_reason: 'tool_use' } }))
		parser.feed(line({ type: 'message_stop' }))

		// Between message_stop and next message_start — still responding
		expect(parser.isResponding()).toBe(true)

		// Tool result
		parser.feed(
			`${JSON.stringify({ type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'ok' }] } })}\n`,
		)
		// Still responding — waiting for next assistant message
		expect(parser.isResponding()).toBe(true)

		// Turn 2: text response (merged)
		parser.feed(line({ type: 'message_start', message: { id: 'msg_002', role: 'assistant' } }))
		expect(parser.isResponding()).toBe(true)

		parser.feed(line({ type: 'message_stop' }))
		parser.feed(`${JSON.stringify({ type: 'result', session_id: 'sess_1' })}\n`)
		expect(parser.isResponding()).toBe(false)
	})
})
