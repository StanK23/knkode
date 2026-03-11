import { describe, expect, it } from 'vitest'
import {
	createViewportSyncCoordinator,
	readSavedScroll,
	restoreSavedScroll,
} from './terminal-scroll'

function createScheduler() {
	let nextId = 1
	const pending = new Map<number, () => void>()

	return {
		cancel: (id: number) => {
			pending.delete(id)
		},
		flush: () => {
			const callbacks = [...pending.values()]
			pending.clear()
			for (const callback of callbacks) callback()
		},
		pendingCount: () => pending.size,
		schedule: (cb: () => void) => {
			const id = nextId++
			pending.set(id, cb)
			return id
		},
	}
}

describe('readSavedScroll', () => {
	it('captures distance from the bottom of the buffer', () => {
		expect(
			readSavedScroll({
				buffer: { active: { baseY: 120, type: 'normal', viewportY: 90 } },
				scrollToBottom: () => {},
				scrollToLine: () => {},
			}),
		).toEqual({
			atBottom: false,
			linesFromBottom: 30,
		})
	})

	it('treats viewport at baseY as bottom', () => {
		expect(
			readSavedScroll({
				buffer: { active: { baseY: 48, type: 'normal', viewportY: 48 } },
				scrollToBottom: () => {},
				scrollToLine: () => {},
			}),
		).toEqual({
			atBottom: true,
			linesFromBottom: 0,
		})
	})
})

describe('restoreSavedScroll', () => {
	it('restores bottom-aligned snapshots with scrollToBottom', () => {
		let scrolledToBottom = false
		restoreSavedScroll(
			{
				buffer: { active: { baseY: 80, type: 'normal', viewportY: 40 } },
				scrollToBottom: () => {
					scrolledToBottom = true
				},
				scrollToLine: () => {
					throw new Error('should not scroll to a specific line when at bottom')
				},
			},
			{ atBottom: true, linesFromBottom: 0 },
		)
		expect(scrolledToBottom).toBe(true)
	})

	it('restores distance-from-bottom snapshots with scrollToLine', () => {
		let restoredLine: number | null = null
		restoreSavedScroll(
			{
				buffer: { active: { baseY: 150, type: 'normal', viewportY: 20 } },
				scrollToBottom: () => {
					throw new Error('should not scroll to bottom when restoring a scrolled-up viewport')
				},
				scrollToLine: (line) => {
					restoredLine = line
				},
			},
			{ atBottom: false, linesFromBottom: 25 },
		)
		expect(restoredLine).toBe(125)
	})
})

describe('createViewportSyncCoordinator', () => {
	it('coalesces repeated sync requests into one scheduled callback', () => {
		const scheduler = createScheduler()
		const calls: string[] = []
		const coordinator = createViewportSyncCoordinator({
			cancel: scheduler.cancel,
			schedule: scheduler.schedule,
			sync: () => {
				calls.push('sync')
			},
		})

		coordinator.scheduleSync()
		coordinator.scheduleSync()

		expect(scheduler.pendingCount()).toBe(1)
		expect(calls).toEqual([])

		scheduler.flush()

		expect(calls).toEqual(['sync'])
		expect(coordinator.isBlocked()).toBe(false)
	})

	it('blocks viewport events until a blocked mutation settles and syncs', () => {
		const scheduler = createScheduler()
		const calls: string[] = []
		const coordinator = createViewportSyncCoordinator({
			cancel: scheduler.cancel,
			schedule: scheduler.schedule,
			sync: () => {
				calls.push('sync')
			},
		})

		coordinator.runBlockedMutation(() => {
			calls.push('mutate')
		})

		expect(calls).toEqual(['mutate'])
		expect(coordinator.isBlocked()).toBe(true)
		expect(scheduler.pendingCount()).toBe(1)

		scheduler.flush()

		expect(calls).toEqual(['mutate', 'sync'])
		expect(coordinator.isBlocked()).toBe(false)
	})
})
