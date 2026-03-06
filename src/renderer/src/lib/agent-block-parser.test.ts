import { describe, expect, it } from 'vitest'
import { AgentBlockParser, getClassifier, supportsBlockParsing } from './agent-block-parser'

/** Helper: create a line getter from an array of strings. */
function lineGetter(lines: string[]) {
	return (i: number) => lines[i] ?? ''
}

describe('AgentBlockParser', () => {
	describe('basic block detection', () => {
		it('detects a single complete block', () => {
			const parser = new AgentBlockParser('claude-code')
			const lines = [
				'╭─ Read src/main.ts',
				'│ file contents here',
				'╰───────────────────',
			]
			parser.update(lineGetter(lines), lines.length)

			const blocks = parser.getBlocks()
			expect(blocks).toHaveLength(1)
			expect(blocks[0].type).toBe('tool-call')
			expect(blocks[0].metadata.tool).toBe('read')
			expect(blocks[0].startLine).toBe(0)
			expect(blocks[0].endLine).toBe(2)
			expect(blocks[0].agent).toBe('claude-code')
		})

		it('detects multiple blocks', () => {
			const parser = new AgentBlockParser('claude-code')
			const lines = [
				'╭─ Read file1.ts',
				'│ contents',
				'╰─────────',
				'some text between blocks',
				'╭─ Bash',
				'│ npm install',
				'╰─────────',
			]
			parser.update(lineGetter(lines), lines.length)

			const blocks = parser.getBlocks()
			expect(blocks).toHaveLength(2)
			expect(blocks[0].type).toBe('tool-call')
			expect(blocks[0].metadata.tool).toBe('read')
			expect(blocks[0].endLine).toBe(2)
			expect(blocks[1].type).toBe('tool-call')
			expect(blocks[1].metadata.tool).toBe('bash')
			expect(blocks[1].startLine).toBe(4)
			expect(blocks[1].endLine).toBe(6)
		})

		it('handles open/streaming block (no closing border)', () => {
			const parser = new AgentBlockParser('claude-code')
			const lines = [
				'╭─ Bash',
				'│ running...',
			]
			parser.update(lineGetter(lines), lines.length)

			const blocks = parser.getBlocks()
			expect(blocks).toHaveLength(1)
			expect(blocks[0].endLine).toBeNull()
		})

		it('closes open block when new block starts', () => {
			const parser = new AgentBlockParser('claude-code')
			const lines = [
				'╭─ Read file1.ts',
				'│ contents',
				'╭─ Write file2.ts',
				'│ new contents',
				'╰─────────',
			]
			parser.update(lineGetter(lines), lines.length)

			const blocks = parser.getBlocks()
			expect(blocks).toHaveLength(2)
			expect(blocks[0].endLine).toBe(1)
			expect(blocks[1].startLine).toBe(2)
			expect(blocks[1].endLine).toBe(4)
		})
	})

	describe('incremental parsing', () => {
		it('only processes new lines on subsequent updates', () => {
			const parser = new AgentBlockParser('claude-code')
			const lines = [
				'╭─ Bash',
				'│ running...',
			]
			parser.update(lineGetter(lines), lines.length)
			expect(parser.getBlocks()).toHaveLength(1)
			expect(parser.getBlocks()[0].endLine).toBeNull()

			// Add closing line
			lines.push('╰─────────')
			parser.update(lineGetter(lines), lines.length)

			expect(parser.getBlocks()).toHaveLength(1)
			expect(parser.getBlocks()[0].endLine).toBe(2)
		})

		it('detects new blocks in subsequent updates', () => {
			const parser = new AgentBlockParser('claude-code')
			const lines = [
				'╭─ Read file.ts',
				'│ contents',
				'╰─────────',
			]
			parser.update(lineGetter(lines), lines.length)
			expect(parser.getBlocks()).toHaveLength(1)

			lines.push('╭─ Bash', '│ npm test', '╰─────')
			parser.update(lineGetter(lines), lines.length)
			expect(parser.getBlocks()).toHaveLength(2)
		})
	})

	describe('block type refinement', () => {
		it('refines unknown blocks to diff when diff markers found', () => {
			const parser = new AgentBlockParser('claude-code')
			const lines = [
				'╭──────────╮',
				'+ added line',
				'- removed line',
				'╰──────────╯',
			]
			parser.update(lineGetter(lines), lines.length)

			const blocks = parser.getBlocks()
			expect(blocks).toHaveLength(1)
			expect(blocks[0].type).toBe('diff')
		})

		it('refines unknown blocks to error when error text found', () => {
			const parser = new AgentBlockParser('claude-code')
			const lines = [
				'╭──────────╮',
				'Error: something went wrong',
				'╰──────────╯',
			]
			parser.update(lineGetter(lines), lines.length)

			const blocks = parser.getBlocks()
			expect(blocks).toHaveLength(1)
			expect(blocks[0].type).toBe('error')
		})

		it('does not false-positive on error-like identifiers in content', () => {
			const parser = new AgentBlockParser('claude-code')
			const lines = [
				'╭──────────╮',
				'errorHandler = new ErrorHandler()',
				'╰──────────╯',
			]
			parser.update(lineGetter(lines), lines.length)

			const blocks = parser.getBlocks()
			expect(blocks).toHaveLength(1)
			expect(blocks[0].type).toBe('unknown')
		})

		it('does not refine already-classified blocks', () => {
			const parser = new AgentBlockParser('claude-code')
			const lines = [
				'╭─ Read src/main.ts',
				'Error: file not found',
				'╰─────────',
			]
			parser.update(lineGetter(lines), lines.length)

			const blocks = parser.getBlocks()
			expect(blocks).toHaveLength(1)
			// Should stay as tool-call, not be overridden to error
			expect(blocks[0].type).toBe('tool-call')
		})
	})

	describe('getBlocks snapshot', () => {
		it('returns a snapshot that does not mutate on subsequent updates', () => {
			const parser = new AgentBlockParser('claude-code')
			const lines = ['╭─ Read file.ts', '│ contents', '╰─────────']
			parser.update(lineGetter(lines), lines.length)

			const snapshot = parser.getBlocks()
			expect(snapshot).toHaveLength(1)

			lines.push('╭─ Bash', '│ npm test', '╰─────')
			parser.update(lineGetter(lines), lines.length)

			// Original snapshot unchanged
			expect(snapshot).toHaveLength(1)
			// New call reflects new state
			expect(parser.getBlocks()).toHaveLength(2)
		})
	})

	describe('reset', () => {
		it('clears all state', () => {
			const parser = new AgentBlockParser('claude-code')
			const lines = [
				'╭─ Read file.ts',
				'│ contents',
				'╰─────────',
			]
			parser.update(lineGetter(lines), lines.length)
			expect(parser.getBlocks()).toHaveLength(1)

			parser.reset()
			expect(parser.getBlocks()).toHaveLength(0)

			// Can parse again from scratch
			parser.update(lineGetter(lines), lines.length)
			expect(parser.getBlocks()).toHaveLength(1)
		})
	})

	describe('unsupported agents', () => {
		it('produces no blocks for unsupported agent types', () => {
			const parser = new AgentBlockParser('aider')
			const lines = [
				'╭─ Something',
				'│ contents',
				'╰─────────',
			]
			parser.update(lineGetter(lines), lines.length)
			expect(parser.getBlocks()).toHaveLength(0)
		})
	})

	describe('gemini-cli agent', () => {
		it('detects Gemini CLI blocks', () => {
			const parser = new AgentBlockParser('gemini-cli')
			const lines = [
				'╭─ Shell ls -la',
				'│ drwxr-xr-x  5 user  staff  160 Mar  6 10:00 .',
				'╰─────────',
			]
			parser.update(lineGetter(lines), lines.length)

			const blocks = parser.getBlocks()
			expect(blocks).toHaveLength(1)
			expect(blocks[0].type).toBe('tool-call')
			expect(blocks[0].metadata.tool).toBe('shell')
			expect(blocks[0].agent).toBe('gemini-cli')
		})
	})
})

describe('getClassifier', () => {
	it('returns classifier for claude-code', () => {
		expect(getClassifier('claude-code')).toBeDefined()
	})

	it('returns classifier for gemini-cli', () => {
		expect(getClassifier('gemini-cli')).toBeDefined()
	})

	it('returns null for unsupported agents', () => {
		expect(getClassifier('aider')).toBeNull()
	})
})

describe('supportsBlockParsing', () => {
	it('returns true for claude-code', () => {
		expect(supportsBlockParsing('claude-code')).toBe(true)
	})

	it('returns true for gemini-cli', () => {
		expect(supportsBlockParsing('gemini-cli')).toBe(true)
	})

	it('returns false for aider', () => {
		expect(supportsBlockParsing('aider')).toBe(false)
	})

	it('returns false for codex', () => {
		expect(supportsBlockParsing('codex')).toBe(false)
	})
})
