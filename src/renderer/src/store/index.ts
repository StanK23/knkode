import { create } from 'zustand'
import type {
	AppState,
	LayoutNode,
	LayoutPreset,
	PaneConfig,
	PaneTheme,
	SplitDirection,
	Workspace,
	WorkspaceLayout,
} from '../../../shared/types'
import { DEFAULT_UNFOCUSED_DIM, isLayoutBranch } from '../../../shared/types'
import { THEME_PRESETS } from '../data/theme-presets'

function defaultTheme(): PaneTheme {
	return {
		background: THEME_PRESETS[0].background,
		foreground: THEME_PRESETS[0].foreground,
		fontSize: 14,
		unfocusedDim: DEFAULT_UNFOCUSED_DIM,
	}
}

function createLayoutFromPreset(
	preset: LayoutPreset,
	homeDir: string,
): {
	layout: WorkspaceLayout
	panes: Record<string, PaneConfig>
} {
	const makePaneConfig = (label: string): PaneConfig => ({
		label,
		cwd: homeDir,
		startupCommand: null,
		themeOverride: null,
	})

	const panes: Record<string, PaneConfig> = {}
	let tree: LayoutNode

	switch (preset) {
		case 'single': {
			const id = crypto.randomUUID()
			panes[id] = makePaneConfig('terminal')
			tree = { paneId: id, size: 100 }
			break
		}
		case '2-column': {
			const left = crypto.randomUUID()
			const right = crypto.randomUUID()
			panes[left] = makePaneConfig('left')
			panes[right] = makePaneConfig('right')
			tree = {
				direction: 'horizontal',
				size: 100,
				children: [
					{ paneId: left, size: 50 },
					{ paneId: right, size: 50 },
				],
			}
			break
		}
		case '2-row': {
			const top = crypto.randomUUID()
			const bottom = crypto.randomUUID()
			panes[top] = makePaneConfig('top')
			panes[bottom] = makePaneConfig('bottom')
			tree = {
				direction: 'vertical',
				size: 100,
				children: [
					{ paneId: top, size: 50 },
					{ paneId: bottom, size: 50 },
				],
			}
			break
		}
		case '3-panel-l': {
			const main = crypto.randomUUID()
			const topRight = crypto.randomUUID()
			const bottomRight = crypto.randomUUID()
			panes[main] = makePaneConfig('main')
			panes[topRight] = makePaneConfig('top-right')
			panes[bottomRight] = makePaneConfig('bottom-right')
			tree = {
				direction: 'horizontal',
				size: 100,
				children: [
					{ paneId: main, size: 60 },
					{
						direction: 'vertical',
						size: 40,
						children: [
							{ paneId: topRight, size: 50 },
							{ paneId: bottomRight, size: 50 },
						],
					},
				],
			}
			break
		}
		case '3-panel-t': {
			const top = crypto.randomUUID()
			const bottomLeft = crypto.randomUUID()
			const bottomRight = crypto.randomUUID()
			panes[top] = makePaneConfig('top')
			panes[bottomLeft] = makePaneConfig('bottom-left')
			panes[bottomRight] = makePaneConfig('bottom-right')
			tree = {
				direction: 'vertical',
				size: 100,
				children: [
					{ paneId: top, size: 60 },
					{
						direction: 'horizontal',
						size: 40,
						children: [
							{ paneId: bottomLeft, size: 50 },
							{ paneId: bottomRight, size: 50 },
						],
					},
				],
			}
			break
		}
		case '2x2-grid': {
			const tl = crypto.randomUUID()
			const tr = crypto.randomUUID()
			const bl = crypto.randomUUID()
			const br = crypto.randomUUID()
			panes[tl] = makePaneConfig('top-left')
			panes[tr] = makePaneConfig('top-right')
			panes[bl] = makePaneConfig('bottom-left')
			panes[br] = makePaneConfig('bottom-right')
			tree = {
				direction: 'vertical',
				size: 100,
				children: [
					{
						direction: 'horizontal',
						size: 50,
						children: [
							{ paneId: tl, size: 50 },
							{ paneId: tr, size: 50 },
						],
					},
					{
						direction: 'horizontal',
						size: 50,
						children: [
							{ paneId: bl, size: 50 },
							{ paneId: br, size: 50 },
						],
					},
				],
			}
			break
		}
	}

	return {
		layout: { type: 'preset', preset, tree },
		panes,
	}
}

