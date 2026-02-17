import { describe, expect, it } from 'vitest'
import type { LayoutBranch, LayoutLeaf } from './types'
import { isLayoutBranch } from './types'

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
