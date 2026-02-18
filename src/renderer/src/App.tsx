import { useCallback, useEffect, useState } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { PaneArea } from './components/PaneArea'
import { SettingsPanel } from './components/SettingsPanel'
import { TabBar } from './components/TabBar'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useStore } from './store'

export function App() {
	const initialized = useStore((s) => s.initialized)
	const initError = useStore((s) => s.initError)
	const init = useStore((s) => s.init)
	const workspaces = useStore((s) => s.workspaces)
	const appState = useStore((s) => s.appState)
	const updatePaneCwd = useStore((s) => s.updatePaneCwd)
	const visitedWorkspaceIds = useStore((s) => s.visitedWorkspaceIds)

	const [showSettings, setShowSettings] = useState(false)
	const closeSettings = useCallback(() => {
		setShowSettings(false)
		// Restore terminal focus after the settings panel unmounts
		const { focusedPaneId, setFocusedPane } = useStore.getState()
		if (focusedPaneId) setFocusedPane(focusedPaneId)
	}, [])
	const toggleSettings = useCallback(() => setShowSettings((v) => !v), [])

	useKeyboardShortcuts({ toggleSettings })

	useEffect(() => {
		init()
	}, [init])

	// Window title — visible in dock tooltip, Mission Control, and Cmd+Tab
	// (title bar text is hidden by titleBarStyle: 'hiddenInset')
	const activeWorkspace = workspaces.find((w) => w.id === appState.activeWorkspaceId)
	const activeWorkspaceName = activeWorkspace?.name
	useEffect(() => {
		document.title = activeWorkspaceName ? `${activeWorkspaceName} — knkode` : 'knkode'
	}, [activeWorkspaceName])

	// Listen for CWD changes from the main process
	useEffect(() => {
		const unsubscribe = window.api.onPtyCwdChanged((paneId, cwd) => {
			const ws = useStore.getState().workspaces.find((w) => paneId in w.panes)
			if (ws) updatePaneCwd(ws.id, paneId, cwd)
		})
		return unsubscribe
	}, [updatePaneCwd])

	if (!initialized) {
		return (
			<div className="flex items-center justify-center h-full">
				<span className="text-content-muted">Loading...</span>
			</div>
		)
	}

	if (initError) {
		return (
			<div className="flex items-center justify-center h-full">
				<span className="text-danger">Failed to load: {initError}</span>
			</div>
		)
	}

	const visitedWorkspaces = workspaces.filter((w) => visitedWorkspaceIds.includes(w.id))

	return (
		<div className="flex flex-col h-full w-full relative">
			<TabBar onOpenSettings={() => setShowSettings(true)} />
			{visitedWorkspaces.length > 0 ? (
				<>
					{visitedWorkspaces.map((ws) => (
						<div
							key={ws.id}
							className={
								ws.id === appState.activeWorkspaceId ? 'flex flex-1 overflow-hidden' : 'hidden'
							}
						>
							<ErrorBoundary>
								<PaneArea workspace={ws} />
							</ErrorBoundary>
						</div>
					))}
					{showSettings && activeWorkspace && (
						<SettingsPanel workspace={activeWorkspace} onClose={closeSettings} />
					)}
				</>
			) : (
				<div className="flex items-center justify-center flex-1">
					<p className="text-content-muted text-sm">No workspace open. Click + to create one.</p>
				</div>
			)}
		</div>
	)
}
