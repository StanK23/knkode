import { type RefObject, useEffect } from 'react'

export function useClickOutside(
	ref: RefObject<HTMLElement | null>,
	onClose: () => void,
	active: boolean,
): void {
	useEffect(() => {
		if (!active) return
		const handler = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				onClose()
			}
		}
		// Capture phase: fires before xterm (or other stopPropagation consumers)
		// can swallow the event in the bubble phase.
		document.addEventListener('mousedown', handler, true)
		return () => document.removeEventListener('mousedown', handler, true)
	}, [ref, onClose, active])
}
