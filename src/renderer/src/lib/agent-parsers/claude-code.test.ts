import { describe, expect, it } from 'vitest'
import { classifyClaudeCode } from './claude-code'

describe('classifyClaudeCode', () => {
	it('classifies Read tool call', () => {
		const result = classifyClaudeCode('─ Read src/main.ts ─')
		expect(result.type).toBe('tool-call')
		expect(result.metadata.tool).toBe('read')
	})

	it('classifies Write tool call', () => {
		const result = classifyClaudeCode('╭─ Write src/index.ts')
		expect(result.type).toBe('tool-call')
		expect(result.metadata.tool).toBe('write')
	})

	it('classifies Bash tool call', () => {
		const result = classifyClaudeCode('╭─ Bash')
		expect(result.type).toBe('tool-call')
		expect(result.metadata.tool).toBe('bash')
	})

	it('classifies Edit tool call', () => {
		const result = classifyClaudeCode('Edit src/utils.ts')
		expect(result.type).toBe('tool-call')
		expect(result.metadata.tool).toBe('edit')
	})

	it('classifies Grep tool call', () => {
		const result = classifyClaudeCode('Grep pattern')
		expect(result.type).toBe('tool-call')
		expect(result.metadata.tool).toBe('grep')
	})

	it('classifies Agent tool call', () => {
		const result = classifyClaudeCode('Agent subagent task')
		expect(result.type).toBe('tool-call')
		expect(result.metadata.tool).toBe('agent')
	})

	it('classifies permission prompt', () => {
		const result = classifyClaudeCode('Allow this action? (y/n)')
		expect(result.type).toBe('permission')
	})

	it('classifies error', () => {
		const result = classifyClaudeCode('Error: file not found')
		expect(result.type).toBe('error')
	})

	it('classifies thinking', () => {
		const result = classifyClaudeCode('Thinking about the approach...')
		expect(result.type).toBe('thinking')
	})

	it('returns unknown for empty header', () => {
		const result = classifyClaudeCode('╭──────────────╮')
		expect(result.type).toBe('unknown')
	})

	it('returns unknown for unrecognized content', () => {
		const result = classifyClaudeCode('some random text')
		expect(result.type).toBe('unknown')
	})

	it('is case-insensitive for tool names', () => {
		const result = classifyClaudeCode('BASH npm install')
		expect(result.type).toBe('tool-call')
		expect(result.metadata.tool).toBe('bash')
	})
})
