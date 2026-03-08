import { stripAnsi } from '../ansi'
import type { ContentBlock, StreamMessage, StreamParser } from './types'

export { stripAnsi }

/** Maximum line buffer size (1 MB). Protects against subprocess output without newlines. */
const MAX_BUFFER_SIZE = 1_048_576

/** Maximum accumulated messages. Prevents unbounded memory growth in long sessions. */
const MAX_MESSAGES = 500

const VALID_ROLES = new Set<StreamMessage['role']>(['assistant', 'user', 'system'])

/** Sum all input token fields from an API usage object.
 *  With prompt caching, `input_tokens` only counts non-cached tokens.
 *  Total context = input_tokens + cache_creation_input_tokens + cache_read_input_tokens. */
function totalInputTokens(usage: Record<string, unknown>): number {
	return (
		Number(usage.input_tokens ?? 0) +
		Number(usage.cache_creation_input_tokens ?? 0) +
		Number(usage.cache_read_input_tokens ?? 0)
	)
}

/**
 * Parses Claude Code `--print --verbose --output-format stream-json` NDJSON output.
 *
 * With `--verbose --include-partial-messages`, lines have a top-level `type` field:
 * - `"system"` — init event (ignored)
 * - `"stream_event"` — wraps streaming events (message_start, content_block_*, message_delta, message_stop)
 * - `"assistant"` — snapshot of the partial/complete message (ignored, we build from stream_events)
 * - `"rate_limit_event"` — rate limit info (ignored)
 * - `"result"` — final result with session_id for --resume
 *
 * Handles partial lines (buffering until newline), accumulates deltas
 * into complete content blocks, and builds a conversation of StreamMessages.
 */
export class ClaudeCodeStreamParser implements StreamParser {
	private messages: StreamMessage[] = []
	private lineBuffer = ''
	/** Map from content block index → blocks array index within the current message. */
	private blockIndexMap = new Map<number, number>()
	private consecutiveParseFailures = 0
	/** Session ID from the last result event — used for --resume on next turn. */
	private sessionId: string | null = null
	/** Whether the agent is mid-turn (between message_start and result event). */
	private _responding = false
	/** Last seen cumulative output_tokens — used to compute per-block token deltas. */
	private lastOutputTokens = 0
	/** Per content block index: output_tokens at block start. */
	private blockStartTokens = new Map<number, number>()

	feed(chunk: string): void {
		this.lineBuffer += chunk

		// Guard against unbounded buffer growth (e.g. subprocess output without newlines)
		if (this.lineBuffer.length > MAX_BUFFER_SIZE) {
			console.warn('[stream-parser] lineBuffer exceeded max size, discarding')
			this.lineBuffer = ''
			return
		}

		const lines = this.lineBuffer.split('\n')
		// Last element is either empty (line ended with \n) or a partial line
		this.lineBuffer = lines.pop() ?? ''

		for (const line of lines) {
			const trimmed = line.trim()
			if (!trimmed) continue
			this.parseLine(trimmed)
		}
	}

	getMessages(): readonly StreamMessage[] {
		return this.messages
	}

	getSessionId(): string | null {
		return this.sessionId
	}

	/** Whether the agent is mid-turn (between first message_start and result event). */
	isResponding(): boolean {
		return this._responding
	}

	addUserMessage(text: string): void {
		this.messages.push({
			id: `user-${Date.now()}`,
			role: 'user',
			blocks: [{ type: 'text', text }],
			stopReason: null,
			usage: null,
			streaming: false,
		})
	}

	reset(): void {
		this.messages = []
		this.lineBuffer = ''
		this.blockIndexMap.clear()
		this.consecutiveParseFailures = 0
		this.lastOutputTokens = 0
		this.blockStartTokens.clear()
		// Preserve sessionId across resets — needed for multi-turn --resume
	}

	private parseLine(line: string): void {
		// Strip ANSI escape sequences — defensive, subprocess stdout may contain escape codes
		const clean = line.includes('\x1b') ? stripAnsi(line).trim() : line

		let parsed: unknown
		try {
			parsed = JSON.parse(clean)
		} catch {
			// Not valid JSON — could be shell prompt, startup text, ANSI sequences, etc.
			this.consecutiveParseFailures++
			if (this.consecutiveParseFailures >= 5) {
				console.warn(
					`[stream-parser] ${this.consecutiveParseFailures} consecutive JSON parse failures`,
				)
			}
			return
		}

		this.consecutiveParseFailures = 0

		if (typeof parsed !== 'object' || parsed === null) return
		const obj = parsed as Record<string, unknown>
		const topType = obj.type

		switch (topType) {
			case 'stream_event': {
				const event = obj.event as Record<string, unknown> | undefined
				if (!event) return
				this.handleStreamEvent(event)
				break
			}
			case 'result':
				this.handleResult(obj)
				break
			case 'user':
				this.handleUserEvent(obj)
				break
			case 'system':
			case 'assistant':
			case 'rate_limit_event':
				// Intentionally ignored — system init, snapshots (redundant with stream_event deltas), rate limits
				break
			case 'message_start':
			case 'content_block_start':
			case 'content_block_delta':
			case 'content_block_stop':
			case 'message_delta':
			case 'message_stop':
				// Bare API events (no stream_event wrapper) — handle directly
				this.handleStreamEvent(obj)
				break
			default:
				// Unknown top-level types are silently dropped
				break
		}
	}

