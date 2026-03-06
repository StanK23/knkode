import type { BlockClassification, BlockClassifier } from './types'

/** Known tool names that Claude Code shows in block headers. */
const TOOL_NAMES = new Set([
	'read',
	'write',
	'edit',
	'bash',
	'glob',
	'grep',
	'agent',
	'notebook_edit',
	'web_search',
	'web_fetch',
	'mcp',
	'task',
	'todoread',
	'todowrite',
])

const NO_META: BlockClassification = { type: 'unknown', metadata: {} }

/**
 * Classify a Claude Code block header line.
 * Falls back to 'unknown' if no pattern matches.
 */
export const classifyClaudeCode: BlockClassifier = (headerText) => {
	const trimmed = headerText.replace(/[─╭╮│╰╯┬┴┤├┼]/g, '').trim()

	if (!trimmed) return NO_META

	// Permission prompts
	if (/allow|deny|approve|permission|y\/n/i.test(trimmed)) {
		return { type: 'permission', metadata: {} }
	}

	// Error blocks
	if (/^error|failed|exception/i.test(trimmed)) {
		return { type: 'error', metadata: {} }
	}

	// Thinking / reasoning
	if (/^thinking|reasoning|chain.of.thought/i.test(trimmed)) {
		return { type: 'thinking', metadata: {} }
	}

	// Check for known tool name as first word
	const firstWord = trimmed.split(/\s/)[0]?.toLowerCase()
	if (firstWord && TOOL_NAMES.has(firstWord)) {
		return { type: 'tool-call', metadata: { tool: firstWord } }
	}

	return NO_META
}
