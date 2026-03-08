import { describe, expect, it } from 'vitest'
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
