import type { Terminal as XTerm } from '@xterm/xterm'
import type { ScrollDebugEvent } from '../../../shared/types'
import type { SavedScroll } from '../utils/terminal-scroll'

interface ScrollDebugContext {
	readonly paneId: string
	readonly workspaceId: string | null
	readonly workspaceName: string | null
	readonly paneLabel: string | null
	readonly activeWorkspaceId: string | null
}

export function serializeSavedScroll(saved: SavedScroll): Record<string, unknown> {
	return {
		atBottom: saved.atBottom,
		linesFromBottom: saved.linesFromBottom,
		viewportAnchorLine: saved.viewportAnchor?.line ?? null,
	}
}

export function serializeTerminalState(term: XTerm | null): Record<string, unknown> {
	if (!term) return { available: false }
	return {
		available: true,
		cols: term.cols,
		rows: term.rows,
		bufferType: term.buffer.active.type,
		baseY: term.buffer.active.baseY,
		cursorY: term.buffer.active.cursorY,
		viewportY: term.buffer.active.viewportY,
	}
}

export function createScrollDebugLogger(getContext: () => ScrollDebugContext) {
	let seq = 0
	return (event: string, details?: Record<string, unknown>): void => {
		const payload: ScrollDebugEvent = {
			...getContext(),
			seq: ++seq,
			event,
			details,
		}
		if (typeof window.api.logScrollDebug === 'function') {
			window.api.logScrollDebug(payload)
		}
	}
}
