import type { AgentType } from '../../../shared/types'
import { classifyClaudeCode } from './agent-parsers/claude-code'
import { classifyGeminiCli } from './agent-parsers/gemini-cli'
import type { AgentBlock, BlockClassifier } from './agent-parsers/types'
import { stripAnsi } from './ansi'

/** Box-drawing characters that signal block boundaries. */
const TOP_LEFT = '╭'
const BOTTOM_LEFT = '╰'

/** Map agent types to their block classifiers. */
const CLASSIFIERS: Partial<Record<AgentType, BlockClassifier>> = {
	'claude-code': classifyClaudeCode,
	'gemini-cli': classifyGeminiCli,
}

let nextBlockId = 0

/**
 * Stateful parser that converts terminal buffer lines into AgentBlock objects.
 *
 * Create one instance per pane. Feed it lines from the xterm.js buffer
 * whenever the buffer changes. It detects block boundaries via box-drawing
 * characters and classifies blocks using agent-specific classifiers.
 *
 * The parser is additive — it only processes new lines and never re-scans
 * previously parsed lines. Call `reset()` when the terminal is cleared.
 */
export class AgentBlockParser {
	private agent: AgentType
	private classifier: BlockClassifier | null
	private blocks: AgentBlock[] = []
	private openBlock: AgentBlock | null = null
	private lastParsedLine = -1

	constructor(agent: AgentType) {
		this.agent = agent
		this.classifier = CLASSIFIERS[agent] ?? null
	}

	/** Parse new lines from the terminal buffer. Only processes lines after lastParsedLine. */
	update(getLine: (index: number) => string, lineCount: number): void {
		if (!this.classifier) return

		const start = this.lastParsedLine + 1
		for (let i = start; i < lineCount; i++) {
			const raw = getLine(i)
			const stripped = stripAnsi(raw)
			this.processLine(stripped, i)
		}
		this.lastParsedLine = lineCount - 1
	}

	/** Get all parsed blocks (including any open/streaming block). */
	getBlocks(): readonly AgentBlock[] {
		return this.blocks
	}

	/** Reset parser state (e.g. when terminal is cleared). */
	reset(): void {
		this.blocks = []
		this.openBlock = null
		this.lastParsedLine = -1
	}

	private processLine(stripped: string, lineIndex: number): void {
		// Check for block start: line contains ╭
		if (stripped.includes(TOP_LEFT)) {
			// Close any open block first
			this.closeOpenBlock(lineIndex - 1)

			const classifier = this.classifier
			if (!classifier) return
			const classification = classifier(stripped)
			const block: AgentBlock = {
				id: `block-${++nextBlockId}`,
				type: classification.type,
				agent: this.agent,
				startLine: lineIndex,
				endLine: null,
				collapsed: false,
				metadata: classification.metadata,
			}
			this.openBlock = block
			this.blocks.push(block)
			return
		}

		// Check for block end: line contains ╰
		if (stripped.includes(BOTTOM_LEFT)) {
			this.closeOpenBlock(lineIndex)
			return
		}

		// Mid-block content: check for diff markers or error patterns to refine type
		if (this.openBlock && this.openBlock.type === 'unknown') {
			if (/^[+-]\s/.test(stripped) || /^@@\s/.test(stripped)) {
				this.openBlock.type = 'diff'
			} else if (/error|exception|failed/i.test(stripped)) {
				this.openBlock.type = 'error'
			}
		}
	}

	private closeOpenBlock(endLine: number): void {
		if (!this.openBlock) return
		this.openBlock.endLine = endLine
		this.openBlock = null
	}
}

/** Get the block classifier for an agent type, or null if unsupported. */
export function getClassifier(agent: AgentType): BlockClassifier | null {
	return CLASSIFIERS[agent] ?? null
}

/** Check whether an agent type supports block parsing. */
export function supportsBlockParsing(agent: AgentType): boolean {
	return agent in CLASSIFIERS
}
