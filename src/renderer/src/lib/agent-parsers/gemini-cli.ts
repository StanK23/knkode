import { type BlockClassifier, ERROR_PATTERN, UNKNOWN_BLOCK, stripBlockMarkers } from './types'

/** Known tool names that Gemini CLI shows in block headers. */
const TOOL_NAMES = new Set([
	'readfile',
	'writefile',
	'editfile',
	'shell',
	'searchfiles',
	'listfiles',
	'readmultiplefiles',
	'webfetch',
])

/**
 * Classify a Gemini CLI block header line.
 * Gemini CLI uses similar box-drawing characters but with different tool names.
 */
export const classifyGeminiCli: BlockClassifier = (headerText) => {
	const trimmed = stripBlockMarkers(headerText)

	if (!trimmed) return UNKNOWN_BLOCK

	// Error blocks
	if (ERROR_PATTERN.test(trimmed)) {
		return { type: 'error', metadata: {} }
	}

	// Thinking
	if (/^(thinking|reasoning)/i.test(trimmed)) {
		return { type: 'thinking', metadata: {} }
	}

	// Status / spinner
	if (/^(running|executing|waiting|loading|✓|✗|⠋|⠙|⠹)/i.test(trimmed)) {
		return { type: 'status', metadata: {} }
	}

	// Tool names
	const firstWord = trimmed.split(/\s/)[0]?.toLowerCase()
	if (firstWord && TOOL_NAMES.has(firstWord)) {
		return { type: 'tool-call', metadata: { tool: firstWord } }
	}

	return UNKNOWN_BLOCK
}
