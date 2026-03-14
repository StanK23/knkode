import { describe, expect, it } from 'vitest'
import {
	cloneSavedScroll,
	createViewportSyncCoordinator,
	disposeSavedScroll,
	isSavedScrollAtTop,
	isTransientResetBottomLeak,
	isTransientResetCollapsed,
	readSavedScroll,
	restoreSavedScroll,
	shouldCompleteTransientViewportReset,
	shouldDeferTransientViewportRestore,
	shouldIgnoreTransientViewportReset,
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
				buffer: { active: { baseY: 120, cursorY: 0, viewportY: 90 } },
				registerMarker: () => null,
				scrollToBottom: () => {},
				scrollToLine: () => {},
			}),
		).toEqual({
			atBottom: false,
			linesFromBottom: 30,
			viewportAnchor: null,
		})
	})

	it('treats viewport at baseY as bottom', () => {
		expect(
			readSavedScroll({
				buffer: { active: { baseY: 48, cursorY: 0, viewportY: 48 } },
				registerMarker: () => {
					throw new Error('should not create a marker when already at bottom')
				},
				scrollToBottom: () => {},
				scrollToLine: () => {},
			}),
		).toEqual({
			atBottom: true,
			linesFromBottom: 0,
			viewportAnchor: null,
		})
	})

	it('registers a viewport anchor relative to the cursor when scrolled up', () => {
		const marker = { line: 90, dispose: () => {} }
		let offset: number | undefined
		const saved = readSavedScroll({
			buffer: { active: { baseY: 120, cursorY: 10, viewportY: 90 } },
			registerMarker: (cursorOffset) => {
				offset = cursorOffset
				return marker
			},
			scrollToBottom: () => {},
			scrollToLine: () => {},
		})

		expect(offset).toBe(-40)
		expect(saved.viewportAnchor).toBe(marker)
	})
})

describe('restoreSavedScroll', () => {
	it('restores bottom-aligned snapshots with scrollToBottom', () => {
		let scrolledToBottom = false
		restoreSavedScroll(
			{
				buffer: { active: { baseY: 80, cursorY: 0, viewportY: 40 } },
				registerMarker: () => undefined,
				scrollToBottom: () => {
					scrolledToBottom = true
				},
				scrollToLine: () => {
					throw new Error('should not scroll to a specific line when at bottom')
				},
			},
			{ atBottom: true, linesFromBottom: 0, viewportAnchor: null },
		)
		expect(scrolledToBottom).toBe(true)
	})

	it('prefers the tracked viewport anchor when restoring a scrolled-up viewport', () => {
		let restoredLine: number | null = null
		restoreSavedScroll(
			{
				buffer: { active: { baseY: 150, cursorY: 0, viewportY: 20 } },
				registerMarker: () => undefined,
				scrollToBottom: () => {
					throw new Error('should not scroll to bottom when restoring a scrolled-up viewport')
				},
				scrollToLine: (line) => {
					restoredLine = line
				},
			},
			{ atBottom: false, linesFromBottom: 25, viewportAnchor: { line: 98, dispose: () => {} } },
		)
		expect(restoredLine).toBe(98)
	})

	it('restores distance-from-bottom snapshots with scrollToLine', () => {
		let restoredLine: number | null = null
		restoreSavedScroll(
			{
				buffer: { active: { baseY: 150, cursorY: 0, viewportY: 20 } },
				registerMarker: () => undefined,
				scrollToBottom: () => {
					throw new Error('should not scroll to bottom when restoring a scrolled-up viewport')
				},
				scrollToLine: (line) => {
					restoredLine = line
				},
			},
			{ atBottom: false, linesFromBottom: 25, viewportAnchor: null },
		)
		expect(restoredLine).toBe(125)
	})

	it('falls back to distance-from-bottom when the anchor was trimmed away', () => {
		let restoredLine: number | null = null
		restoreSavedScroll(
			{
				buffer: { active: { baseY: 150, cursorY: 0, viewportY: 20 } },
				registerMarker: () => undefined,
				scrollToBottom: () => {
					throw new Error('should not scroll to bottom when restoring a scrolled-up viewport')
				},
				scrollToLine: (line) => {
					restoredLine = line
				},
			},
			{ atBottom: false, linesFromBottom: 25, viewportAnchor: { line: -1, dispose: () => {} } },
		)
		expect(restoredLine).toBe(125)
	})
})

describe('disposeSavedScroll', () => {
	it('disposes the viewport anchor when present', () => {
		let disposed = false
		disposeSavedScroll({
			atBottom: false,
			linesFromBottom: 25,
			viewportAnchor: {
				line: 42,
				dispose: () => {
					disposed = true
				},
			},
		})

		expect(disposed).toBe(true)
	})
})

