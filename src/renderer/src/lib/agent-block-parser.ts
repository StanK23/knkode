import type { AgentType } from '../../../shared/types'
import { classifyClaudeCode } from './agent-parsers/claude-code'
import { classifyGeminiCli } from './agent-parsers/gemini-cli'
import type { AgentBlock, BlockClassifier } from './agent-parsers/types'
import { stripAnsi } from './ansi'

/** Box-drawing characters that signal block boundaries. */
const TOP_LEFT = '╭'
const BOTTOM_LEFT = '╰'

/** Box-drawing and bracket characters stripped from content lines. */
const BOX_CHARS_RE = /[╭╮╰╯│─┬┴┤├┼⎿]/g

/**
 * Bullet/marker characters that start inline blocks.
 * Claude Code uses ⏺ for tool calls, ❯ for prompts/status, ✻ for thinking.
 * Older versions used ● ◆ ▶. All are supported.
 * Requires at least one character after the marker to avoid false positives.
 */
const BULLET_PATTERN = /^[●◆▶⏺❯✻].+/

/** Horizontal rule — visual separator, skip but don't stop parsing. */
const HRULE_PATTERN = /^[─━╌╍┄┅]{4,}$/

/** Lines to skip: status bar chrome, progress dots, lone prompt markers. */
const SKIP_LINE_PATTERN = /^([▪▸▹■⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏●·.\s]{1,10}|[❯›>]\s*)$/

/** Map agent types to their block classifiers. */
const CLASSIFIERS: Partial<Record<AgentType, BlockClassifier>> = {
	'claude-code': classifyClaudeCode,
	'gemini-cli': classifyGeminiCli,
}

/** Mutable version of AgentBlock for internal parser use. */
type MutableBlock = {
	id: string
	type: AgentBlock['type']
	agent: AgentBlock['agent']
	startLine: number
	endLine: number | null
	metadata: Record<string, string>
	contentLines: string[]
}

/**
 * Stateful parser that converts terminal output into AgentBlock objects.
 *
 * Supports two modes:
 * - **Stream mode:** `feedChunk(rawData)` — processes raw PTY data as it arrives.
 *   Handles partial lines, ANSI stripping, and content accumulation.
 * - **Buffer mode:** `update(getLine, lineCount)` — scans xterm buffer lines.
 *   Used by the block overlay in raw terminal mode.
 *
 * Create one instance per pane. The parser is additive — it only processes
 * new data and never re-scans. Call `reset()` when the terminal is cleared.
 */
export class AgentBlockParser {
	private agent: AgentType
	private classifier: BlockClassifier | null
	private blocks: MutableBlock[] = []
	private openBlock: MutableBlock | null = null
	private lastParsedLine = -1
	/** Per-instance block ID counter. IDs are unique within this parser and reset with reset(). */
	private nextBlockId = 0
	/** Partial line from previous chunk (stream mode only). */
	private lineBuffer = ''

	constructor(agent: AgentType) {
		this.agent = agent
		this.classifier = CLASSIFIERS[agent] ?? null
	}

	/**
	 * Feed a raw PTY data chunk (stream mode).
	 * Strips ANSI, splits into lines, processes complete lines.
	 * Partial lines are buffered until the next chunk completes them.
	 */
	feedChunk(rawChunk: string): void {
		if (!this.classifier) return

		const data = this.lineBuffer + stripAnsi(rawChunk)
		const parts = data.split('\n')

		// Last part may be incomplete — save for next chunk
		this.lineBuffer = parts.pop() ?? ''

		for (const part of parts) {
			const line = part.replace(/\r$/, '')
			this.lastParsedLine++
			const blockBefore = this.openBlock
			this.processLine(line, this.lastParsedLine)

			// Accumulate content for the open block (skip the header line that just opened it)
			if (this.openBlock && this.openBlock === blockBefore) {
				const clean = line.replace(BOX_CHARS_RE, '').trim()
				if (clean || this.openBlock.contentLines.length > 0) {
					this.openBlock.contentLines.push(clean)
				}
			}
		}
	}