	private handleStreamEvent(event: Record<string, unknown>): void {
		const eventType = event.type

		switch (eventType) {
			case 'message_start':
				this.handleMessageStart(event)
				break
			case 'content_block_start':
				this.handleContentBlockStart(event)
				break
			case 'content_block_delta':
				this.handleContentBlockDelta(event)
				break
			case 'content_block_stop':
				this.handleContentBlockStop(event)
				break
			case 'message_delta':
				this.handleMessageDelta(event)
				break
			case 'message_stop':
				this.handleMessageStop()
				break
		}
	}

	private handleResult(obj: Record<string, unknown>): void {
		this._responding = false
		// Extract session_id for --resume support
		if (typeof obj.session_id === 'string') {
			this.sessionId = obj.session_id
		}
		// Mark current message as done if still streaming
		const msg = this.currentMessage()
		if (msg?.streaming) {
			msg.streaming = false
			if (!msg.stopReason && typeof obj.stop_reason === 'string') {
				msg.stopReason = obj.stop_reason
			}
		}
		// Result event usage is aggregated across ALL API calls in the turn (each tool-use
		// round trip is a separate API call). inputTokens would be inflated (e.g. 147k vs actual
		// 32k context). Use message_start values for inputTokens (per-call, reflects real context).
		// Only update outputTokens from result — those are useful for the turn total.
		if (msg && typeof obj.usage === 'object' && obj.usage !== null) {
			const usage = obj.usage as Record<string, unknown>
			const output = Number(usage.output_tokens ?? 0)
			if (msg.usage) {
				if (output > 0) msg.usage.outputTokens = output
			} else {
				msg.usage = { inputTokens: 0, outputTokens: output }
			}
		}
	}

	private handleUserEvent(obj: Record<string, unknown>): void {
		const message = obj.message as Record<string, unknown> | undefined
		if (!message) return

		const content = message.content as Array<Record<string, unknown>> | undefined
		if (!Array.isArray(content) || content.length === 0) return

		// Build tool_result blocks from the content array
		const blocks: ContentBlock[] = []
		// Also look at the top-level tool_use_result for richer data
		const toolUseResult = obj.tool_use_result as Record<string, unknown> | string | undefined

		for (const item of content) {
			if (item.type === 'tool_result') {
				const toolUseId = String(item.tool_use_id ?? '')
				const isError = item.is_error === true

				// Extract displayable content from the tool_result
				let resultText = ''
				const itemContent = item.content
				if (typeof itemContent === 'string') {
					resultText = itemContent
				} else if (Array.isArray(itemContent)) {
					// tool_reference lists (from ToolSearch) — summarize
					const refs = itemContent
						.filter((c: Record<string, unknown>) => c.type === 'tool_reference')
						.map((c: Record<string, unknown>) => String(c.tool_name ?? ''))
					if (refs.length > 0) {
						resultText = refs.join(', ')
					}
				}

				// Enrich from top-level tool_use_result if available
				if (!resultText && toolUseResult) {
					if (typeof toolUseResult === 'string') {
						resultText = toolUseResult
					} else if (typeof toolUseResult === 'object') {
						// Bash results: {stdout, stderr}
						const stdout = toolUseResult.stdout as string | undefined
						const stderr = toolUseResult.stderr as string | undefined
						if (stdout || stderr) {
							resultText = [stdout, stderr].filter(Boolean).join('\n')
						} else {
							// MCP results: {content, structuredContent}
							const mContent = toolUseResult.content as string | undefined
							if (mContent) {
								resultText = mContent.length > 2000 ? `${mContent.slice(0, 2000)}…` : mContent
							}
						}
					}
				}

				blocks.push({
					type: 'tool_result',
					toolUseId,
					content: resultText,
					isError,
				})
			}
		}

		if (blocks.length === 0) return

		// Find the last assistant message and attach tool results to it
		// (tool results belong to the preceding assistant's tool_use blocks)
		const lastAssistant = this.findLastAssistantMessage()
		if (lastAssistant) {
			for (const block of blocks) {
				lastAssistant.blocks.push(block)
			}
		}
	}

	private findLastAssistantMessage(): StreamMessage | null {
		for (let i = this.messages.length - 1; i >= 0; i--) {
			if (this.messages[i].role === 'assistant') return this.messages[i]
		}
		return null
	}

