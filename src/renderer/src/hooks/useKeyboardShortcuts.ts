import { useEffect } from 'react'
import { getPaneIdsInOrder, useStore } from '../store'
import { isMac } from '../utils/platform'

/**
 * Global keyboard shortcuts. Uses Cmd (macOS) or Ctrl (other platforms).
 * - Mod+D: split pane side-by-side (vertical divider)
 * - Mod+Shift+D: split pane stacked (horizontal divider)
 * - Mod+W: close focused pane
 * - Mod+Shift+W: close workspace tab
 * - Mod+T: new workspace
 * - Mod+Shift+[: previous workspace tab
 * - Mod+Shift+]: next workspace tab
 * - Mod+Option+Arrow: focus pane in direction (prev/next in layout order)
 * - Mod+1-9: focus pane by index
 * - Mod+,: toggle settings panel
 */

interface ShortcutOptions {
	toggleSettings?: () => void
}

export function useKeyboardShortcuts({ toggleSettings }: ShortcutOptions = {}) {
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			// Use Cmd on macOS, Ctrl on other platforms to avoid conflicting
			// with terminal control sequences (Ctrl+D = EOF, Ctrl+W = delete word)
			const isMod = isMac ? e.metaKey : e.ctrlKey
			if (!isMod) return

			// Read latest store state imperatively (avoids stale closure)
			const state = useStore.getState()
			const activeWs = state.workspaces.find((w) => w.id === state.appState.activeWorkspaceId)

			// Resolve focused pane — auto-focus first pane if none focused
			const focusedId = state.focusedPaneId
			const resolvedFocusId =
				focusedId && activeWs?.panes[focusedId]
					? focusedId
					: activeWs
						? (getPaneIdsInOrder(activeWs.layout.tree)[0] ?? null)
						: null

			// Mod+D / Mod+Shift+D — split pane
			if (e.key === 'd' || (e.shiftKey && e.key === 'D')) {
				if (!resolvedFocusId || !activeWs) return
				e.preventDefault()
				const direction = e.shiftKey ? 'vertical' : 'horizontal'
				state.splitPane(activeWs.id, resolvedFocusId, direction)
				return
			}

			// Mod+W — close pane (only when more than 1 pane)
			if (e.key === 'w' && !e.shiftKey) {
				if (!resolvedFocusId || !activeWs) return
				if (Object.keys(activeWs.panes).length <= 1) return
				e.preventDefault()
				state.closePane(activeWs.id, resolvedFocusId)
				return
			}

			// Mod+Shift+W — close workspace tab
			if ((e.key === 'w' || e.key === 'W') && e.shiftKey) {
				if (!activeWs) return
				e.preventDefault()
				state.closeWorkspaceTab(activeWs.id)
				return
			}

			// Mod+T — new workspace
			if (e.key === 't' && !e.shiftKey) {
				e.preventDefault()
				state.createDefaultWorkspace().catch((err) => {
					console.error('[shortcuts] Failed to create workspace:', err)
				})
				return
			}

			// Mod+Shift+[ / Mod+Shift+] — cycle workspace tabs
			// On US keyboard, Shift+[ emits '{' and Shift+] emits '}'
			// Other layouts may emit '['/']' with shiftKey flag
			const isPrevTab = e.key === '{' || (e.key === '[' && e.shiftKey)
			const isNextTab = e.key === '}' || (e.key === ']' && e.shiftKey)
			if (isPrevTab || isNextTab) {
				const { openWorkspaceIds, activeWorkspaceId } = state.appState
				if (openWorkspaceIds.length < 2 || !activeWorkspaceId) return
				e.preventDefault()
				const idx = openWorkspaceIds.indexOf(activeWorkspaceId)
				const delta = isPrevTab ? -1 : 1
				const next = (idx + delta + openWorkspaceIds.length) % openWorkspaceIds.length
				const targetId = openWorkspaceIds[next]
				if (targetId) state.setActiveWorkspace(targetId)
				return
			}

			// Mod+Option+Arrow — focus prev/next pane in layout order
			if (
				e.altKey &&
				(e.key === 'ArrowLeft' ||
					e.key === 'ArrowRight' ||
					e.key === 'ArrowUp' ||
					e.key === 'ArrowDown')
			) {
				if (!activeWs) return
				const paneIds = getPaneIdsInOrder(activeWs.layout.tree)
				if (paneIds.length < 2) return
				const currentIdx = resolvedFocusId ? paneIds.indexOf(resolvedFocusId) : -1
				const delta = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1
				const nextIdx = (currentIdx + delta + paneIds.length) % paneIds.length
				const targetId = paneIds[nextIdx]
				if (!targetId) return
				e.preventDefault()
				state.setFocusedPane(targetId)
				return
			}

			// Mod+, — toggle settings panel
			if (e.key === ',' && toggleSettings) {
				e.preventDefault()
				toggleSettings()
				return
			}

			// Mod+1-9 — focus pane by index
			if (e.key >= '1' && e.key <= '9' && !e.shiftKey) {
				if (!activeWs) return
				const paneIds = getPaneIdsInOrder(activeWs.layout.tree)
				const targetId = paneIds[Number(e.key) - 1]
				if (!targetId) return
				e.preventDefault()
				state.setFocusedPane(targetId)
				return
			}
		}

		window.addEventListener('keydown', handler)
		return () => window.removeEventListener('keydown', handler)
	}, [toggleSettings])
}
