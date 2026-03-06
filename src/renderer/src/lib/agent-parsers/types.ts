import type { AgentType } from '../../../../shared/types'

export type AgentBlockType =
	| 'thinking'
	| 'tool-call'
	| 'tool-result'
	| 'diff'
	| 'text'
	| 'status'
	| 'permission'
	| 'error'
	| 'unknown'

export interface AgentBlock {
	readonly id: string
	type: AgentBlockType
	agent: AgentType
	startLine: number
	endLine: number | null
	collapsed: boolean
	metadata: Record<string, string>
}

export interface BlockClassification {
	type: AgentBlockType
	metadata: Record<string, string>
}

/** Classifies a block given the stripped (no ANSI) text of its header line. */
export type BlockClassifier = (headerText: string) => BlockClassification
