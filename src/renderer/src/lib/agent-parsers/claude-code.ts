import { type BlockClassifier, ERROR_PATTERN, UNKNOWN_BLOCK, stripBlockMarkers } from './types'

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
	const trimmed = stripBlockMarkers(headerText)

	if (!trimmed) return UNKNOWN_BLOCK

	// MCP tool calls: "server - tool_name (MCP)(...)" format
	const mcpMatch = trimmed.match(/^(.+?)\s*\(MCP\)/i)
	if (mcpMatch) {
		const mcpTool = mcpMatch[1].trim()
		return { type: 'tool-call', metadata: { tool: mcpTool } }
	}

	// Check for known tool name as first word (before heuristic patterns to avoid false positives)
	// Handle both "Write src/index.ts" and "Write(index.js)" formats — split on whitespace or (
	const toolName = trimmed.split(/[\s(]/)[0].toLowerCase()
	// MCP tools use __ separators (e.g., mcp__server__tool_name) — match the prefix
	const toolPrefix = toolName.split('__')[0]
	if (TOOL_NAMES.has(toolPrefix)) {
		return { type: 'tool-call', metadata: { tool: toolName } }
	}

	// Permission prompts
	if (/allow|deny|approve|permission|y\/n/i.test(trimmed)) {
		return { type: 'permission', metadata: {} }
	}

	// Error blocks
	if (ERROR_PATTERN.test(trimmed)) {
		return { type: 'error', metadata: {} }
	}

	// Tool result summaries (e.g. "Searched for 1 pattern, read 1 file")
	if (/^searched\b/i.test(trimmed)) {
		return { type: 'tool-call', metadata: { tool: 'search' } }
	}

	// Thinking / reasoning
	if (/^(thinking|reasoning|chain\.of\.thought)/i.test(trimmed)) {
		return { type: 'thinking', metadata: {} }
	}

	// Status messages (e.g. "Tool Loaded.")
	if (/^tool\s+loaded/i.test(trimmed)) {
		return { type: 'status', metadata: {} }
	}

	return UNKNOWN_BLOCK
}
