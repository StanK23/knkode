import { useEffect } from 'react'
import type { LaunchMode } from '../../../shared/types'
import { useStore } from '../store'

/**
 * Hook that feeds raw PTY data to the stream data store for agent panes.
 *
 * Active only when the pane's launchMode is a known agent (currently
 * 'claude-code'). Subscribes to the PTY data IPC event independently
 * from the Terminal component — both receive the same data.
 *
 * Enables the rendered/raw view toggle for agent panes.
 * On unmount or when agent changes: clears stream data.
 */
export function useStreamJsonParser(paneId: string, launchMode?: LaunchMode | null): void {
	const feedStreamData = useStore((s) => s.feedStreamData)
	const clearStreamData = useStore((s) => s.clearStreamData)
	const setViewMode = useStore((s) => s.setViewMode)

	const isAgent = launchMode === 'claude-code'

	useEffect(() => {
		if (!isAgent) return

		// Default to rendered view for agent panes — NDJSON parsing is now reliable
		setViewMode(paneId, 'rendered')

		const removeListener = window.api.onPtyData((id, data) => {
			if (id === paneId) {
				feedStreamData(paneId, data)
			}
		})

		return () => {
			removeListener()
			clearStreamData(paneId)
		}
	}, [paneId, isAgent, feedStreamData, clearStreamData, setViewMode])
}