function addToVisited(visited: string[], id: string): string[] {
	return visited.includes(id) ? visited : [...visited, id]
}

const WORKSPACE_COLORS = [
	'#6c63ff',
	'#e74c3c',
	'#2ecc71',
	'#f39c12',
	'#3498db',
	'#9b59b6',
	'#1abc9c',
	'#e67e22',
] as const

interface StoreState {
	// Data
	workspaces: Workspace[]
	appState: AppState
	homeDir: string

	// UI state
	initialized: boolean
	initError: string | null
	focusedPaneId: string | null
	focusGeneration: number
	/** Workspace IDs that have been activated at least once this session.
	 *  Used for lazy PTY loading — only visited workspaces render PaneAreas. */
	visitedWorkspaceIds: string[]
	/** Pane IDs for which a PTY has been requested or is running.
	 *  Prevents double-creation on Allotment remount.
	 *  IMPORTANT: Always create a new Set on mutation — Zustand uses reference equality. */
	activePtyIds: Set<string>

	// Actions
	setFocusedPane: (paneId: string | null) => void
	/** Ensure a PTY exists for the given pane. No-op if already requested or active. */
	ensurePty: (paneId: string, cwd: string, startupCommand: string | null) => void
	/** Kill PTYs for the given pane IDs and remove them from activePtyIds. */
	killPtys: (paneIds: string[]) => void
	/** Remove a single pane ID from activePtyIds (e.g. on natural PTY exit). */
	removePtyId: (paneId: string) => void
	init: () => Promise<void>
	createWorkspace: (name: string, color: string, preset: LayoutPreset) => Promise<Workspace>
	createDefaultWorkspace: () => Promise<Workspace>
	updateWorkspace: (workspace: Workspace) => Promise<void>
	duplicateWorkspace: (id: string) => Promise<Workspace | null>
	removeWorkspace: (id: string) => Promise<void>
	setActiveWorkspace: (id: string) => void
	openWorkspace: (id: string) => void
	closeWorkspaceTab: (id: string) => void
	/** Move the tab at fromIndex to toIndex within openWorkspaceIds (splice-remove then insert). */
	reorderWorkspaceTabs: (fromIndex: number, toIndex: number) => void
	splitPane: (workspaceId: string, paneId: string, direction: SplitDirection) => void
	closePane: (workspaceId: string, paneId: string) => void
	updatePaneConfig: (workspaceId: string, paneId: string, updates: Partial<PaneConfig>) => void
	updatePaneCwd: (workspaceId: string, paneId: string, cwd: string) => void
	saveState: () => Promise<void>
}

