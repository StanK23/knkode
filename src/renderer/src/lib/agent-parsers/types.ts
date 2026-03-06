import type { AgentType } from '../../../../shared/types'

export type AgentBlockType =
	| 'thinking'
	| 'tool-call'
	| 'tool-result' // reserved — future: separate tool output from tool invocation
	| 'diff'
	| 'text' // reserved — future: plain text / markdown blocks
	| 'status'
	| 'permission'
	| 'error'
	| 'unknown'

export interface AgentBlock {
	readonly id: string
	readonly type: AgentBlockType
	readonly agent: AgentType
	readonly startLine: number
	/** `null` while the block is still streaming (no closing border seen yet). */
	readonly endLine: number | null
	readonly metadata: Readonly<Record<string, string>>
}

export interface BlockClassification {
	type: AgentBlockType
	metadata: Record<string, string>
}

/**
 * Classifies a block given the stripped (no ANSI) text of its header line.
 * @param headerText - ANSI-stripped text from the block's opening line.
 */
export type BlockClassifier = (headerText: string) => BlockClassification

/** Strip box-drawing characters from a header line and trim whitespace. */
export function stripBoxDrawing(text: string): string {
	return text.replace(/[─╭╮│╰╯┬┴┤├┼]/g, '').trim()
}

/** Classification returned when no pattern matches. Frozen to prevent accidental mutation. */
export const UNKNOWN_BLOCK: Readonly<BlockClassification> = Object.freeze({
	type: 'unknown' as const,
	metadata: Object.freeze({}) as Record<string, string>,
})

/** Error detection pattern — matches lines starting with error keywords. */
export const ERROR_PATTERN = /^(error|failed|exception)\b/i
