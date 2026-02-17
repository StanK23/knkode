import { useEffect } from 'react'
import { getPaneIdsInOrder, useStore } from '../store'

/**
 * Global keyboard shortcuts. Cmd/Ctrl is the modifier.
 * - Cmd+D: split focused pane vertical
 * - Cmd+Shift+D: split focused pane horizontal
 * - Cmd+W: close focused pane
 * - Cmd+T: new workspace
 * - Cmd+Shift+[: previous workspace tab
 * - Cmd+Shift+]: next workspace tab
 * - Cmd+1-9: focus pane by index
 */
export function useKeyboardShortcuts(handlers: {
	onSplitVertical: (paneId: string) => void
	onSplitHorizontal: (paneId: string) => void
	onClosePane: (paneId: string) => void
	onNewWorkspace: () => void
	onFocusPane: (paneId: string) => void
}) {
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			const isMod = e.metaKey || e.ctrlKey

			if (!isMod) return

			const state = useStore.getState()
			const activeWs = state.workspaces.find((w) => w.id === state.appState.activeWorkspaceId)

			if (e.key === 'd' && !e.shiftKey) {
				e.preventDefault()
				if (state.focusedPaneId && activeWs?.panes[state.focusedPaneId]) {
					handlers.onSplitVertical(state.focusedPaneId)
				}
				return
			}

			if (e.key === 'D' && e.shiftKey) {
				e.preventDefault()
				if (state.focusedPaneId && activeWs?.panes[state.focusedPaneId]) {
					handlers.onSplitHorizontal(state.focusedPaneId)
				}
				return
			}

			if (e.key === 'w' && !e.shiftKey) {
				e.preventDefault()
				if (state.focusedPaneId && activeWs) {
					const paneCount = Object.keys(activeWs.panes).length
					if (paneCount > 1 && activeWs.panes[state.focusedPaneId]) {
						handlers.onClosePane(state.focusedPaneId)
					}
				}
				return
			}

			if (e.key === 't' && !e.shiftKey) {
				e.preventDefault()
				handlers.onNewWorkspace()
				return
			}

			// Cmd+Shift+[ — previous tab
			if (e.key === '{' || (e.key === '[' && e.shiftKey)) {
				e.preventDefault()
				const { openWorkspaceIds, activeWorkspaceId } = state.appState
				if (openWorkspaceIds.length < 2) return
				const idx = openWorkspaceIds.indexOf(activeWorkspaceId ?? '')
				const prev = idx <= 0 ? openWorkspaceIds.length - 1 : idx - 1
				state.setActiveWorkspace(openWorkspaceIds[prev])
				return
			}

			// Cmd+Shift+] — next tab
			if (e.key === '}' || (e.key === ']' && e.shiftKey)) {
				e.preventDefault()
				const { openWorkspaceIds, activeWorkspaceId } = state.appState
				if (openWorkspaceIds.length < 2) return
				const idx = openWorkspaceIds.indexOf(activeWorkspaceId ?? '')
				const next = idx >= openWorkspaceIds.length - 1 ? 0 : idx + 1
				state.setActiveWorkspace(openWorkspaceIds[next])
				return
			}

			// Cmd+1-9: focus pane by index
			const num = Number.parseInt(e.key, 10)
			if (num >= 1 && num <= 9 && !e.shiftKey) {
				e.preventDefault()
				if (!activeWs) return
				const paneIds = getPaneIdsInOrder(activeWs.layout.tree)
				const targetId = paneIds[num - 1]
				if (targetId) {
					handlers.onFocusPane(targetId)
				}
				return
			}
		}

		window.addEventListener('keydown', handler)
		return () => window.removeEventListener('keydown', handler)
	}, [handlers])
}
