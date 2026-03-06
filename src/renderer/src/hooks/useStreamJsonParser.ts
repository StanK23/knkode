import { useEffect } from 'react'
import type { LaunchMode } from '../../../shared/types'
import { useStore } from '../store'

/**
 * Hook that feeds raw PTY data to the stream JSON parser for a pane.
 *
 * Active only when the pane's launchMode is a streaming agent (currently
 * only 'claude-code'). Subscribes to the PTY data IPC event independently
 * from the Terminal component — both receive the same data.
 *
 * On mount (for streaming agents): sets view mode to 'rendered'.
 * On unmount or when agent changes: clears stream data.
 */
export function useStreamJsonParser(
	paneId: string,
	launchMode: LaunchMode | null | undefined,
): void {
	const feedStreamData = useStore((s) => s.feedStreamData)
	const clearStreamData = useStore((s) => s.clearStreamData)
	const setViewMode = useStore((s) => s.setViewMode)

	const shouldParse = launchMode === 'claude-code'

	useEffect(() => {
		if (!shouldParse) return

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
	}, [paneId, shouldParse, feedStreamData, clearStreamData, setViewMode])
}
