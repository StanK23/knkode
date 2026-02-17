import { useCallback, useRef, useState } from 'react'
import type { Workspace } from '../../../shared/types'
import { useClickOutside } from '../hooks/useClickOutside'
import { WORKSPACE_COLORS, useStore } from '../store'
import { colorDotStyle } from '../styles/shared'
import { Tab } from './Tab'

export function TabBar() {
	const workspaces = useStore((s) => s.workspaces)
	const appState = useStore((s) => s.appState)
	const setActiveWorkspace = useStore((s) => s.setActiveWorkspace)
	const closeWorkspaceTab = useStore((s) => s.closeWorkspaceTab)
	const createWorkspace = useStore((s) => s.createWorkspace)
	const updateWorkspace = useStore((s) => s.updateWorkspace)
	const openWorkspace = useStore((s) => s.openWorkspace)

	const [showClosedMenu, setShowClosedMenu] = useState(false)
	const closedMenuRef = useRef<HTMLDivElement>(null)
	useClickOutside(closedMenuRef, () => setShowClosedMenu(false), showClosedMenu)

	const openTabs: Workspace[] = appState.openWorkspaceIds
		.map((id) => workspaces.find((w) => w.id === id))
		.filter((w): w is Workspace => w !== undefined)

	const closedWorkspaces = workspaces.filter((w) => !appState.openWorkspaceIds.includes(w.id))

	const handleRename = useCallback(
		(id: string, name: string) => {
			const ws = workspaces.find((w) => w.id === id)
			if (ws) updateWorkspace({ ...ws, name })
		},
		[workspaces, updateWorkspace],
	)

	const handleNewWorkspace = useCallback(async () => {
		const colorIndex = workspaces.length % WORKSPACE_COLORS.length
		await createWorkspace(
			`Workspace ${workspaces.length + 1}`,
			WORKSPACE_COLORS[colorIndex],
			'single',
		)
	}, [workspaces, createWorkspace])

	return (
		<div style={barStyle}>
			{/* Drag region for frameless window */}
			<div className="drag-region" style={dragRegionStyle} />

			{/* Tabs */}
			<div role="tablist" style={tabsContainerStyle}>
				{openTabs.map((ws) => (
					<Tab
						key={ws.id}
						workspace={ws}
						isActive={ws.id === appState.activeWorkspaceId}
						onActivate={setActiveWorkspace}
						onClose={closeWorkspaceTab}
						onRename={handleRename}
					/>
				))}

				{/* New workspace button */}
				<button
					type="button"
					onClick={handleNewWorkspace}
					title="New workspace"
					style={newBtnStyle}
				>
					+
				</button>
			</div>

			{/* Closed workspaces menu */}
			{closedWorkspaces.length > 0 && (
				<div
					ref={closedMenuRef}
					style={{ position: 'relative', marginLeft: 'auto', marginRight: 8 }}
				>
					<button
						type="button"
						onClick={() => setShowClosedMenu((v) => !v)}
						title="Reopen closed workspace"
						style={reopenBtnStyle}
					>
						{closedWorkspaces.length} closed
					</button>
					{showClosedMenu && (
						<div style={closedMenuStyle}>
							{closedWorkspaces.map((ws) => (
								<button
									type="button"
									key={ws.id}
									style={closedItemStyle}
									onClick={() => {
										openWorkspace(ws.id)
										setShowClosedMenu(false)
									}}
								>
									<span aria-hidden="true" style={{ ...colorDotStyle, background: ws.color }} />
									{ws.name}
								</button>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	)
}

const barStyle: React.CSSProperties = {
	display: 'flex',
	alignItems: 'flex-end',
	background: 'var(--bg-tertiary)',
	borderBottom: '1px solid var(--border)',
	position: 'relative',
	flexShrink: 0,
}

const dragRegionStyle: React.CSSProperties = {
	position: 'absolute',
	top: 0,
	left: 0,
	right: 0,
	height: 'var(--drag-region-height)',
}

const tabsContainerStyle: React.CSSProperties = {
	display: 'flex',
	alignItems: 'flex-end',
	gap: 1,
	paddingLeft: 78,
	paddingTop: 6,
	overflow: 'hidden',
	flex: 1,
}

const newBtnStyle: React.CSSProperties = {
	background: 'none',
	border: 'none',
	color: 'var(--text-dim)',
	cursor: 'pointer',
	fontSize: 18,
	lineHeight: 1,
	padding: '0 10px',
	height: 'var(--tab-height)',
	display: 'flex',
	alignItems: 'center',
	flexShrink: 0,
}

const reopenBtnStyle: React.CSSProperties = {
	background: 'none',
	border: '1px solid var(--border)',
	color: 'var(--text-dim)',
	cursor: 'pointer',
	fontSize: 11,
	padding: '3px 8px',
	borderRadius: 'var(--radius-sm)',
}

const closedMenuStyle: React.CSSProperties = {
	position: 'absolute',
	top: '100%',
	right: 0,
	marginTop: 4,
	background: 'var(--bg-secondary)',
	border: '1px solid var(--border)',
	borderRadius: 'var(--radius)',
	padding: 4,
	zIndex: 100,
	minWidth: 160,
	boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
}

const closedItemStyle: React.CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	gap: 8,
	width: '100%',
	textAlign: 'left',
	background: 'none',
	border: 'none',
	color: 'var(--text-primary)',
	padding: '6px 12px',
	fontSize: 12,
	cursor: 'pointer',
	borderRadius: 'var(--radius-sm)',
}