	private handleMessageStart(event: Record<string, unknown>): void {
		const message = event.message as Record<string, unknown> | undefined
		if (!message) return

		const usage = message.usage as Record<string, unknown> | undefined

		const rawRole = String(message.role ?? 'assistant')
		const role: StreamMessage['role'] = VALID_ROLES.has(rawRole as StreamMessage['role'])
			? (rawRole as StreamMessage['role'])
			: 'assistant'

		if (role === 'assistant') this._responding = true

		this.blockIndexMap.clear()
		this.blockStartTokens.clear()
		// API resets output_tokens to 0 for each new message response
		this.lastOutputTokens = 0

		// Merge consecutive assistant messages into one — each tool-use round-trip
		// in Claude CLI creates a new message_start, but it's all one turn.
		// blockIndexMap cleared above so new content_block_start events append correctly.
		const last = this.currentMessage()
		if (role === 'assistant' && last?.role === 'assistant') {
			last.streaming = true
			last.stopReason = null
			// Update inputTokens to latest value — approximates current context consumption (prompt tokens)
			if (usage) {
				const input = totalInputTokens(usage)
				if (last.usage) {
					if (input > 0) last.usage.inputTokens = input
				} else {
					last.usage = { inputTokens: input, outputTokens: 0 }
				}
			}
			return
		}

		// Trim old messages to prevent unbounded growth in long sessions
		if (this.messages.length >= MAX_MESSAGES) {
			this.messages.splice(0, this.messages.length - MAX_MESSAGES + 1)
		}

		this.messages.push({
			id: String(message.id ?? `msg-${this.messages.length}`),
			role,
			model: message.model as string | undefined,
			blocks: [],
			stopReason: null,
			usage: usage
				? {
						inputTokens: totalInputTokens(usage),
						outputTokens: Number(usage.output_tokens ?? 0),
					}
				: null,
			streaming: true,
		})
	}

	private handleContentBlockStart(event: Record<string, unknown>): void {
		const msg = this.currentMessage()
		if (!msg) return

		const index = Number(event.index ?? 0)
		const contentBlock = event.content_block as Record<string, unknown> | undefined
		if (!contentBlock) return

		const blockType = String(contentBlock.type ?? 'text')
		let block: ContentBlock

		switch (blockType) {
			case 'tool_use':
				block = {
					type: 'tool_use',
					id: String(contentBlock.id ?? ''),
					name: String(contentBlock.name ?? ''),
					inputJson: '',
				}
				break
			case 'thinking':
				block = { type: 'thinking', text: '' }
				break
			default:
				block = { type: 'text', text: '' }
				break
		}

		this.blockIndexMap.set(index, msg.blocks.length)
		this.blockStartTokens.set(index, this.lastOutputTokens)
		msg.blocks.push(block)
	}

	private handleContentBlockDelta(event: Record<string, unknown>): void {
		const msg = this.currentMessage()
		if (!msg) return

		const index = Number(event.index ?? 0)
		const blockIdx = this.blockIndexMap.get(index)
		if (blockIdx === undefined) return

		const block = msg.blocks[blockIdx]
		if (!block) return

		const delta = event.delta as Record<string, unknown> | undefined
		if (!delta) return

		const deltaType = String(delta.type ?? '')

		switch (deltaType) {
			case 'text_delta':
				if (block.type === 'text') {
					block.text += String(delta.text ?? '')
				}
				break
			case 'input_json_delta':
				if (block.type === 'tool_use') {
					block.inputJson += String(delta.partial_json ?? '')
				}
				break
			case 'thinking_delta':
				if (block.type === 'thinking') {
					block.text += String(delta.thinking ?? '')
				}
				break
			case 'signature_delta':
				// Intentionally ignored — verification metadata
				break
		}
	}

	/** Compute tokens spent on this block from the output_tokens delta since block start. */
	private handleContentBlockStop(event: Record<string, unknown>): void {
		const msg = this.currentMessage()
		if (!msg) return

		const index = Number(event.index ?? 0)
		const blockIdx = this.blockIndexMap.get(index)
		if (blockIdx === undefined) return

		const block = msg.blocks[blockIdx]
		// tool_result has no usage field (not model-generated) — also narrows type for TS
		if (!block || block.type === 'tool_result') return

		const startTokens = this.blockStartTokens.get(index) ?? 0
		const delta = this.lastOutputTokens - startTokens
		if (delta > 0) {
			block.usage = { outputTokens: delta }
		}
		this.blockStartTokens.delete(index)
	}

	private handleMessageDelta(event: Record<string, unknown>): void {
		const msg = this.currentMessage()
		if (!msg) return

		const delta = event.delta as Record<string, unknown> | undefined
		if (delta?.stop_reason) {
			msg.stopReason = String(delta.stop_reason)
		}

		const usage = event.usage as Record<string, unknown> | undefined
		if (usage) {
			if (!msg.usage) {
				msg.usage = { inputTokens: 0, outputTokens: 0 }
			}
			if (usage.output_tokens !== undefined) {
				const tokens = Number(usage.output_tokens)
				msg.usage.outputTokens = tokens
				this.lastOutputTokens = tokens
			}
		}
	}

	private handleMessageStop(): void {
		const msg = this.currentMessage()
		if (!msg) return
		msg.streaming = false
	}

	private currentMessage(): StreamMessage | null {
		return this.messages.at(-1) ?? null
	}
}
