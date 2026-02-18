import { useCallback, useRef, useState } from 'react'
import type { Workspace } from '../../../shared/types'
import { useClickOutside } from '../hooks/useClickOutside'
import { WORKSPACE_COLORS, useStore } from '../store'
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
		<div className="flex items-end bg-sunken border-b border-edge relative shrink-0">
			{/* Window title-bar drag region */}
			<div className="drag-region absolute top-0 left-0 right-0 h-drag" />

			{/* Tabs */}
			<div
				role="tablist"
				className="flex items-end gap-px pl-traffic pt-1.5 overflow-x-auto overflow-y-hidden flex-1"
				style={{ WebkitAppRegion: 'no-drag' }}
			>
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
					className="bg-transparent border-none text-content-muted cursor-pointer text-lg leading-none px-2.5 h-tab flex items-center shrink-0 hover:text-content hover:bg-overlay rounded-sm focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
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
					className="bg-transparent border-none text-content-muted cursor-pointer min-w-[44px] px-2.5 h-tab flex items-center justify-center shrink-0 hover:text-content hover:bg-overlay rounded-sm focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
					style={{ WebkitAppRegion: 'no-drag' }}
				>
					<svg
						width="18"
						height="18"
						viewBox="0 0 20 20"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<circle cx="10" cy="10" r="3" />
						<path d="M10 1.5v2M10 16.5v2M18.5 10h-2M3.5 10h-2M15.95 4.05l-1.41 1.41M5.46 14.54l-1.41 1.41M15.95 15.95l-1.41-1.41M5.46 5.46L4.05 4.05" />
					</svg>
				</button>
			)}

			{/* Closed workspaces menu */}
			{closedWorkspaces.length > 0 && (
				<div ref={closedMenuRef} className="relative mr-2" style={{ WebkitAppRegion: 'no-drag' }}>
					<button
						type="button"
						onClick={() => setShowClosedMenu((v) => !v)}
						title="Reopen closed workspace"
						aria-label={`Reopen closed workspace (${closedWorkspaces.length} available)`}
						className="bg-transparent border border-edge text-content-muted cursor-pointer text-[11px] py-0.5 px-2 rounded-sm hover:text-content hover:border-content-muted focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
					>
						{closedWorkspaces.length} closed
					</button>
					{showClosedMenu && (
						<div className="ctx-menu top-full right-0 mt-1">
							{closedWorkspaces.map((ws) => (
								<button
									type="button"
									key={ws.id}
									className="ctx-item flex items-center gap-2"
									onClick={() => {
										openWorkspace(ws.id)
										setShowClosedMenu(false)
									}}
								>
									<span
										aria-hidden="true"
										className="w-2 h-2 rounded-full shrink-0"
										style={{ background: ws.color }}
									/>
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
