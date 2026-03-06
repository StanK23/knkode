import { type BlockClassifier, ERROR_PATTERN, UNKNOWN_BLOCK, stripBoxDrawing } from './types'

/** Known tool names that Claude Code shows in block headers. Keep in sync with Claude Code's tool repertoire. */
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

/**
 * Classify a Claude Code block header line.
 * Falls back to 'unknown' if no pattern matches.
 */
export const classifyClaudeCode: BlockClassifier = (headerText) => {
	const trimmed = stripBoxDrawing(headerText)

	if (!trimmed) return UNKNOWN_BLOCK

	// Check for known tool name as first word (before heuristic patterns to avoid false positives)
	const firstWord = trimmed.split(/\s/)[0]?.toLowerCase()
	// MCP tools use __ separators (e.g., mcp__server__tool_name) — match the prefix
	const toolName = firstWord?.split('__')[0]
	if (firstWord && toolName && TOOL_NAMES.has(toolName)) {
		return { type: 'tool-call', metadata: { tool: firstWord } }
	}

	// Permission prompts
	if (/allow|deny|approve|permission|y\/n/i.test(trimmed)) {
		return { type: 'permission', metadata: {} }
	}

	// Error blocks
	if (ERROR_PATTERN.test(trimmed)) {
		return { type: 'error', metadata: {} }
	}

	// Thinking / reasoning
	if (/^(thinking|reasoning|chain\.of\.thought)/i.test(trimmed)) {
		return { type: 'thinking', metadata: {} }
	}

	return UNKNOWN_BLOCK
}
