import type { ContentBlock, StreamMessage, StreamParser } from './types'

/** Maximum line buffer size (1 MB). Protects against PTY data without newlines. */
const MAX_BUFFER_SIZE = 1_048_576

/** Strip ANSI escape sequences from a string. PTYs may wrap JSON lines in terminal codes. */
// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape matching requires control chars
const ANSI_RE = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\][^\x07]*\x07|\x1b\[[\?]?[0-9;]*[hlm]/g
export function stripAnsi(str: string): string {
	return str.replace(ANSI_RE, '')
}

/** Maximum accumulated messages. Prevents unbounded memory growth in long sessions. */
const MAX_MESSAGES = 500

const VALID_ROLES = new Set<StreamMessage['role']>(['assistant', 'user', 'system'])

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

	feed(chunk: string): void {
		this.lineBuffer += chunk

		// Guard against unbounded buffer growth (e.g. PTY data without newlines)
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
		// Preserve sessionId across resets — needed for multi-turn --resume
	}

	private parseLine(line: string): void {
		// Strip ANSI escape sequences — PTYs may wrap JSON in terminal codes
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
			case 'system':
			case 'assistant':
			case 'rate_limit_event':
				// Intentionally ignored — system init, message snapshots, and rate limits
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
				// No action needed — block is already accumulated
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
		// Extract usage from result if message has none
		if (msg && !msg.usage && typeof obj.usage === 'object' && obj.usage !== null) {
			const usage = obj.usage as Record<string, unknown>
			msg.usage = {
				inputTokens: Number(usage.input_tokens ?? 0),
				outputTokens: Number(usage.output_tokens ?? 0),
			}
		}
	}

	private handleMessageStart(event: Record<string, unknown>): void {
		const message = event.message as Record<string, unknown> | undefined
		if (!message) return

		const usage = message.usage as Record<string, unknown> | undefined

		const rawRole = String(message.role ?? 'assistant')
		const role: StreamMessage['role'] = VALID_ROLES.has(rawRole as StreamMessage['role'])
			? (rawRole as StreamMessage['role'])
			: 'assistant'

		this.blockIndexMap.clear()

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
						inputTokens: Number(usage.input_tokens ?? 0),
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
				msg.usage.outputTokens = Number(usage.output_tokens)
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
