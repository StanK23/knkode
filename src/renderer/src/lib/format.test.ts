import { describe, expect, it } from 'vitest'
import { shortModelName } from '../components/AgentStatusBar'
import { formatTokens } from './format'

describe('formatTokens', () => {
	it('returns full number with commas below 10k', () => {
		expect(formatTokens(0)).toBe('0')
		expect(formatTokens(999)).toBe('999')
		expect(formatTokens(1234)).toBe('1,234')
		expect(formatTokens(9999)).toBe('9,999')
	})

	it('formats 10k-100k with one decimal', () => {
		expect(formatTokens(10_000)).toBe('10.0k')
		expect(formatTokens(12_345)).toBe('12.3k')
		expect(formatTokens(45_678)).toBe('45.7k')
		expect(formatTokens(99_999)).toBe('100.0k')
	})

	it('formats 100k+ as rounded integer k', () => {
		expect(formatTokens(100_000)).toBe('100k')
		expect(formatTokens(123_456)).toBe('123k')
		expect(formatTokens(200_000)).toBe('200k')
	})
})

describe('shortModelName', () => {
	it('extracts family and version from standard model IDs', () => {
		expect(shortModelName('claude-sonnet-4-6-20260301')).toBe('sonnet 4.6')
		expect(shortModelName('claude-opus-4-6')).toBe('opus 4.6')
		expect(shortModelName('claude-haiku-4-5-20251001')).toBe('haiku 4.5')
	})

	it('falls through to fallback for models without minor version', () => {
		// "claude-sonnet-4-20250514" — date suffix should NOT be captured as minor
		expect(shortModelName('claude-sonnet-4-20250514')).toBe('sonnet-4-20250514')
	})

	it('strips claude- prefix for unknown formats', () => {
		expect(shortModelName('claude-custom-model')).toBe('custom-model')
	})

	it('returns as-is for non-claude models', () => {
		expect(shortModelName('gpt-4o')).toBe('gpt-4o')
	})
})
