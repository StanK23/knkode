import { describe, expect, it } from 'vitest'
import { classifyGeminiCli } from './gemini-cli'

describe('classifyGeminiCli', () => {
	it('classifies ReadFile tool call', () => {
		const result = classifyGeminiCli('ReadFile src/main.ts')
		expect(result.type).toBe('tool-call')
		expect(result.metadata.tool).toBe('readfile')
	})

	it('classifies Shell tool call', () => {
		const result = classifyGeminiCli('╭─ Shell npm install')
		expect(result.type).toBe('tool-call')
		expect(result.metadata.tool).toBe('shell')
	})

	it('classifies WriteFile tool call', () => {
		const result = classifyGeminiCli('WriteFile output.json')
		expect(result.type).toBe('tool-call')
		expect(result.metadata.tool).toBe('writefile')
	})

	it('classifies error', () => {
		const result = classifyGeminiCli('Error: command failed')
		expect(result.type).toBe('error')
	})

	it('classifies thinking', () => {
		const result = classifyGeminiCli('Thinking about the problem...')
		expect(result.type).toBe('thinking')
	})

	it('classifies status with spinner', () => {
		const result = classifyGeminiCli('⠋ Running tests...')
		expect(result.type).toBe('status')
	})

	it('classifies status with checkmark', () => {
		const result = classifyGeminiCli('✓ Done')
		expect(result.type).toBe('status')
	})

	it('returns unknown for empty header', () => {
		const result = classifyGeminiCli('╭──────╮')
		expect(result.type).toBe('unknown')
	})

	it('returns unknown for unrecognized content', () => {
		const result = classifyGeminiCli('hello world')
		expect(result.type).toBe('unknown')
	})
})
