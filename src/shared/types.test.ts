import { describe, expect, it } from 'vitest'
import type { LayoutBranch, LayoutLeaf } from './types'
import { EFFECT_LEVELS, EFFECT_MULTIPLIERS, isEffectLevel, isLayoutBranch } from './types'

describe('isLayoutBranch', () => {
	it('returns true for branch nodes', () => {
		const branch: LayoutBranch = {
			direction: 'horizontal',
			size: 100,
			children: [{ paneId: 'a', size: 50 }],
		}
		expect(isLayoutBranch(branch)).toBe(true)
	})

	it('returns false for leaf nodes', () => {
		const leaf: LayoutLeaf = { paneId: 'a', size: 100 }
		expect(isLayoutBranch(leaf)).toBe(false)
	})
})

describe('isEffectLevel', () => {
	it('returns true for each valid level', () => {
		for (const level of EFFECT_LEVELS) {
			expect(isEffectLevel(level), `${level} should be valid`).toBe(true)
		}
	})

	it('returns false for invalid strings', () => {
		for (const v of ['none', 'high', 'OFF', '', 'medium ', ' subtle', 'INTENSE']) {
			expect(isEffectLevel(v), `"${v}" should be invalid`).toBe(false)
		}
	})

	it('returns false for non-string values', () => {
		expect(isEffectLevel(undefined)).toBe(false)
		expect(isEffectLevel(null)).toBe(false)
		expect(isEffectLevel(42)).toBe(false)
		expect(isEffectLevel(true)).toBe(false)
		expect(isEffectLevel({})).toBe(false)
	})
})

describe('EFFECT_LEVELS', () => {
	it('has the expected members in order', () => {
		expect(EFFECT_LEVELS).toEqual(['off', 'subtle', 'medium', 'intense'])
	})
})

describe('EFFECT_MULTIPLIERS', () => {
	it('has the expected values', () => {
		expect(EFFECT_MULTIPLIERS.off).toBe(0)
		expect(EFFECT_MULTIPLIERS.subtle).toBe(0.4)
		expect(EFFECT_MULTIPLIERS.medium).toBe(0.7)
		expect(EFFECT_MULTIPLIERS.intense).toBe(1.0)
	})

	it('has an entry for every effect level', () => {
		for (const level of EFFECT_LEVELS) {
			expect(EFFECT_MULTIPLIERS[level], `${level} should have a multiplier`).toBeDefined()
		}
	})

	it('all values are non-negative', () => {
		for (const level of EFFECT_LEVELS) {
			expect(EFFECT_MULTIPLIERS[level], `${level} should be >= 0`).toBeGreaterThanOrEqual(0)
		}
	})
})
