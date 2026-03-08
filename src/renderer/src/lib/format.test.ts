import { describe, expect, it } from 'vitest'
import { shortModelName } from '../components/AgentStatusBar'
import { formatTokens } from './format'

describe('formatTokens', () => {
	it('returns raw number below 1000', () => {
		expect(formatTokens(0)).toBe('0')
		expect(formatTokens(999)).toBe('999')
	})

	it('formats 1k-10k with one decimal', () => {
		expect(formatTokens(1000)).toBe('1.0k')
		expect(formatTokens(1234)).toBe('1.2k')
		expect(formatTokens(9999)).toBe('10.0k')
	})

	it('formats 10k+ as rounded integer k', () => {
		expect(formatTokens(10_000)).toBe('10k')
		expect(formatTokens(12_345)).toBe('12k')
		expect(formatTokens(99_999)).toBe('100k')
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