export const useStore = create<StoreState>((set, get) => ({
	workspaces: [],
	appState: {
		openWorkspaceIds: [],
		activeWorkspaceId: null,
		windowBounds: { x: 100, y: 100, width: 1200, height: 800 },
	},
	homeDir: '/tmp',
	initialized: false,
	initError: null,
	focusedPaneId: null,
	focusGeneration: 0,
	visitedWorkspaceIds: [],
	activePtyIds: new Set(),

	setFocusedPane: (paneId) =>
		set((state) => ({ focusedPaneId: paneId, focusGeneration: state.focusGeneration + 1 })),

	ensurePty: (paneId, cwd, startupCommand) => {
		const { activePtyIds } = get()
		if (activePtyIds.has(paneId)) return
		// Optimistically mark as active to prevent concurrent creation attempts
		const newSet = new Set(activePtyIds)
		newSet.add(paneId)
		set({ activePtyIds: newSet })
		window.api.createPty(paneId, cwd, startupCommand).catch((err) => {
			console.error(`[store] Failed to create PTY for pane ${paneId}:`, err)
			// Remove from active set on failure so retry is possible
			const current = get().activePtyIds
			if (current.has(paneId)) {
				const rollback = new Set(current)
				rollback.delete(paneId)
				set({ activePtyIds: rollback })
			}
		})
	},

	killPtys: (paneIds) => {
		for (const id of paneIds) {
			window.api.killPty(id).catch((err) => {
				console.warn(`[store] killPty failed for pane ${id}:`, err)
			})
		}
		const current = get().activePtyIds
		const newSet = new Set(current)
		let changed = false
		for (const id of paneIds) {
			if (newSet.delete(id)) changed = true
		}
		if (changed) set({ activePtyIds: newSet })
	},

	removePtyId: (paneId) => {
		const current = get().activePtyIds
		if (!current.has(paneId)) return
		const newSet = new Set(current)
		newSet.delete(paneId)
		set({ activePtyIds: newSet })
	},

	init: async () => {
		try {
			const [workspaces, appState, homeDir] = await Promise.all([
				window.api.getWorkspaces(),
				window.api.getAppState(),
				window.api.getHomeDir(),
			])

			// If no workspaces exist, create a default one
			if (workspaces.length === 0) {
				const { layout, panes } = createLayoutFromPreset('single', homeDir)
				const defaultWorkspace: Workspace = {
					id: crypto.randomUUID(),
					name: 'Default',
					color: WORKSPACE_COLORS[0],
					theme: defaultTheme(),
					layout,
					panes,
				}
				workspaces.push(defaultWorkspace)
				await window.api.saveWorkspace(defaultWorkspace)
				appState.openWorkspaceIds = [defaultWorkspace.id]
				appState.activeWorkspaceId = defaultWorkspace.id
				await window.api.saveAppState(appState)
			}

			// Ensure at least one tab is open
			if (appState.openWorkspaceIds.length === 0 && workspaces.length > 0) {
				appState.openWorkspaceIds = [workspaces[0].id]
				appState.activeWorkspaceId = workspaces[0].id
				await window.api.saveAppState(appState)
			}

			const initialVisited = appState.activeWorkspaceId ? [appState.activeWorkspaceId] : []
			const activeWs = workspaces.find((w) => w.id === appState.activeWorkspaceId)
			const initialFocusedPaneId = activeWs ? (Object.keys(activeWs.panes)[0] ?? null) : null
			set({
				workspaces,
				appState,
				homeDir,
				initialized: true,
				visitedWorkspaceIds: initialVisited,
				focusedPaneId: initialFocusedPaneId,
				focusGeneration: initialFocusedPaneId ? 1 : 0,
			})
		} catch (err) {
			console.error('[store] Failed to initialize:', err)
			set({ initError: String(err), initialized: true })
		}
	},

	createWorkspace: async (name, color, preset) => {
		const { layout, panes } = createLayoutFromPreset(preset, get().homeDir)
		const workspace: Workspace = {
			id: crypto.randomUUID(),
			name,
			color,
			theme: defaultTheme(),
			layout,
			panes,
		}
		await window.api.saveWorkspace(workspace)

		const state = get()
		const newAppState = {
			...state.appState,
			openWorkspaceIds: [...state.appState.openWorkspaceIds, workspace.id],
			activeWorkspaceId: workspace.id,
		}
		await window.api.saveAppState(newAppState)

		set({
			workspaces: [...state.workspaces, workspace],
			appState: newAppState,
			visitedWorkspaceIds: addToVisited(state.visitedWorkspaceIds, workspace.id),
		})

		return workspace
	},

	createDefaultWorkspace: async () => {
		const state = get()
		const colorIndex = state.workspaces.length % WORKSPACE_COLORS.length
		return state.createWorkspace(
			`Workspace ${state.workspaces.length + 1}`,
			WORKSPACE_COLORS[colorIndex],
			'single',
		)
	},

	updateWorkspace: async (workspace) => {
		await window.api.saveWorkspace(workspace)
		set((state) => ({
			workspaces: state.workspaces.map((w) => (w.id === workspace.id ? workspace : w)),
		}))
	},

	duplicateWorkspace: async (id) => {
		const state = get()
		const source = state.workspaces.find((w) => w.id === id)
		if (!source) return null

		// Remap all pane IDs to fresh UUIDs
		const idMap = new Map<string, string>()
		for (const paneId of Object.keys(source.panes)) {
			idMap.set(paneId, crypto.randomUUID())
		}
		const requireMapped = (oldId: string): string => {
			const newId = idMap.get(oldId)
			if (!newId) throw new Error(`[store] duplicateWorkspace: unmapped pane ID "${oldId}"`)
			return newId
		}
		const newPanes: Record<string, PaneConfig> = {}
		for (const [oldId, config] of Object.entries(source.panes)) {
			newPanes[requireMapped(oldId)] = {
				...config,
				themeOverride: config.themeOverride ? { ...config.themeOverride } : null,
			}
		}
		const remappedTree = remapLayoutTree(source.layout.tree, requireMapped)
		const workspace: Workspace = {
			id: crypto.randomUUID(),
			name: `${source.name} (copy)`,
			color: source.color,
			theme: { ...source.theme },
			layout:
				source.layout.type === 'preset'
					? { type: 'preset', preset: source.layout.preset, tree: remappedTree }
					: { type: 'custom', tree: remappedTree },
			panes: newPanes,
		}
		await window.api.saveWorkspace(workspace)
		const newAppState = {
			...state.appState,
			openWorkspaceIds: [...state.appState.openWorkspaceIds, workspace.id],
			activeWorkspaceId: workspace.id,
		}
		await window.api.saveAppState(newAppState)
		set({
			workspaces: [...state.workspaces, workspace],
			appState: newAppState,
			visitedWorkspaceIds: addToVisited(state.visitedWorkspaceIds, workspace.id),
		})
		return workspace
	},

	removeWorkspace: async (id) => {
		const state = get()
		const workspace = state.workspaces.find((w) => w.id === id)
		// Kill PTYs before state update to avoid orphaned processes
		if (workspace) {
			get().killPtys(Object.keys(workspace.panes))
		}
		await window.api.deleteWorkspace(id)
		// Re-read state after awaits to avoid stale references
		const current = get()
		const newOpen = current.appState.openWorkspaceIds.filter((wid) => wid !== id)
		const newActive =
			current.appState.activeWorkspaceId === id
				? (newOpen[0] ?? null)
				: current.appState.activeWorkspaceId
		const newAppState = {
			...current.appState,
			openWorkspaceIds: newOpen,
			activeWorkspaceId: newActive,
		}
		await window.api.saveAppState(newAppState)
		set({
			workspaces: get().workspaces.filter((w) => w.id !== id),
			appState: newAppState,
			visitedWorkspaceIds: get().visitedWorkspaceIds.filter((wid) => wid !== id),
		})
	},

	setActiveWorkspace: (id) => {
		set((state) => {
			const newAppState = { ...state.appState, activeWorkspaceId: id }
			window.api.saveAppState(newAppState).catch((err) => {
				console.error('[store] Failed to save app state:', err)
			})
			const ws = state.workspaces.find((w) => w.id === id)
			const firstPaneId = ws ? (Object.keys(ws.panes)[0] ?? null) : null
			return {
				appState: newAppState,
				focusedPaneId: firstPaneId,
				focusGeneration: state.focusGeneration + 1,
				visitedWorkspaceIds: addToVisited(state.visitedWorkspaceIds, id),
			}
		})
	},

	openWorkspace: (id) => {
		set((state) => {
			const open = state.appState.openWorkspaceIds
			const visited = addToVisited(state.visitedWorkspaceIds, id)
			if (open.includes(id)) {
				const newAppState = { ...state.appState, activeWorkspaceId: id }
				window.api.saveAppState(newAppState).catch((err) => {
					console.error('[store] Failed to save app state:', err)
				})
				return { appState: newAppState, visitedWorkspaceIds: visited }
			}
			const newAppState = {
				...state.appState,
				openWorkspaceIds: [...open, id],
				activeWorkspaceId: id,
			}
			window.api.saveAppState(newAppState).catch((err) => {
				console.error('[store] Failed to save app state:', err)
			})
			return { appState: newAppState, visitedWorkspaceIds: visited }
		})
	},

	closeWorkspaceTab: (id) => {
		// Kill PTYs before state update to avoid orphaned processes
		const workspace = get().workspaces.find((w) => w.id === id)
		if (workspace) {
			get().killPtys(Object.keys(workspace.panes))
		}
		set((state) => {
			const newOpen = state.appState.openWorkspaceIds.filter((wid) => wid !== id)
			const newActive =
				state.appState.activeWorkspaceId === id
					? (newOpen[newOpen.length - 1] ?? null)
					: state.appState.activeWorkspaceId
			const newAppState = {
				...state.appState,
				openWorkspaceIds: newOpen,
				activeWorkspaceId: newActive,
			}
			window.api.saveAppState(newAppState).catch((err) => {
				console.error('[store] Failed to save app state:', err)
			})
			const newVisited = state.visitedWorkspaceIds.filter((wid) => wid !== id)
			// Ensure the fallback active workspace is visited so its PaneArea renders
			if (newActive && !newVisited.includes(newActive)) {
				newVisited.push(newActive)
			}
			return { appState: newAppState, visitedWorkspaceIds: newVisited }
		})
	},

	reorderWorkspaceTabs: (fromIndex, toIndex) => {
		set((state) => {
			const ids = [...state.appState.openWorkspaceIds]
			if (fromIndex < 0 || fromIndex >= ids.length || toIndex < 0 || toIndex >= ids.length) {
				console.warn('[store] reorderWorkspaceTabs: index out of range', {
					fromIndex,
					toIndex,
					length: ids.length,
				})
				return state
			}
			if (fromIndex === toIndex) return state
			const [moved] = ids.splice(fromIndex, 1)
			if (!moved) return state
			ids.splice(toIndex, 0, moved)
			const newAppState = { ...state.appState, openWorkspaceIds: ids }
			window.api.saveAppState(newAppState).catch((err) => {
				console.error('[store] Failed to save app state:', err)
			})
			return { appState: newAppState }
		})
	},

	splitPane: (workspaceId, paneId, direction) => {
		set((state) => {
			const workspace = state.workspaces.find((w) => w.id === workspaceId)
			if (!workspace?.panes[paneId]) return state

			const newPaneId = crypto.randomUUID()
			const newPane: PaneConfig = {
				label: 'terminal',
				cwd: workspace.panes[paneId].cwd,
				startupCommand: null,
				themeOverride: null,
			}

			// Walk layout tree; when the target leaf is found, replace it with a
			// branch containing the original pane and a new sibling at 50/50.
			const replaceInTree = (node: LayoutNode): LayoutNode => {
				if (isLayoutBranch(node)) {
					return { ...node, children: node.children.map(replaceInTree) }
				}
				if (node.paneId === paneId) {
					return {
						direction,
						size: node.size,
						children: [
							{ paneId, size: 50 },
							{ paneId: newPaneId, size: 50 },
						],
					}
				}
				return node
			}

			const updated = {
				...workspace,
				layout: { type: 'custom' as const, tree: replaceInTree(workspace.layout.tree) },
				panes: { ...workspace.panes, [newPaneId]: newPane },
			}
			window.api.saveWorkspace(updated).catch((err) => {
				console.error('[store] Failed to save workspace:', err)
			})
			return {
				workspaces: state.workspaces.map((w) => (w.id === workspaceId ? updated : w)),
				focusedPaneId: newPaneId,
				focusGeneration: state.focusGeneration + 1,
			}
		})
	},

	closePane: (workspaceId, paneId) => {
		// Kill PTY before state update to avoid orphaned processes
		const ws = get().workspaces.find((w) => w.id === workspaceId)
		if (!ws || Object.keys(ws.panes).length <= 1) return
		get().killPtys([paneId])

		set((state) => {
			const workspace = state.workspaces.find((w) => w.id === workspaceId)
			if (!workspace) return state
			if (Object.keys(workspace.panes).length <= 1) return state

			// Remove pane from tree. If a branch is left with one child, collapse
			// it upward (promote the child, preserving the parent's size).
			const removeFromTree = (node: LayoutNode): LayoutNode | null => {
				if (!isLayoutBranch(node)) {
					return node.paneId === paneId ? null : node
				}
				const remaining = node.children
					.map(removeFromTree)
					.filter((n): n is LayoutNode => n !== null)
				if (remaining.length === 0) return null
				if (remaining.length === 1) return { ...remaining[0], size: node.size }
				return { ...node, children: remaining }
			}

			const newTree = removeFromTree(workspace.layout.tree)
			if (!newTree) return state

			const { [paneId]: _, ...remainingPanes } = workspace.panes
			const updated = {
				...workspace,
				layout: { type: 'custom' as const, tree: newTree },
				panes: remainingPanes,
			}
			window.api.saveWorkspace(updated).catch((err) => {
				console.error('[store] Failed to save workspace:', err)
			})
			return {
				workspaces: state.workspaces.map((w) => (w.id === workspaceId ? updated : w)),
				focusedPaneId: state.focusedPaneId === paneId ? null : state.focusedPaneId,
			}
		})
	},

	updatePaneConfig: (workspaceId, paneId, updates) => {
		set((state) => {
			const workspace = state.workspaces.find((w) => w.id === workspaceId)
			if (!workspace || !workspace.panes[paneId]) return state
			const updated = {
				...workspace,
				panes: {
					...workspace.panes,
					[paneId]: { ...workspace.panes[paneId], ...updates },
				},
			}
			window.api.saveWorkspace(updated).catch((err) => {
				console.error('[store] Failed to save workspace:', err)
			})
			return {
				workspaces: state.workspaces.map((w) => (w.id === workspaceId ? updated : w)),
			}
		})
	},

	updatePaneCwd: (workspaceId, paneId, cwd) => {
		set((state) => {
			const workspace = state.workspaces.find((w) => w.id === workspaceId)
			if (!workspace || !workspace.panes[paneId]) return state
			const updated = {
				...workspace,
				panes: {
					...workspace.panes,
					[paneId]: { ...workspace.panes[paneId], cwd },
				},
			}
			window.api.saveWorkspace(updated).catch((err) => {
				console.error('[store] Failed to save workspace:', err)
			})
			return {
				workspaces: state.workspaces.map((w) => (w.id === workspaceId ? updated : w)),
			}
		})
	},

	saveState: async () => {
		await window.api.saveAppState(get().appState)
	},
}))