describe('isSavedScrollAtTop', () => {
	it('detects a top-anchored saved scroll snapshot', () => {
		expect(
			isSavedScrollAtTop({
				atBottom: false,
				linesFromBottom: 42,
				viewportAnchor: { line: 0, dispose: () => {} },
			}),
		).toBe(true)
	})

	it('returns false for bottom-aligned snapshots', () => {
		expect(
			isSavedScrollAtTop({
				atBottom: true,
				linesFromBottom: 0,
				viewportAnchor: null,
			}),
		).toBe(false)
	})
})

describe('cloneSavedScroll', () => {
	it('freezes the current anchor line without reusing the live marker', () => {
		const liveMarker = { line: 217, dispose: () => {} }
		const cloned = cloneSavedScroll({
			atBottom: false,
			linesFromBottom: 28,
			viewportAnchor: liveMarker,
		})

		liveMarker.line = -1

		expect(cloned).toEqual({
			atBottom: false,
			linesFromBottom: 28,
			viewportAnchor: { line: 217, dispose: expect.any(Function) },
		})
		expect(cloned.viewportAnchor).not.toBe(liveMarker)
	})
})

describe('shouldIgnoreTransientViewportReset', () => {
	it('ignores a transient jump to the top after a redraw reset', () => {
		expect(
			shouldIgnoreTransientViewportReset({
				current: {
					atBottom: false,
					linesFromBottom: 492,
					viewportAnchor: { line: 0, dispose: () => {} },
				},
				previous: {
					atBottom: true,
					linesFromBottom: 0,
					viewportAnchor: null,
				},
				sawResetToTop: true,
				term: { baseY: 492, viewportY: 0 },
			}),
		).toBe(true)
	})

	it('does not ignore when the pane was already intentionally at the top', () => {
		expect(
			shouldIgnoreTransientViewportReset({
				current: {
					atBottom: false,
					linesFromBottom: 492,
					viewportAnchor: { line: 0, dispose: () => {} },
				},
				previous: {
					atBottom: false,
					linesFromBottom: 539,
					viewportAnchor: { line: 0, dispose: () => {} },
				},
				sawResetToTop: true,
				term: { baseY: 492, viewportY: 0 },
			}),
		).toBe(false)
	})

	it('does not ignore without a matching redraw reset signal', () => {
		expect(
			shouldIgnoreTransientViewportReset({
				current: {
					atBottom: false,
					linesFromBottom: 492,
					viewportAnchor: { line: 0, dispose: () => {} },
				},
				previous: {
					atBottom: true,
					linesFromBottom: 0,
					viewportAnchor: null,
				},
				sawResetToTop: false,
				term: { baseY: 492, viewportY: 0 },
			}),
		).toBe(false)
	})
})

describe('shouldDeferTransientViewportRestore', () => {
	it('defers recovery when the anchor is gone and the buffer has not rebuilt enough yet', () => {
		expect(
			shouldDeferTransientViewportRestore({
				saved: {
					atBottom: false,
					linesFromBottom: 218,
					viewportAnchor: { line: -1, dispose: () => {} },
				},
				term: { baseY: 53 },
			}),
		).toBe(true)
	})

	it('does not defer once distance-from-bottom can restore the prior viewport', () => {
		expect(
			shouldDeferTransientViewportRestore({
				saved: {
					atBottom: false,
					linesFromBottom: 218,
					viewportAnchor: { line: -1, dispose: () => {} },
				},
				term: { baseY: 379 },
			}),
		).toBe(false)
	})

	it('does not defer when a live anchor is still available', () => {
		expect(
			shouldDeferTransientViewportRestore({
				saved: {
					atBottom: false,
					linesFromBottom: 218,
					viewportAnchor: { line: 161, dispose: () => {} },
				},
				term: { baseY: 53 },
			}),
		).toBe(false)
	})
})

