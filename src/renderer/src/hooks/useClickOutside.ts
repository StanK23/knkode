import { type RefObject, useEffect } from 'react'

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
