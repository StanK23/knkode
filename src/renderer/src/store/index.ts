import { v4 as uuid } from 'uuid'
import { create } from 'zustand'
import type {
	AppState,
	LayoutNode,
	LayoutPreset,
	PaneConfig,
	PaneTheme,
	Workspace,
	WorkspaceLayout,
} from '../../../shared/types'

function defaultTheme(): PaneTheme {
	return {
		background: '#1a1a2e',
		foreground: '#e0e0e0',
		fontSize: 14,
		opacity: 1.0,
	}
}

function createLayoutFromPreset(preset: LayoutPreset): {
	layout: WorkspaceLayout
	panes: Record<string, PaneConfig>
} {
	const home = process.env.HOME || '~'
	const makePaneConfig = (label: string): PaneConfig => ({
		label,
		cwd: home,
		startupCommand: null,
		themeOverride: null,
	})

	const panes: Record<string, PaneConfig> = {}
	let tree: LayoutNode

	switch (preset) {
		case 'single': {
			const id = uuid()
			panes[id] = makePaneConfig('terminal')
			tree = { paneId: id, size: 100 }
			break
		}
		case '2-column': {
			const left = uuid()
			const right = uuid()
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
			const top = uuid()
			const bottom = uuid()
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
			const main = uuid()
			const topRight = uuid()
			const bottomRight = uuid()
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
			const top = uuid()
			const bottomLeft = uuid()
			const bottomRight = uuid()
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
			const tl = uuid()
			const tr = uuid()
			const bl = uuid()
			const br = uuid()
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

const WORKSPACE_COLORS = [
	'#6c63ff',
	'#e74c3c',
	'#2ecc71',
	'#f39c12',
	'#3498db',
	'#9b59b6',
	'#1abc9c',
	'#e67e22',
]

interface StoreState {
	// Data
	workspaces: Workspace[]
	appState: AppState

	// UI state
	initialized: boolean

	// Actions
	init: () => Promise<void>
	createWorkspace: (name: string, color: string, preset: LayoutPreset) => Promise<Workspace>
	updateWorkspace: (workspace: Workspace) => Promise<void>
	removeWorkspace: (id: string) => Promise<void>
	setActiveWorkspace: (id: string) => void
	openWorkspace: (id: string) => void
	closeWorkspaceTab: (id: string) => void
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
	initialized: false,

	init: async () => {
		const [workspaces, appState] = await Promise.all([
			window.api.getWorkspaces(),
			window.api.getAppState(),
		])

		// If no workspaces exist, create a default one
		if (workspaces.length === 0) {
			const { layout, panes } = createLayoutFromPreset('single')
			const defaultWorkspace: Workspace = {
				id: uuid(),
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
		}

		set({ workspaces, appState, initialized: true })
	},

	createWorkspace: async (name, color, preset) => {
		const { layout, panes } = createLayoutFromPreset(preset)
		const workspace: Workspace = {
			id: uuid(),
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
		})

		return workspace
	},

	updateWorkspace: async (workspace) => {
		await window.api.saveWorkspace(workspace)
		set((state) => ({
			workspaces: state.workspaces.map((w) => (w.id === workspace.id ? workspace : w)),
		}))
	},

	removeWorkspace: async (id) => {
		await window.api.deleteWorkspace(id)
		const state = get()
		const newOpen = state.appState.openWorkspaceIds.filter((wid) => wid !== id)
		const newActive =
			state.appState.activeWorkspaceId === id
				? newOpen[0] || null
				: state.appState.activeWorkspaceId
		const newAppState = {
			...state.appState,
			openWorkspaceIds: newOpen,
			activeWorkspaceId: newActive,
		}
		await window.api.saveAppState(newAppState)
		set({
			workspaces: state.workspaces.filter((w) => w.id !== id),
			appState: newAppState,
		})
	},

	setActiveWorkspace: (id) => {
		set((state) => {
			const newAppState = { ...state.appState, activeWorkspaceId: id }
			window.api.saveAppState(newAppState)
			return { appState: newAppState }
		})
	},

	openWorkspace: (id) => {
		set((state) => {
			const open = state.appState.openWorkspaceIds
			if (open.includes(id)) {
				const newAppState = { ...state.appState, activeWorkspaceId: id }
				window.api.saveAppState(newAppState)
				return { appState: newAppState }
			}
			const newAppState = {
				...state.appState,
				openWorkspaceIds: [...open, id],
				activeWorkspaceId: id,
			}
			window.api.saveAppState(newAppState)
			return { appState: newAppState }
		})
	},

	closeWorkspaceTab: (id) => {
		set((state) => {
			const newOpen = state.appState.openWorkspaceIds.filter((wid) => wid !== id)
			const newActive =
				state.appState.activeWorkspaceId === id
					? newOpen[newOpen.length - 1] || null
					: state.appState.activeWorkspaceId
			const newAppState = {
				...state.appState,
				openWorkspaceIds: newOpen,
				activeWorkspaceId: newActive,
			}
			window.api.saveAppState(newAppState)
			return { appState: newAppState }
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
			window.api.saveWorkspace(updated)
			return {
				workspaces: state.workspaces.map((w) => (w.id === workspaceId ? updated : w)),
			}
		})
	},

	saveState: async () => {
		await window.api.saveAppState(get().appState)
	},
}))

export { WORKSPACE_COLORS, createLayoutFromPreset }
