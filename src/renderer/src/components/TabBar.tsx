import { useCallback, useRef, useState } from 'react'
import type { Workspace } from '../../../shared/types'
import { useClickOutside } from '../hooks/useClickOutside'
import { WORKSPACE_COLORS, useStore } from '../store'
import { colorDotStyle } from '../styles/shared'
import { modKey } from '../utils/platform'
import { Tab } from './Tab'

interface TabBarProps {
	onOpenSettings: () => void
}

export function TabBar({ onOpenSettings }: TabBarProps) {
	const workspaces = useStore((s) => s.workspaces)
	const appState = useStore((s) => s.appState)
	const setActiveWorkspace = useStore((s) => s.setActiveWorkspace)
	const closeWorkspaceTab = useStore((s) => s.closeWorkspaceTab)
	const createDefaultWorkspace = useStore((s) => s.createDefaultWorkspace)
	const updateWorkspace = useStore((s) => s.updateWorkspace)
	const duplicateWorkspace = useStore((s) => s.duplicateWorkspace)
	const openWorkspace = useStore((s) => s.openWorkspace)
	const reorderWorkspaceTabs = useStore((s) => s.reorderWorkspaceTabs)

	const [showClosedMenu, setShowClosedMenu] = useState(false)
	const [dragFromIndex, setDragFromIndex] = useState<number | null>(null)
	const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
	const dragFromRef = useRef<number | null>(null)
	const closedMenuRef = useRef<HTMLDivElement>(null)
	useClickOutside(closedMenuRef, () => setShowClosedMenu(false), showClosedMenu)

	const resetDragState = useCallback(() => {
		setDragFromIndex(null)
		setDragOverIndex(null)
		dragFromRef.current = null
	}, [])

	const handleDragStart = useCallback((index: number) => {
		setDragFromIndex(index)
		dragFromRef.current = index
	}, [])
	const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
		e.preventDefault()
		e.dataTransfer.dropEffect = 'move'
		setDragOverIndex((prev) => (prev === index ? prev : index))
	}, [])
	const handleDrop = useCallback(
		(toIndex: number) => {
			const from = dragFromRef.current
			if (from !== null && from !== toIndex) {
				reorderWorkspaceTabs(from, toIndex)
			}
			resetDragState()
		},
		[reorderWorkspaceTabs, resetDragState],
	)
	const handleDragEnd = useCallback(() => {
		resetDragState()
	}, [resetDragState])

	const openTabs: Workspace[] = appState.openWorkspaceIds
		.map((id) => workspaces.find((w) => w.id === id))
		.filter((w): w is Workspace => w !== undefined)

	const closedWorkspaces = workspaces.filter((w) => !appState.openWorkspaceIds.includes(w.id))

	const updateWorkspaceField = useCallback(
		(id: string, updates: Partial<Workspace>) => {
			const ws = workspaces.find((w) => w.id === id)
			if (ws) updateWorkspace({ ...ws, ...updates })
		},
		[workspaces, updateWorkspace],
	)

	const handleRename = useCallback(
		(id: string, name: string) => updateWorkspaceField(id, { name }),
		[updateWorkspaceField],
	)

	const handleChangeColor = useCallback(
		(id: string, color: string) => updateWorkspaceField(id, { color }),
		[updateWorkspaceField],
	)

	const handleDuplicate = useCallback(
		(id: string) => {
			duplicateWorkspace(id).catch((err) => {
				console.error('[tabbar] Failed to duplicate workspace:', err)
			})
		},
		[duplicateWorkspace],
	)

	const handleNewWorkspace = useCallback(async () => {
		await createDefaultWorkspace()
	}, [createDefaultWorkspace])

	return (
		<div style={barStyle}>
			{/* Window title-bar drag region */}
			<div className="drag-region" style={dragRegionStyle} />

			{/* Tabs */}
			<div role="tablist" style={tabsContainerStyle}>
				{openTabs.map((ws, i) => (
					<Tab
						key={ws.id}
						workspace={ws}
						isActive={ws.id === appState.activeWorkspaceId}
						index={i}
						onActivate={setActiveWorkspace}
						onClose={closeWorkspaceTab}
						onRename={handleRename}
						onChangeColor={handleChangeColor}
						onDuplicate={handleDuplicate}
						onDragStart={handleDragStart}
						onDragOver={handleDragOver}
						onDrop={handleDrop}
						onDragEnd={handleDragEnd}
						isDragOver={dragOverIndex === i && dragFromIndex !== i}
						isDragging={dragFromIndex === i}
						colors={WORKSPACE_COLORS}
					/>
				))}

				{/* New workspace button */}
				<button
					type="button"
					onClick={handleNewWorkspace}
					title={`New workspace (${modKey}+T)`}
					aria-label="Create new workspace"
					style={newBtnStyle}
				>
					+
				</button>
			</div>

			{/* Gear (settings) button — only shown when a workspace is active */}
			{appState.activeWorkspaceId && (
				<button
					type="button"
					onClick={onOpenSettings}
					title={`Workspace settings (${modKey}+,)`}
					aria-label="Open workspace settings"
					style={gearBtnStyle}
					onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
					onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-dim)' }}
				>
					&#9881;
				</button>
			)}

			{/* Closed workspaces menu */}
			{closedWorkspaces.length > 0 && (
				<div
					ref={closedMenuRef}
					style={closedMenuWrapperStyle}
				>
					<button
						type="button"
						onClick={() => setShowClosedMenu((v) => !v)}
						title="Reopen closed workspace"
						aria-label={`Reopen closed workspace (${closedWorkspaces.length} available)`}
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
	paddingLeft: 'var(--traffic-light-offset)',
	paddingTop: 6,
	overflowX: 'auto',
	overflowY: 'hidden',
	flex: 1,
	WebkitAppRegion: 'no-drag',
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

const gearBtnStyle: React.CSSProperties = {
	background: 'none',
	border: 'none',
	color: 'var(--text-dim)',
	cursor: 'pointer',
	fontSize: 14,
	padding: '0 6px',
	height: 'var(--tab-height)',
	display: 'flex',
	alignItems: 'center',
	flexShrink: 0,
	WebkitAppRegion: 'no-drag',
}

const closedMenuWrapperStyle: React.CSSProperties = {
	position: 'relative',
	marginRight: 8,
	WebkitAppRegion: 'no-drag',
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
