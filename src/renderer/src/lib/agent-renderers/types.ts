/** Shared types for agent-specific stream renderers.
 *
 * Each agent (Claude Code, Gemini CLI, etc.) has its own parser that converts
 * raw output into these common types. The UI layer renders them identically
 * regardless of which agent produced them. */

// ── Content Blocks ──────────────────────────────────────────────────────────

/** Token usage for a content block — computed as the output_tokens delta between block start and stop. */
export interface BlockUsage {
	outputTokens: number
}

export interface TextBlock {
	type: 'text'
	text: string
	/** Tokens spent generating this block (output tokens only). */
	usage?: BlockUsage
}

export interface ToolUseBlock {
	type: 'tool_use'
	id: string
	name: string
	/** Accumulated partial JSON string. Parse when block is complete. */
	inputJson: string
	/** Tokens spent generating this tool call (output tokens only). */
	usage?: BlockUsage
}

/** Tool execution result, paired with the corresponding ToolUseBlock for rendering.
 *  No usage field — tool results are not model-generated. */
export interface ToolResultBlock {
	type: 'tool_result'
	toolUseId: string
	content: string
	isError: boolean
}

export interface ThinkingBlock {
	type: 'thinking'
	text: string
	/** Tokens spent on this thinking block (output tokens only). */
	usage?: BlockUsage
}

export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock | ThinkingBlock

// ── Messages ────────────────────────────────────────────────────────────────

/** Cumulative token usage for a full message (input + output). */
export interface MessageUsage {
	inputTokens: number
	outputTokens: number
}

export interface StreamMessage {
	id: string
	role: 'assistant' | 'user' | 'system'
	model?: string
	blocks: ContentBlock[]
	stopReason: string | null
	usage: MessageUsage | null
	/** true while message is still receiving events */
	streaming: boolean
}

// ── Parser Interface ────────────────────────────────────────────────────────

/** All agent-specific stream parsers must implement this interface. */
export interface StreamParser {
	/** Feed a raw data chunk (may contain partial lines). */
	feed(chunk: string): void
	/** Get the current parsed conversation. */
	getMessages(): readonly StreamMessage[]
	/** Get the session ID from the last completed turn (for --resume). */
	getSessionId(): string | null
	/** Inject a user message into the conversation (shown in UI alongside parsed messages). */
	addUserMessage(text: string): void
	/** Reset all state. */
	reset(): void
}