/** Get pane IDs in depth-first, left-child-first order
 *  (left-to-right for horizontal splits, top-to-bottom for vertical). */
function getPaneIdsInOrder(node: LayoutNode): string[] {
	if (!isLayoutBranch(node)) return [node.paneId]
	return node.children.flatMap(getPaneIdsInOrder)
}

/** Walk a layout tree and remap every leaf's paneId via the given function. */
function remapLayoutTree(node: LayoutNode, mapId: (id: string) => string): LayoutNode {
	if (isLayoutBranch(node)) {
		return { ...node, children: node.children.map((c) => remapLayoutTree(c, mapId)) }
	}
	return { ...node, paneId: mapId(node.paneId) }
}

/** Apply a layout preset while preserving existing panes by position.
 *  - Same slot count: 1:1 remap, all PTYs survive.
 *  - Fewer slots: first N panes kept, excess returned in `killedPaneIds`.
 *  - More slots: existing panes fill first slots, fresh empty panes fill the rest. */
function applyPresetWithRemap(
	workspace: Workspace,
	preset: LayoutPreset,
	homeDir: string,
): {
	layout: WorkspaceLayout
	panes: Record<string, PaneConfig>
	killedPaneIds: string[]
} {
	const existingIds = getPaneIdsInOrder(workspace.layout.tree)
	const { layout: freshLayout, panes: freshPanes } = createLayoutFromPreset(preset, homeDir)
	const freshIds = getPaneIdsInOrder(freshLayout.tree)

	const idMap = new Map<string, string>()
	const panes: Record<string, PaneConfig> = {}
	const killedPaneIds: string[] = []

	for (let i = 0; i < freshIds.length; i++) {
		if (i < existingIds.length) {
			const config = workspace.panes[existingIds[i]]
			if (!config) throw new Error(`[applyPresetWithRemap] missing pane config for "${existingIds[i]}"`)
			idMap.set(freshIds[i], existingIds[i])
			panes[existingIds[i]] = config
		} else {
			idMap.set(freshIds[i], freshIds[i])
			panes[freshIds[i]] = freshPanes[freshIds[i]]
		}
	}

	for (let i = freshIds.length; i < existingIds.length; i++) {
		killedPaneIds.push(existingIds[i])
	}

	const requireMapped = (id: string): string => {
		const mapped = idMap.get(id)
		if (!mapped) throw new Error(`[applyPresetWithRemap] unmapped pane ID "${id}"`)
		return mapped
	}

	return {
		layout: { type: 'preset', preset, tree: remapLayoutTree(freshLayout.tree, requireMapped) },
		panes,
		killedPaneIds,
	}
}

export { WORKSPACE_COLORS, applyPresetWithRemap, createLayoutFromPreset, getPaneIdsInOrder }
