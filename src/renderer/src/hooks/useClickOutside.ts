import { type RefObject, useEffect } from 'react'

/**
 * Calls `onClose` when a mousedown occurs outside `ref`.
 * Uses capture-phase listener so it fires before any child element can
 * swallow the event via stopPropagation in the bubble phase. This is
 * important for consumers rendered alongside elements that stop propagation
 * (e.g. terminal canvases). All current consumers (Pane, Tab, TabBar) use
 * `ref.current.contains()` which works identically in either phase.
 * Note: if a future consumer renders a portal outside the ref tree, the
 * capture-phase listener will trigger onClose before the portal handles
 * the event — consider making the phase configurable if that becomes an issue.
 */
export function useClickOutside(
	ref: RefObject<HTMLElement | null>,
	onClose: () => void,
	active: boolean,
): void {
	useEffect(() => {
		if (!active) return
		const handler = (e: MouseEvent) => {
			if (!e.target || !(e.target instanceof Node)) {
				onClose()
				return
			}
			if (ref.current && !ref.current.contains(e.target)) {
				onClose()
			}
		}
		// Capture phase: fires before any child element can swallow the event
		// via stopPropagation in the bubble phase (e.g. xterm's canvas).
		document.addEventListener('mousedown', handler, true)
		return () => document.removeEventListener('mousedown', handler, true)
	}, [ref, onClose, active])
}