	/** Parse new lines from the terminal buffer (buffer mode). Only processes lines after lastParsedLine. */
	update(getLine: (index: number) => string, lineCount: number): void {
		if (!this.classifier) return

		const start = this.lastParsedLine + 1
		for (let i = start; i < lineCount; i++) {
			const raw = getLine(i)
			const stripped = stripAnsi(raw)
			const blockBefore = this.openBlock
			this.processLine(stripped, i)

			// Accumulate content (same logic as stream mode)
			if (this.openBlock && this.openBlock === blockBefore) {
				const clean = stripped.replace(BOX_CHARS_RE, '').trim()
				if (clean || this.openBlock.contentLines.length > 0) {
					this.openBlock.contentLines.push(clean)
				}
			}
		}
		this.lastParsedLine = lineCount - 1
	}

	/** Get a snapshot of all parsed blocks (including any open/streaming block). */
	getBlocks(): readonly AgentBlock[] {
		return this.blocks.map((b) => ({
			id: b.id,
			type: b.type,
			agent: b.agent,
			startLine: b.startLine,
			endLine: b.endLine,
			content: b.contentLines.join('\n'),
			metadata: { ...b.metadata },
		}))
	}

	/** Reset parser state (e.g. when terminal is cleared). */
	reset(): void {
		this.blocks = []
		this.openBlock = null
		this.lastParsedLine = -1
		this.nextBlockId = 0
		this.lineBuffer = ''
		this.seenFirstMarker = false
	}

	/** Whether we've seen the first real block marker (skip preamble/banner). */
	private seenFirstMarker = false

	private processLine(stripped: string, lineIndex: number): void {
		const classifier = this.classifier
		if (!classifier) return

		// Trim leading whitespace — TUI apps indent content with spaces in the terminal grid
		const trimmed = stripped.trim()

		// Skip empty lines when no block is open
		if (!trimmed) return

		// Horizontal rules — visual separators, close current block but keep parsing
		if (HRULE_PATTERN.test(trimmed)) {
			this.closeOpenBlock(lineIndex - 1)
			return
		}

		// Skip TUI chrome: progress dots, lone prompt markers, spinners
		if (SKIP_LINE_PATTERN.test(trimmed)) return

		// Check if this is a block-starting marker
		const isBoxStart = trimmed.includes(TOP_LEFT)
		const isBoxEnd = trimmed.includes(BOTTOM_LEFT)
		const isBullet = BULLET_PATTERN.test(trimmed)

		// Skip preamble (shell prompt, banner) until first real marker
		if (!this.seenFirstMarker) {
			if (isBoxStart || isBullet) {
				this.seenFirstMarker = true
			} else {
				return
			}
		}

		// Block start: line contains ╭ (box-drawing top-left corner)
		if (isBoxStart) {
			this.openNewBlock(classifier, trimmed, lineIndex)
			return
		}

		// Block end: line contains ╰ (box-drawing bottom-left corner)
		// Note: ⎿ is Claude Code's response indicator, NOT a block closer
		if (isBoxEnd) {
			this.closeOpenBlock(lineIndex)
			return
		}

		// Bullet block start: line starts with ●, ◆, ▶, ⏺, ❯, or ✻
		if (isBullet) {
			this.openNewBlock(classifier, trimmed, lineIndex)
			return
		}

		// If no block is open, start a 'text' block for agent/user text
		if (!this.openBlock) {
			const block: MutableBlock = {
				id: `block-${++this.nextBlockId}`,
				type: 'text',
				agent: this.agent,
				startLine: lineIndex,
				endLine: null,
				metadata: {},
				contentLines: [trimmed],
			}
			this.openBlock = block
			this.blocks.push(block)
			return
		}

		// Mid-block content: check for diff markers or error patterns to refine type
		if (this.openBlock.type === 'unknown') {
			if (/^([+-]\s|@@\s)/.test(trimmed)) {
				this.openBlock.type = 'diff'
			} else if (/\b(error|exception|failed)\b/i.test(trimmed)) {
				this.openBlock.type = 'error'
			}
		}
	}

	private openNewBlock(classifier: BlockClassifier, stripped: string, lineIndex: number): void {
		this.closeOpenBlock(Math.max(lineIndex - 1, this.openBlock?.startLine ?? 0))
		const classification = classifier(stripped)
		const block: MutableBlock = {
			id: `block-${++this.nextBlockId}`,
			type: classification.type,
			agent: this.agent,
			startLine: lineIndex,
			endLine: null,
			metadata: { ...classification.metadata },
			contentLines: [],
		}
		this.openBlock = block
		this.blocks.push(block)
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
