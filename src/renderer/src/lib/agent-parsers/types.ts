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

/** Strip box-drawing characters and bullet prefixes from a header line and trim whitespace. */
export function stripBlockMarkers(text: string): string {
	return text.replace(/[─╭╮│╰╯┬┴┤├┼●◆▶]/g, '').trim()
}

/** Classification returned when no pattern matches. Frozen to prevent accidental mutation. */
export const UNKNOWN_BLOCK: Readonly<BlockClassification> = Object.freeze({
	type: 'unknown' as const,
	metadata: Object.freeze({}) as Readonly<Record<string, string>>,
})

/** Shared color classes for rendering agent block types across components. */
export const BLOCK_TYPE_COLORS: Record<AgentBlockType, string> = {
	'tool-call': 'text-accent',
	'tool-result': 'text-accent',
	thinking: 'text-content-muted',
	diff: 'text-green-400',
	text: 'text-content',
	status: 'text-content-muted',
	permission: 'text-yellow-400',
	error: 'text-danger',
	unknown: 'text-content-muted',
}

/** Error detection pattern — matches lines starting with error keywords. */
export const ERROR_PATTERN = /^(error|failed|exception)\b/i
