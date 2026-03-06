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

		it('ignores JSON that is not a stream_event', () => {
			const parser = new ClaudeCodeStreamParser()
			parser.feed(`${JSON.stringify({ type: 'other', data: 'test' })}\n`)
			expect(parser.getMessages()).toHaveLength(0)
		})
	})

	describe('multi-message sequences', () => {
		it('handles multiple messages (tool use → next response)', () => {
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

			// Second message: assistant response after tool
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
			expect(msgs).toHaveLength(2)

			expect(msgs[0].id).toBe('msg_001')
			expect(msgs[0].stopReason).toBe('tool_use')
			expect(msgs[0].streaming).toBe(false)
			expect(msgs[0].blocks[0]).toMatchObject({ type: 'tool_use', name: 'bash' })

			expect(msgs[1].id).toBe('msg_002')
			expect(msgs[1].blocks[0]).toEqual({ type: 'text', text: 'Here are the files.' })
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
})
