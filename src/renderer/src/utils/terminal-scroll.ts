export interface SavedScroll {
	readonly atBottom: boolean
	readonly linesFromBottom: number
	readonly viewportAnchor: ScrollAnchorLike | null
}

export interface ScrollAnchorLike {
	readonly line: number
	dispose: () => void
}

interface BufferLike {
	active: {
		baseY: number
		cursorY: number
		viewportY: number
	}
}

interface ScrollTerminalLike {
	buffer: BufferLike
	registerMarker: (cursorYOffset?: number) => ScrollAnchorLike | undefined
	scrollToBottom: () => void
	scrollToLine: (line: number) => void
}

interface ViewportSyncCoordinatorOptions {
	cancel: (id: number) => void
	schedule: (cb: () => void) => number
	sync: () => void
}

export interface ViewportSyncCoordinator {
	dispose: () => void
	isBlocked: () => boolean
	runBlockedMutation: (mutate: () => void) => void
	scheduleSync: () => void
}

/** Returns true when the terminal viewport is scrolled to (or past) the last line of output. */
export function isTermAtBottom(term: ScrollTerminalLike): boolean {
	return term.buffer.active.viewportY >= term.buffer.active.baseY
}

function getLinesFromBottom(term: ScrollTerminalLike): number {
	return Math.max(0, term.buffer.active.baseY - term.buffer.active.viewportY)
}

function createViewportAnchor(term: ScrollTerminalLike): ScrollAnchorLike | null {
	const cursorAbsoluteY = term.buffer.active.baseY + term.buffer.active.cursorY
	const viewportOffset = term.buffer.active.viewportY - cursorAbsoluteY
	return term.registerMarker(viewportOffset) ?? null
}

/** Capture the terminal's current scroll position as a portable snapshot.
 *  The snapshot stores both distance-from-bottom and a tracked viewport anchor.
 *  The anchor follows the top visible line when scrollback is trimmed. */
export function readSavedScroll(term: ScrollTerminalLike): SavedScroll {
	const atBottom = isTermAtBottom(term)
	return {
		atBottom,
		linesFromBottom: getLinesFromBottom(term),
		viewportAnchor: atBottom ? null : createViewportAnchor(term),
	}
}

/** Restore a previously captured scroll position.
 *  If the snapshot was at-bottom, scrolls to the latest output; otherwise
 *  prefers the tracked viewport anchor and falls back to distance-from-bottom. */
export function restoreSavedScroll(term: ScrollTerminalLike, saved: SavedScroll): void {
	if (saved.atBottom) {
		term.scrollToBottom()
	} else if (saved.viewportAnchor && saved.viewportAnchor.line >= 0) {
		term.scrollToLine(saved.viewportAnchor.line)
	} else {
		term.scrollToLine(Math.max(0, term.buffer.active.baseY - saved.linesFromBottom))
	}
}

/** Dispose any tracked viewport anchor associated with a saved scroll snapshot. */
export function disposeSavedScroll(saved: SavedScroll): void {
	saved.viewportAnchor?.dispose()
}

/**
 * Coordinates scroll-state syncing to avoid stale reads during mutations.
 *
 * `scheduleSync()` coalesces rapid-fire sync requests (e.g. from onWriteParsed)
 * into a single scheduled callback. `runBlockedMutation()` sets a blocking flag
 * that suppresses viewport scroll handlers until one frame after the mutation
 * settles, preventing scroll events fired by the mutation itself from corrupting
 * saved state. The blocking flag accumulates — a `scheduleSync()` that replaces
 * a pending block-release callback still releases the block when it fires.
 */
export function createViewportSyncCoordinator({
	cancel,
	schedule,
	sync,
}: ViewportSyncCoordinatorOptions): ViewportSyncCoordinator {
	let blocked = false
	let pendingId: number | null = null
	let pendingRelease = false

	const queueSync = (releaseBlock: boolean) => {
		if (pendingId !== null) cancel(pendingId)
		pendingRelease = pendingRelease || releaseBlock
		pendingId = schedule(() => {
			pendingId = null
			const shouldRelease = pendingRelease
			pendingRelease = false
			try {
				sync()
			} catch (err) {
				console.warn('[viewport-sync] sync callback threw:', err)
			} finally {
				if (shouldRelease) blocked = false
			}
		})
	}

	return {
		dispose: () => {
			if (pendingId !== null) cancel(pendingId)
			pendingId = null
			pendingRelease = false
			blocked = false
		},
		isBlocked: () => blocked,
		runBlockedMutation: (mutate) => {
			blocked = true
			try {
				mutate()
			} finally {
				queueSync(true)
			}
		},
		scheduleSync: () => {
			queueSync(false)
		},
	}
}