describe('shouldCompleteTransientViewportReset', () => {
	it('does not complete while the temporary zero-buffer state is still active', () => {
		expect(
			shouldCompleteTransientViewportReset({
				current: {
					atBottom: true,
					linesFromBottom: 0,
					viewportAnchor: null,
				},
				term: { baseY: 0 },
			}),
		).toBe(false)
	})

	it('does not complete when the rebuilt viewport is still pinned to the top', () => {
		expect(
			shouldCompleteTransientViewportReset({
				current: {
					atBottom: false,
					linesFromBottom: 243,
					viewportAnchor: { line: 0, dispose: () => {} },
				},
				term: { baseY: 243 },
			}),
		).toBe(false)
	})

	it('completes once a non-top viewport has been restored', () => {
		expect(
			shouldCompleteTransientViewportReset({
				current: {
					atBottom: false,
					linesFromBottom: 28,
					viewportAnchor: { line: 217, dispose: () => {} },
				},
				term: { baseY: 245 },
			}),
		).toBe(true)
	})

	it('completes once bottom-follow is restored after the redraw rebuild', () => {
		expect(
			shouldCompleteTransientViewportReset({
				current: {
					atBottom: true,
					linesFromBottom: 0,
					viewportAnchor: null,
				},
				term: { baseY: 214 },
			}),
		).toBe(true)
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

	it('preserves block-release when scheduleSync replaces a pending release callback', () => {
		const scheduler = createScheduler()
		let syncCount = 0
		const coordinator = createViewportSyncCoordinator({
			cancel: scheduler.cancel,
			schedule: scheduler.schedule,
			sync: () => {
				syncCount++
			},
		})

		// runBlockedMutation queues a release callback
		coordinator.runBlockedMutation(() => {})
		expect(coordinator.isBlocked()).toBe(true)

		// scheduleSync replaces the pending callback — must NOT lose the release
		coordinator.scheduleSync()
		expect(scheduler.pendingCount()).toBe(1)

		scheduler.flush()
		expect(syncCount).toBe(1)
		expect(coordinator.isBlocked()).toBe(false)
	})

	it('dispose cancels pending callbacks and resets blocked state', () => {
		const scheduler = createScheduler()
		let syncCount = 0
		const coordinator = createViewportSyncCoordinator({
			cancel: scheduler.cancel,
			schedule: scheduler.schedule,
			sync: () => {
				syncCount++
			},
		})

		coordinator.runBlockedMutation(() => {})
		expect(coordinator.isBlocked()).toBe(true)
		expect(scheduler.pendingCount()).toBe(1)

		coordinator.dispose()
		expect(coordinator.isBlocked()).toBe(false)
		expect(scheduler.pendingCount()).toBe(0)

		// Flushing after dispose should not fire the cancelled callback
		scheduler.flush()
		expect(syncCount).toBe(0)
	})

	it('releases block even when mutation throws', () => {
		const scheduler = createScheduler()
		let syncCount = 0
		const coordinator = createViewportSyncCoordinator({
			cancel: scheduler.cancel,
			schedule: scheduler.schedule,
			sync: () => {
				syncCount++
			},
		})

		expect(() =>
			coordinator.runBlockedMutation(() => {
				throw new Error('mutation failed')
			}),
		).toThrow('mutation failed')

		// Block should still be set (released on next frame, not synchronously)
		expect(coordinator.isBlocked()).toBe(true)
		expect(scheduler.pendingCount()).toBe(1)

		scheduler.flush()
		expect(syncCount).toBe(1)
		expect(coordinator.isBlocked()).toBe(false)
	})
})

describe('isTransientResetCollapsed', () => {
	it('returns true when sawResetToTop is true and baseY is 0', () => {
		expect(
			isTransientResetCollapsed({
				sawResetToTop: true,
				term: { baseY: 0 },
			}),
		).toBe(true)
	})

	it('returns false when baseY is non-zero even during a reset', () => {
		expect(
			isTransientResetCollapsed({
				sawResetToTop: true,
				term: { baseY: 74 },
			}),
		).toBe(false)
	})

	it('returns false when sawResetToTop is false', () => {
		expect(
			isTransientResetCollapsed({
				sawResetToTop: false,
				term: { baseY: 0 },
			}),
		).toBe(false)
	})
})

describe('isTransientResetBottomLeak', () => {
	it('detects a bottom leak when user was scrolled up but current shows at-bottom', () => {
		expect(
			isTransientResetBottomLeak({
				frozenSnapshot: {
					atBottom: false,
					linesFromBottom: 232,
					viewportAnchor: { line: 128, dispose: () => {} },
				},
				current: {
					atBottom: true,
					linesFromBottom: 0,
					viewportAnchor: null,
				},
				sawResetToTop: true,
			}),
		).toBe(true)
	})

	it('returns false when the frozen snapshot was at bottom', () => {
		expect(
			isTransientResetBottomLeak({
				frozenSnapshot: {
					atBottom: true,
					linesFromBottom: 0,
					viewportAnchor: null,
				},
				current: {
					atBottom: true,
					linesFromBottom: 0,
					viewportAnchor: null,
				},
				sawResetToTop: true,
			}),
		).toBe(false)
	})

	it('returns false when no frozen snapshot exists', () => {
		expect(
			isTransientResetBottomLeak({
				frozenSnapshot: null,
				current: {
					atBottom: true,
					linesFromBottom: 0,
					viewportAnchor: null,
				},
				sawResetToTop: true,
			}),
		).toBe(false)
	})

	it('returns false when sawResetToTop is false', () => {
		expect(
			isTransientResetBottomLeak({
				frozenSnapshot: {
					atBottom: false,
					linesFromBottom: 232,
					viewportAnchor: null,
				},
				current: {
					atBottom: true,
					linesFromBottom: 0,
					viewportAnchor: null,
				},
				sawResetToTop: false,
			}),
		).toBe(false)
	})

	it('returns false when current is also scrolled up (no leak)', () => {
		expect(
			isTransientResetBottomLeak({
				frozenSnapshot: {
					atBottom: false,
					linesFromBottom: 232,
					viewportAnchor: null,
				},
				current: {
					atBottom: false,
					linesFromBottom: 100,
					viewportAnchor: { line: 50, dispose: () => {} },
				},
				sawResetToTop: true,
			}),
		).toBe(false)
	})
})
