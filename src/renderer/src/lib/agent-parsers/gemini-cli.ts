import type { BlockClassification, BlockClassifier } from './types'

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

const NO_META: BlockClassification = { type: 'unknown', metadata: {} }

/**
 * Classify a Gemini CLI block header line.
 * Gemini uses similar Ink-based box-drawing but with different tool names.
 */
export const classifyGeminiCli: BlockClassifier = (headerText) => {
	const trimmed = headerText.replace(/[─╭╮│╰╯┬┴┤├┼]/g, '').trim()

	if (!trimmed) return NO_META

	// Error blocks
	if (/^error|failed|exception/i.test(trimmed)) {
		return { type: 'error', metadata: {} }
	}

	// Thinking
	if (/^thinking|reasoning/i.test(trimmed)) {
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

	return NO_META
}
