/** Shared types for agent-specific stream renderers.
 *
 * Each agent (Claude Code, Gemini CLI, etc.) has its own parser that converts
 * raw output into these common types. The UI layer renders them identically
 * regardless of which agent produced them. */

// ── Content Blocks ──────────────────────────────────────────────────────────

export interface TextBlock {
	type: 'text'
	text: string
}

export interface ToolUseBlock {
	type: 'tool_use'
	id: string
	name: string
	/** Accumulated partial JSON string. Parse when block is complete. */
	inputJson: string
}

/** Forward declaration — used by the UI layer (PR #7b) to render tool results. */
export interface ToolResultBlock {
	type: 'tool_result'
	toolUseId: string
	content: string
	isError: boolean
}

export interface ThinkingBlock {
	type: 'thinking'
	text: string
}

export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock | ThinkingBlock

// ── Messages ────────────────────────────────────────────────────────────────

export interface StreamMessage {
	id: string
	role: 'assistant' | 'user' | 'system'
	model?: string
	blocks: ContentBlock[]
	stopReason: string | null
	usage: { inputTokens: number; outputTokens: number } | null
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
	/** Reset all state. */
	reset(): void
}
