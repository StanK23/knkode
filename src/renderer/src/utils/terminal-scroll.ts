export interface SavedScroll {
	atBottom: boolean
	linesFromBottom: number
}

interface BufferLike {
	active: {
		baseY: number
		type: 'alternate' | 'normal'
		viewportY: number
	}
}

interface ScrollTerminalLike {
	buffer: BufferLike
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

export function isTermAtBottom(term: ScrollTerminalLike): boolean {
	return term.buffer.active.viewportY >= term.buffer.active.baseY
}

export function getLinesFromBottom(term: ScrollTerminalLike): number {
	return Math.max(0, term.buffer.active.baseY - term.buffer.active.viewportY)
}

export function readSavedScroll(term: ScrollTerminalLike): SavedScroll {
	return {
		atBottom: isTermAtBottom(term),
		linesFromBottom: getLinesFromBottom(term),
	}
}

export function restoreSavedScroll(term: ScrollTerminalLike, saved: SavedScroll): void {
	if (saved.atBottom) {
		term.scrollToBottom()
	} else {
		term.scrollToLine(Math.max(0, term.buffer.active.baseY - saved.linesFromBottom))
	}
}

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
