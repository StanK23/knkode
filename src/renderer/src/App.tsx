import { useEffect, useState } from 'react'
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

	const [showSettings, setShowSettings] = useState(false)

	useKeyboardShortcuts()

	useEffect(() => {
		init()
	}, [init])

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
			<div style={loadingStyle}>
				<span style={{ color: 'var(--text-dim)' }}>Loading...</span>
			</div>
		)
	}

	if (initError) {
		return (
			<div style={loadingStyle}>
				<span style={{ color: 'var(--danger, #e74c3c)' }}>Failed to load: {initError}</span>
			</div>
		)
	}

	const activeWorkspace = workspaces.find((w) => w.id === appState.activeWorkspaceId)

	return (
		<div style={appStyle}>
			<TabBar />
			{activeWorkspace ? (
				<>
					{/* Settings gear button */}
					<button
						type="button"
						onClick={() => setShowSettings(true)}
						title="Workspace settings"
						style={gearBtnStyle}
					>
						&#9881;
					</button>
					<PaneArea workspace={activeWorkspace} />
					{showSettings && (
						<SettingsPanel workspace={activeWorkspace} onClose={() => setShowSettings(false)} />
					)}
				</>
			) : (
				<div style={emptyStyle}>
					<p style={{ color: 'var(--text-dim)', fontSize: 14 }}>
						No workspace open. Click + to create one.
					</p>
				</div>
			)}
		</div>
	)
}

const appStyle: React.CSSProperties = {
	display: 'flex',
	flexDirection: 'column',
	height: '100%',
	width: '100%',
	position: 'relative',
}

const loadingStyle: React.CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	height: '100%',
}

const emptyStyle: React.CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	flex: 1,
}

const gearBtnStyle: React.CSSProperties = {
	position: 'absolute',
	top: 'calc(var(--drag-region-height) + var(--tab-height) + 4px)',
	right: 8,
	background: 'none',
	border: 'none',
	color: 'var(--text-dim)',
	cursor: 'pointer',
	fontSize: 16,
	zIndex: 50,
	padding: 4,
	borderRadius: 'var(--radius-sm)',
}
