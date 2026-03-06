import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppState, PaneTheme, Workspace } from '../../../shared/types'
import { DEFAULT_UNFOCUSED_DIM, isLayoutBranch } from '../../../shared/types'
import { createLayoutFromPreset, getEffectiveCwd, getPaneIdsInOrder, useStore } from './index'

const TEST_THEME: PaneTheme = {
	background: '#000',
	foreground: '#fff',
	fontSize: 14,
	unfocusedDim: DEFAULT_UNFOCUSED_DIM,
}
const TEST_BOUNDS = { x: 0, y: 0, width: 1200, height: 800 }

// Mock window.api — defineProperty is needed because jsdom
// defines window as non-configurable on globalThis.
// Typed to match KnkodeApi from preload (manual sync required).
const mockApi = {
	getWorkspaces: vi.fn<() => Promise<Workspace[]>>(),
	getAppState: vi.fn<() => Promise<AppState>>(),
	getHomeDir: vi.fn<() => Promise<string>>(),
	saveWorkspace: vi.fn<(ws: Workspace) => Promise<void>>(),
	saveAppState: vi.fn<(state: AppState) => Promise<void>>(),
	deleteWorkspace: vi.fn<(id: string) => Promise<void>>(),
	createPty: vi.fn<(id: string, cwd: string, startupCommand: string | null) => Promise<void>>(),
	writePty: vi.fn<(id: string, data: string) => Promise<void>>(),
	resizePty: vi.fn<(id: string, cols: number, rows: number) => Promise<void>>(),
	killPty: vi.fn<(id: string) => Promise<void>>(),
	getSnippets: vi.fn<() => Promise<[]>>(),
	saveSnippets: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
	onPtyData: vi.fn(() => () => {}),
	onPtyExit: vi.fn(() => () => {}),
	onPtyCwdChanged: vi.fn(() => () => {}),
	getPtyProcessInfo: vi.fn<(id: string) => Promise<null>>().mockResolvedValue(null),
	onPtyProcessChanged: vi.fn(() => () => {}),
	openExternal: vi.fn<(url: string) => Promise<void>>(),
	pickFolder: vi.fn<() => Promise<string | null>>().mockResolvedValue(null),
}

Object.defineProperty(window, 'api', {
	value: mockApi,
	writable: true,
	configurable: true,
})

let uuidCounter = 0
vi.stubGlobal('crypto', {
	randomUUID: () => `uuid-${++uuidCounter}`,
})

function makeWorkspace(overrides?: Partial<Workspace>): Workspace {
	return {
		id: 'ws-1',
		name: 'Test',
		color: '#fff',
		theme: TEST_THEME,
		layout: { type: 'preset', preset: 'single', tree: { paneId: 'p1', size: 100 } },
		panes: { p1: { label: 'term', cwd: '/home', startupCommand: null, themeOverride: null } },
		...overrides,
	}
}

function resetStore() {
	useStore.setState({
		workspaces: [],
		appState: {
			openWorkspaceIds: [],
			activeWorkspaceId: null,
			windowBounds: TEST_BOUNDS,
		},
		homeDir: '/home',
		initialized: false,
		initError: null,
		focusedPaneId: null,
		focusGeneration: 0,
		visitedWorkspaceIds: [],
		activePtyIds: new Set(),
		paneAgentTypes: new Map(),
		paneProcessNames: new Map(),
		altScreenPaneIds: new Set(),
		paneAgentStartTimes: new Map(),
		paneAgentBlocks: new Map(),
		collapsedBlockIds: new Map(),
	})
}

beforeEach(() => {
	vi.clearAllMocks()
	uuidCounter = 0
	mockApi.saveWorkspace.mockResolvedValue(undefined)
	mockApi.saveAppState.mockResolvedValue(undefined)
	mockApi.deleteWorkspace.mockResolvedValue(undefined)
	mockApi.killPty.mockResolvedValue(undefined)
	mockApi.createPty.mockResolvedValue(undefined)
	mockApi.getSnippets.mockResolvedValue([])
	resetStore()
})

describe('createLayoutFromPreset', () => {
	it('creates a single-pane layout', () => {
		const { layout, panes } = createLayoutFromPreset('single', '/home')
		expect(layout.type).toBe('preset')
		expect(Object.keys(panes)).toHaveLength(1)
		const paneId = Object.keys(panes)[0]
		expect(panes[paneId].cwd).toBe('/home')
		expect(isLayoutBranch(layout.tree)).toBe(false)
	})

	it('creates a 2-column layout', () => {
		const { layout, panes } = createLayoutFromPreset('2-column', '/home')
		expect(Object.keys(panes)).toHaveLength(2)
		expect(isLayoutBranch(layout.tree)).toBe(true)
		if (isLayoutBranch(layout.tree)) {
			expect(layout.tree.direction).toBe('horizontal')
			expect(layout.tree.children).toHaveLength(2)
		}
	})

	it('creates a 2-row layout', () => {
		const { layout, panes } = createLayoutFromPreset('2-row', '/home')
		expect(Object.keys(panes)).toHaveLength(2)
		expect(isLayoutBranch(layout.tree)).toBe(true)
		if (isLayoutBranch(layout.tree)) {
			expect(layout.tree.direction).toBe('vertical')
		}
	})

	it('creates a 3-panel-l layout', () => {
		const { panes } = createLayoutFromPreset('3-panel-l', '/home')
		expect(Object.keys(panes)).toHaveLength(3)
	})

	it('creates a 3-panel-t layout', () => {
		const { panes } = createLayoutFromPreset('3-panel-t', '/home')
		expect(Object.keys(panes)).toHaveLength(3)
	})

	it('creates a 2x2-grid layout', () => {
		const { panes } = createLayoutFromPreset('2x2-grid', '/home')
		expect(Object.keys(panes)).toHaveLength(4)
	})

	it('sets cwd on all panes from homeDir', () => {
		const { panes } = createLayoutFromPreset('2x2-grid', '/custom/path')
		for (const pane of Object.values(panes)) {
			expect(pane.cwd).toBe('/custom/path')
		}
	})
})

describe('getPaneIdsInOrder', () => {
	it('returns single pane id for leaf', () => {
		expect(getPaneIdsInOrder({ paneId: 'a', size: 100 })).toEqual(['a'])
	})

	it('returns ids in depth-first order for branch', () => {
		const tree = {
			direction: 'horizontal',
			size: 100,
			children: [
				{ paneId: 'left', size: 50 },
				{
					direction: 'vertical',
					size: 50,
					children: [
						{ paneId: 'top-right', size: 50 },
						{ paneId: 'bottom-right', size: 50 },
					],
				},
			],
		}
		expect(getPaneIdsInOrder(tree as never)).toEqual(['left', 'top-right', 'bottom-right'])
	})
})

describe('store init', () => {
	it('loads workspaces and app state', async () => {
		const ws = makeWorkspace()
		const appState: AppState = {
			openWorkspaceIds: ['ws-1'],
			activeWorkspaceId: 'ws-1',
			windowBounds: TEST_BOUNDS,
		}
		mockApi.getWorkspaces.mockResolvedValue([ws])
		mockApi.getAppState.mockResolvedValue(appState)
		mockApi.getHomeDir.mockResolvedValue('/home')

		await useStore.getState().init()

		const state = useStore.getState()
		expect(state.initialized).toBe(true)
		expect(state.workspaces).toHaveLength(1)
		expect(state.appState.activeWorkspaceId).toBe('ws-1')
	})

	it('creates a default workspace when none exist', async () => {
		mockApi.getWorkspaces.mockResolvedValue([])
		mockApi.getAppState.mockResolvedValue({
			openWorkspaceIds: [],
			activeWorkspaceId: null,
			windowBounds: TEST_BOUNDS,
		})
		mockApi.getHomeDir.mockResolvedValue('/home')

		await useStore.getState().init()

		const state = useStore.getState()
		expect(state.workspaces).toHaveLength(1)
		expect(state.workspaces[0].name).toBe('Default')
		expect(mockApi.saveWorkspace).toHaveBeenCalled()
		expect(mockApi.saveAppState).toHaveBeenCalled()
	})

	it('opens first workspace when openWorkspaceIds is empty but workspaces exist', async () => {
		const ws = makeWorkspace()
		mockApi.getWorkspaces.mockResolvedValue([ws])
		mockApi.getAppState.mockResolvedValue({
			openWorkspaceIds: [],
			activeWorkspaceId: null,
			windowBounds: TEST_BOUNDS,
		})
		mockApi.getHomeDir.mockResolvedValue('/home')

		await useStore.getState().init()

		const state = useStore.getState()
		expect(state.appState.openWorkspaceIds).toEqual(['ws-1'])
		expect(state.appState.activeWorkspaceId).toBe('ws-1')
		expect(mockApi.saveAppState).toHaveBeenCalled()
	})

	it('sets initError on failure', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})
		mockApi.getWorkspaces.mockRejectedValue(new Error('disk error'))

		await useStore.getState().init()

		const state = useStore.getState()
		expect(state.initialized).toBe(true)
		expect(state.initError).toContain('disk error')
		expect(console.error).toHaveBeenCalled()
		vi.restoreAllMocks()
	})
})

describe('store workspace CRUD', () => {
	it('creates a workspace', async () => {
		useStore.setState({ homeDir: '/home' })
		const ws = await useStore.getState().createWorkspace('New', '#ff0000', 'single')

		expect(ws.name).toBe('New')
		expect(ws.color).toBe('#ff0000')
		expect(mockApi.saveWorkspace).toHaveBeenCalledWith(ws)
		expect(useStore.getState().workspaces).toContainEqual(ws)
		expect(useStore.getState().appState.activeWorkspaceId).toBe(ws.id)
	})

	it('creates a default workspace with auto-incrementing name', async () => {
		useStore.setState({ homeDir: '/home' })
		const ws = await useStore.getState().createDefaultWorkspace()
		expect(ws.name).toBe('Workspace 1')
	})

	it('updates a workspace', async () => {
		const ws = makeWorkspace({ name: 'Original' })
		useStore.setState({ workspaces: [ws] })

		const updated = { ...ws, name: 'Updated' }
		await useStore.getState().updateWorkspace(updated)

		expect(useStore.getState().workspaces[0].name).toBe('Updated')
		expect(mockApi.saveWorkspace).toHaveBeenCalledWith(updated)
	})

	it('removes a workspace', async () => {
		const ws = makeWorkspace()
		useStore.setState({
			workspaces: [ws],
			appState: {
				openWorkspaceIds: ['ws-1'],
				activeWorkspaceId: 'ws-1',
				windowBounds: TEST_BOUNDS,
			},
		})

		await useStore.getState().removeWorkspace('ws-1')

		expect(useStore.getState().workspaces).toHaveLength(0)
		expect(useStore.getState().appState.openWorkspaceIds).toHaveLength(0)
		expect(mockApi.deleteWorkspace).toHaveBeenCalledWith('ws-1')
	})

	it('propagates error when saveWorkspace rejects', async () => {
		useStore.setState({ homeDir: '/home' })
		mockApi.saveWorkspace.mockRejectedValue(new Error('write failed'))

		await expect(useStore.getState().createWorkspace('Bad', '#000', 'single')).rejects.toThrow(
			'write failed',
		)
	})
})

describe('store tab management', () => {
	const makeState = () => ({
		workspaces: [],
		appState: {
			openWorkspaceIds: ['a', 'b', 'c'],
			activeWorkspaceId: 'b',
			windowBounds: TEST_BOUNDS,
		} as AppState,
	})

	it('sets active workspace', () => {
		useStore.setState(makeState())
		useStore.getState().setActiveWorkspace('c')
		expect(useStore.getState().appState.activeWorkspaceId).toBe('c')
		expect(useStore.getState().focusedPaneId).toBeNull()
	})

	it('closes a workspace tab and activates last remaining', () => {
		useStore.setState(makeState())
		useStore.getState().closeWorkspaceTab('b')
		const state = useStore.getState()
		expect(state.appState.openWorkspaceIds).toEqual(['a', 'c'])
		expect(state.appState.activeWorkspaceId).toBe('c')
	})

	it('closes non-active tab without changing active', () => {
		useStore.setState(makeState())
		useStore.getState().closeWorkspaceTab('a')
		expect(useStore.getState().appState.activeWorkspaceId).toBe('b')
	})

	it('opens a previously closed workspace', () => {
		useStore.setState(makeState())
		useStore.getState().openWorkspace('new-ws')
		const state = useStore.getState()
		expect(state.appState.openWorkspaceIds).toContain('new-ws')
		expect(state.appState.activeWorkspaceId).toBe('new-ws')
	})

	it('opens already-open workspace just activates it', () => {
		useStore.setState(makeState())
		useStore.getState().openWorkspace('a')
		expect(useStore.getState().appState.activeWorkspaceId).toBe('a')
		expect(useStore.getState().appState.openWorkspaceIds).toEqual(['a', 'b', 'c'])
	})
})

describe('store reorderWorkspaceTabs', () => {
	beforeEach(() => {
		useStore.setState({
			appState: {
				openWorkspaceIds: ['a', 'b', 'c', 'd'],
				activeWorkspaceId: 'a',
				windowBounds: TEST_BOUNDS,
			},
		})
	})

	it('moves a tab forward', () => {
		useStore.getState().reorderWorkspaceTabs(0, 2)
		expect(useStore.getState().appState.openWorkspaceIds).toEqual(['b', 'c', 'a', 'd'])
	})

	it('moves a tab backward', () => {
		useStore.getState().reorderWorkspaceTabs(3, 1)
		expect(useStore.getState().appState.openWorkspaceIds).toEqual(['a', 'd', 'b', 'c'])
	})

	it('no-ops for same index', () => {
		useStore.getState().reorderWorkspaceTabs(1, 1)
		expect(useStore.getState().appState.openWorkspaceIds).toEqual(['a', 'b', 'c', 'd'])
		expect(mockApi.saveAppState).not.toHaveBeenCalled()
	})

	it('no-ops for out-of-range indices', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {})
		useStore.getState().reorderWorkspaceTabs(-1, 2)
		expect(useStore.getState().appState.openWorkspaceIds).toEqual(['a', 'b', 'c', 'd'])
		expect(mockApi.saveAppState).not.toHaveBeenCalled()
		expect(console.warn).toHaveBeenCalled()
		vi.restoreAllMocks()
	})

	it('persists to app state', () => {
		useStore.getState().reorderWorkspaceTabs(0, 3)
		expect(mockApi.saveAppState).toHaveBeenCalled()
	})
})

describe('store reorderSnippets', () => {
	beforeEach(() => {
		useStore.setState({
			snippets: [
				{ id: 'a', name: 'Alpha', command: 'echo a' },
				{ id: 'b', name: 'Beta', command: 'echo b' },
				{ id: 'c', name: 'Charlie', command: 'echo c' },
				{ id: 'd', name: 'Delta', command: 'echo d' },
			],
		})
		mockApi.saveSnippets.mockClear()
	})

	it('moves a snippet forward', () => {
		useStore.getState().reorderSnippets(0, 2)
		expect(useStore.getState().snippets.map((s) => s.id)).toEqual(['b', 'c', 'a', 'd'])
	})

	it('moves a snippet backward', () => {
		useStore.getState().reorderSnippets(3, 1)
		expect(useStore.getState().snippets.map((s) => s.id)).toEqual(['a', 'd', 'b', 'c'])
	})

	it('no-ops for same index', () => {
		useStore.getState().reorderSnippets(1, 1)
		expect(useStore.getState().snippets.map((s) => s.id)).toEqual(['a', 'b', 'c', 'd'])
		expect(mockApi.saveSnippets).not.toHaveBeenCalled()
	})

	it('no-ops for out-of-range indices', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {})
		useStore.getState().reorderSnippets(-1, 2)
		expect(useStore.getState().snippets.map((s) => s.id)).toEqual(['a', 'b', 'c', 'd'])
		expect(mockApi.saveSnippets).not.toHaveBeenCalled()
		expect(console.warn).toHaveBeenCalled()
		vi.restoreAllMocks()
	})

	it('persists after reorder', () => {
		useStore.getState().reorderSnippets(0, 3)
		expect(mockApi.saveSnippets).toHaveBeenCalled()
	})
})

describe('store pane focus', () => {
	it('sets focused pane and increments generation', () => {
		expect(useStore.getState().focusGeneration).toBe(0)
		useStore.getState().setFocusedPane('pane-1')
		expect(useStore.getState().focusedPaneId).toBe('pane-1')
		expect(useStore.getState().focusGeneration).toBe(1)
	})

	it('increments generation on each call', () => {
		useStore.getState().setFocusedPane('pane-1')
		useStore.getState().setFocusedPane('pane-1')
		expect(useStore.getState().focusGeneration).toBe(2)
	})

	it('can clear focus with null', () => {
		useStore.getState().setFocusedPane('pane-1')
		useStore.getState().setFocusedPane(null)
		expect(useStore.getState().focusedPaneId).toBeNull()
	})
})

describe('store splitPane', () => {
	it('splits a pane vertically', () => {
		useStore.setState({ workspaces: [makeWorkspace()] })
		useStore.getState().splitPane('ws-1', 'p1', 'vertical')

		const ws = useStore.getState().workspaces[0]
		expect(Object.keys(ws.panes)).toHaveLength(2)
		expect(isLayoutBranch(ws.layout.tree)).toBe(true)
		if (isLayoutBranch(ws.layout.tree)) {
			expect(ws.layout.tree.direction).toBe('vertical')
			expect(ws.layout.tree.children).toHaveLength(2)
		}
	})

	it('focuses the new pane after split', () => {
		useStore.setState({ workspaces: [makeWorkspace()] })
		useStore.getState().splitPane('ws-1', 'p1', 'horizontal')

		const state = useStore.getState()
		expect(state.focusedPaneId).not.toBe('p1')
		expect(state.focusedPaneId).toBeTruthy()
		expect(state.focusGeneration).toBe(1)
	})

	it('inherits cwd from source pane', () => {
		useStore.setState({ workspaces: [makeWorkspace()] })
		useStore.getState().splitPane('ws-1', 'p1', 'vertical')

		const ws = useStore.getState().workspaces[0]
		const newPaneId = Object.keys(ws.panes).find((id) => id !== 'p1')
		expect(newPaneId).toBeDefined()
		if (!newPaneId) throw new Error('unreachable')
		expect(ws.panes[newPaneId].cwd).toBe('/home')
	})

	it('no-ops for non-existent pane', () => {
		useStore.setState({ workspaces: [makeWorkspace()] })
		useStore.getState().splitPane('ws-1', 'nonexistent', 'vertical')
		expect(Object.keys(useStore.getState().workspaces[0].panes)).toHaveLength(1)
	})
})

describe('store closePane', () => {
	const makeTwoPaneWs = () =>
		makeWorkspace({
			layout: {
				type: 'custom',
				tree: {
					direction: 'horizontal',
					size: 100,
					children: [
						{ paneId: 'p1', size: 50 },
						{ paneId: 'p2', size: 50 },
					],
				},
			},
			panes: {
				p1: { label: 'left', cwd: '/', startupCommand: null, themeOverride: null },
				p2: { label: 'right', cwd: '/', startupCommand: null, themeOverride: null },
			},
		})

	it('closes a pane and collapses the branch', () => {
		useStore.setState({ workspaces: [makeTwoPaneWs()] })
		useStore.getState().closePane('ws-1', 'p1')

		const ws = useStore.getState().workspaces[0]
		expect(Object.keys(ws.panes)).toHaveLength(1)
		expect(ws.panes.p2).toBeDefined()
		// Branch should collapse to leaf
		expect(isLayoutBranch(ws.layout.tree)).toBe(false)
	})

	it('does not close the last pane', () => {
		const ws = makeWorkspace()
		useStore.setState({ workspaces: [ws] })

		useStore.getState().closePane('ws-1', 'p1')
		expect(Object.keys(useStore.getState().workspaces[0].panes)).toHaveLength(1)
	})

	it('clears focus if closed pane was focused', () => {
		useStore.setState({ workspaces: [makeTwoPaneWs()], focusedPaneId: 'p1' })
		useStore.getState().closePane('ws-1', 'p1')
		expect(useStore.getState().focusedPaneId).toBeNull()
	})

	it('preserves focus if different pane closed', () => {
		useStore.setState({ workspaces: [makeTwoPaneWs()], focusedPaneId: 'p2' })
		useStore.getState().closePane('ws-1', 'p1')
		expect(useStore.getState().focusedPaneId).toBe('p2')
	})
})

describe('store pane config', () => {
	it('updates pane label', () => {
		useStore.setState({ workspaces: [makeWorkspace()] })
		useStore.getState().updatePaneConfig('ws-1', 'p1', { label: 'renamed' })
		expect(useStore.getState().workspaces[0].panes.p1.label).toBe('renamed')
	})

	it('updates pane cwd', () => {
		useStore.setState({ workspaces: [makeWorkspace()] })
		useStore.getState().updatePaneCwd('ws-1', 'p1', '/new/path')
		expect(useStore.getState().workspaces[0].panes.p1.cwd).toBe('/new/path')
	})

	it('no-ops for non-existent pane', () => {
		useStore.setState({ workspaces: [makeWorkspace()] })
		useStore.getState().updatePaneConfig('ws-1', 'nonexistent', { label: 'test' })
		expect(useStore.getState().workspaces[0].panes.p1.label).toBe('term')
	})
})

describe('store visitedWorkspaceIds', () => {
	it('init adds activeWorkspaceId to visited', async () => {
		const ws = makeWorkspace()
		mockApi.getWorkspaces.mockResolvedValue([ws])
		mockApi.getAppState.mockResolvedValue({
			openWorkspaceIds: ['ws-1'],
			activeWorkspaceId: 'ws-1',
			windowBounds: TEST_BOUNDS,
		})
		mockApi.getHomeDir.mockResolvedValue('/home')

		await useStore.getState().init()

		expect(useStore.getState().visitedWorkspaceIds).toEqual(['ws-1'])
	})

	it('init with no workspaces creates default and adds to visited', async () => {
		mockApi.getWorkspaces.mockResolvedValue([])
		mockApi.getAppState.mockResolvedValue({
			openWorkspaceIds: [],
			activeWorkspaceId: null,
			windowBounds: TEST_BOUNDS,
		})
		mockApi.getHomeDir.mockResolvedValue('/home')

		await useStore.getState().init()

		// A default workspace is created and becomes active
		const state = useStore.getState()
		expect(state.visitedWorkspaceIds).toHaveLength(1)
		expect(state.visitedWorkspaceIds[0]).toBe(state.appState.activeWorkspaceId)
	})

	it('setActiveWorkspace adds to visited', () => {
		useStore.setState({
			appState: {
				openWorkspaceIds: ['a', 'b'],
				activeWorkspaceId: 'a',
				windowBounds: TEST_BOUNDS,
			},
			visitedWorkspaceIds: ['a'],
		})

		useStore.getState().setActiveWorkspace('b')

		expect(useStore.getState().visitedWorkspaceIds).toEqual(['a', 'b'])
	})

	it('setActiveWorkspace does not duplicate visited ids', () => {
		useStore.setState({
			appState: {
				openWorkspaceIds: ['a', 'b'],
				activeWorkspaceId: 'a',
				windowBounds: TEST_BOUNDS,
			},
			visitedWorkspaceIds: ['a', 'b'],
		})

		useStore.getState().setActiveWorkspace('b')

		expect(useStore.getState().visitedWorkspaceIds).toEqual(['a', 'b'])
	})

	it('openWorkspace adds to visited', () => {
		useStore.setState({
			appState: {
				openWorkspaceIds: ['a'],
				activeWorkspaceId: 'a',
				windowBounds: TEST_BOUNDS,
			},
			visitedWorkspaceIds: ['a'],
		})

		useStore.getState().openWorkspace('b')

		expect(useStore.getState().visitedWorkspaceIds).toEqual(['a', 'b'])
	})

	it('closeWorkspaceTab removes from visited', () => {
		useStore.setState({
			appState: {
				openWorkspaceIds: ['a', 'b'],
				activeWorkspaceId: 'a',
				windowBounds: TEST_BOUNDS,
			},
			visitedWorkspaceIds: ['a', 'b'],
		})

		useStore.getState().closeWorkspaceTab('b')

		expect(useStore.getState().visitedWorkspaceIds).toEqual(['a'])
	})

	it('createWorkspace adds new workspace to visited', async () => {
		useStore.setState({ homeDir: '/home', visitedWorkspaceIds: [] })

		const ws = await useStore.getState().createWorkspace('New', '#ff0000', 'single')

		expect(useStore.getState().visitedWorkspaceIds).toContain(ws.id)
	})

	it('removeWorkspace cleans up visited', async () => {
		const ws = makeWorkspace()
		useStore.setState({
			workspaces: [ws],
			appState: {
				openWorkspaceIds: ['ws-1'],
				activeWorkspaceId: 'ws-1',
				windowBounds: TEST_BOUNDS,
			},
			visitedWorkspaceIds: ['ws-1'],
		})

		await useStore.getState().removeWorkspace('ws-1')

		expect(useStore.getState().visitedWorkspaceIds).toEqual([])
	})

	it('closeWorkspaceTab adds fallback active workspace to visited', () => {
		useStore.setState({
			appState: {
				openWorkspaceIds: ['a', 'b'],
				activeWorkspaceId: 'a',
				windowBounds: TEST_BOUNDS,
			},
			visitedWorkspaceIds: ['a'],
		})

		useStore.getState().closeWorkspaceTab('a')

		expect(useStore.getState().visitedWorkspaceIds).toContain('b')
		expect(useStore.getState().appState.activeWorkspaceId).toBe('b')
	})
})

describe('store duplicateWorkspace', () => {
	it('duplicates a workspace with new IDs', async () => {
		const ws = makeWorkspace()
		useStore.setState({
			workspaces: [ws],
			appState: {
				openWorkspaceIds: ['ws-1'],
				activeWorkspaceId: 'ws-1',
				windowBounds: TEST_BOUNDS,
			},
			visitedWorkspaceIds: ['ws-1'],
		})

		const dup = await useStore.getState().duplicateWorkspace('ws-1')
		if (!dup) throw new Error('expected duplicate')

		expect(dup.id).not.toBe('ws-1')
		expect(dup.name).toBe('Test (copy)')
		expect(dup.color).toBe(ws.color)
		// Pane IDs should be remapped
		const origPaneIds = Object.keys(ws.panes)
		const dupPaneIds = Object.keys(dup.panes)
		expect(dupPaneIds).toHaveLength(origPaneIds.length)
		expect(dupPaneIds).not.toEqual(origPaneIds)
	})

	it('activates the duplicate and adds to visited', async () => {
		const ws = makeWorkspace()
		useStore.setState({
			workspaces: [ws],
			appState: {
				openWorkspaceIds: ['ws-1'],
				activeWorkspaceId: 'ws-1',
				windowBounds: TEST_BOUNDS,
			},
			visitedWorkspaceIds: ['ws-1'],
		})

		const dup = await useStore.getState().duplicateWorkspace('ws-1')
		if (!dup) throw new Error('expected duplicate')
		const state = useStore.getState()

		expect(state.appState.activeWorkspaceId).toBe(dup.id)
		expect(state.appState.openWorkspaceIds).toContain(dup.id)
		expect(state.visitedWorkspaceIds).toContain(dup.id)
	})

	it('returns null for non-existent workspace', async () => {
		const result = await useStore.getState().duplicateWorkspace('nonexistent')
		expect(result).toBeNull()
	})

	it('remaps pane IDs in layout tree', async () => {
		const ws = makeWorkspace({
			layout: {
				type: 'custom',
				tree: {
					direction: 'horizontal',
					size: 100,
					children: [
						{ paneId: 'p1', size: 50 },
						{ paneId: 'p2', size: 50 },
					],
				},
			},
			panes: {
				p1: { label: 'left', cwd: '/', startupCommand: null, themeOverride: null },
				p2: { label: 'right', cwd: '/', startupCommand: null, themeOverride: null },
			},
		})
		useStore.setState({
			workspaces: [ws],
			appState: {
				openWorkspaceIds: ['ws-1'],
				activeWorkspaceId: 'ws-1',
				windowBounds: TEST_BOUNDS,
			},
		})

		const dup = await useStore.getState().duplicateWorkspace('ws-1')
		if (!dup) throw new Error('expected duplicate')
		const dupPaneIds = Object.keys(dup.panes)

		// Layout tree should reference the new pane IDs, not the originals
		expect(isLayoutBranch(dup.layout.tree)).toBe(true)
		if (isLayoutBranch(dup.layout.tree)) {
			for (const child of dup.layout.tree.children) {
				if (!isLayoutBranch(child)) {
					expect(dupPaneIds).toContain(child.paneId)
					expect(['p1', 'p2']).not.toContain(child.paneId)
				}
			}
		}
	})

	it('preserves preset layout type', async () => {
		const ws = makeWorkspace()
		useStore.setState({
			workspaces: [ws],
			appState: {
				openWorkspaceIds: ['ws-1'],
				activeWorkspaceId: 'ws-1',
				windowBounds: TEST_BOUNDS,
			},
		})

		const dup = await useStore.getState().duplicateWorkspace('ws-1')
		if (!dup) throw new Error('expected duplicate')

		expect(dup.layout.type).toBe('preset')
		if (dup.layout.type === 'preset') {
			expect(dup.layout.preset).toBe('single')
		}
	})

	it('propagates error when saveWorkspace rejects', async () => {
		const ws = makeWorkspace()
		useStore.setState({
			workspaces: [ws],
			appState: {
				openWorkspaceIds: ['ws-1'],
				activeWorkspaceId: 'ws-1',
				windowBounds: TEST_BOUNDS,
			},
		})
		mockApi.saveWorkspace.mockRejectedValue(new Error('disk full'))

		await expect(useStore.getState().duplicateWorkspace('ws-1')).rejects.toThrow('disk full')
		// Store should not be updated on failure
		expect(useStore.getState().workspaces).toHaveLength(1)
	})
})

describe('store PTY lifecycle', () => {
	describe('ensurePty', () => {
		it('creates a PTY and adds paneId to activePtyIds', () => {
			useStore.getState().ensurePty('p1', '/home', null)

			expect(mockApi.createPty).toHaveBeenCalledWith('p1', '/home', null)
			expect(useStore.getState().activePtyIds.has('p1')).toBe(true)
		})

		it('passes startupCommand to createPty', () => {
			useStore.getState().ensurePty('p1', '/home', 'npm run dev')

			expect(mockApi.createPty).toHaveBeenCalledWith('p1', '/home', 'npm run dev')
		})

		it('is idempotent — second call is a no-op', () => {
			useStore.getState().ensurePty('p1', '/home', null)
			useStore.getState().ensurePty('p1', '/other', 'cmd')

			expect(mockApi.createPty).toHaveBeenCalledTimes(1)
		})

		it('rolls back activePtyIds on createPty failure', async () => {
			const error = new Error('spawn failed')
			mockApi.createPty.mockRejectedValueOnce(error)
			vi.spyOn(console, 'error').mockImplementation(() => {})

			useStore.getState().ensurePty('p1', '/home', null)
			expect(useStore.getState().activePtyIds.has('p1')).toBe(true)

			// Wait for the rejected promise to settle
			await vi.waitFor(() => {
				expect(useStore.getState().activePtyIds.has('p1')).toBe(false)
			})

			expect(console.error).toHaveBeenCalled()
			vi.restoreAllMocks()
		})
	})

	describe('killPtys', () => {
		it('calls killPty for each pane ID', () => {
			useStore.setState({ activePtyIds: new Set(['p1', 'p2', 'p3']) })

			useStore.getState().killPtys(['p1', 'p2'])

			expect(mockApi.killPty).toHaveBeenCalledWith('p1')
			expect(mockApi.killPty).toHaveBeenCalledWith('p2')
			expect(mockApi.killPty).toHaveBeenCalledTimes(2)
		})

		it('removes pane IDs from activePtyIds', () => {
			useStore.setState({ activePtyIds: new Set(['p1', 'p2', 'p3']) })

			useStore.getState().killPtys(['p1', 'p3'])

			const active = useStore.getState().activePtyIds
			expect(active.has('p1')).toBe(false)
			expect(active.has('p2')).toBe(true)
			expect(active.has('p3')).toBe(false)
		})

		it('handles empty array gracefully', () => {
			useStore.setState({ activePtyIds: new Set(['p1']) })

			useStore.getState().killPtys([])

			expect(mockApi.killPty).not.toHaveBeenCalled()
			expect(useStore.getState().activePtyIds.has('p1')).toBe(true)
		})
	})

	describe('removePtyId', () => {
		it('removes a single pane ID from activePtyIds', () => {
			useStore.setState({ activePtyIds: new Set(['p1', 'p2']) })

			useStore.getState().removePtyId('p1')

			expect(useStore.getState().activePtyIds.has('p1')).toBe(false)
			expect(useStore.getState().activePtyIds.has('p2')).toBe(true)
		})

		it('is a no-op for non-existent pane ID', () => {
			const original = new Set(['p1'])
			useStore.setState({ activePtyIds: original })

			useStore.getState().removePtyId('nonexistent')

			// Should still have p1, and reference should be the same (no unnecessary update)
			expect(useStore.getState().activePtyIds.has('p1')).toBe(true)
		})
	})

	describe('closePane PTY cleanup', () => {
		const makeTwoPaneWs = () =>
			makeWorkspace({
				layout: {
					type: 'custom',
					tree: {
						direction: 'horizontal',
						size: 100,
						children: [
							{ paneId: 'p1', size: 50 },
							{ paneId: 'p2', size: 50 },
						],
					},
				},
				panes: {
					p1: { label: 'left', cwd: '/', startupCommand: null, themeOverride: null },
					p2: { label: 'right', cwd: '/', startupCommand: null, themeOverride: null },
				},
			})

		it('calls killPty when closing a pane', () => {
			useStore.setState({
				workspaces: [makeTwoPaneWs()],
				activePtyIds: new Set(['p1', 'p2']),
			})

			useStore.getState().closePane('ws-1', 'p1')

			expect(mockApi.killPty).toHaveBeenCalledWith('p1')
		})

		it('removes closed pane from activePtyIds', () => {
			useStore.setState({
				workspaces: [makeTwoPaneWs()],
				activePtyIds: new Set(['p1', 'p2']),
			})

			useStore.getState().closePane('ws-1', 'p1')

			expect(useStore.getState().activePtyIds.has('p1')).toBe(false)
			expect(useStore.getState().activePtyIds.has('p2')).toBe(true)
		})

		it('does not call killPty when closing the last pane', () => {
			useStore.setState({
				workspaces: [makeWorkspace()],
				activePtyIds: new Set(['p1']),
			})

			useStore.getState().closePane('ws-1', 'p1')

			expect(mockApi.killPty).not.toHaveBeenCalled()
			expect(useStore.getState().activePtyIds.has('p1')).toBe(true)
		})
	})

	describe('removeWorkspace PTY cleanup', () => {
		it('calls killPty for all workspace panes', async () => {
			const ws = makeWorkspace({
				panes: {
					p1: { label: 'a', cwd: '/', startupCommand: null, themeOverride: null },
					p2: { label: 'b', cwd: '/', startupCommand: null, themeOverride: null },
				},
			})
			useStore.setState({
				workspaces: [ws],
				appState: {
					openWorkspaceIds: ['ws-1'],
					activeWorkspaceId: 'ws-1',
					windowBounds: TEST_BOUNDS,
				},
				activePtyIds: new Set(['p1', 'p2']),
			})

			await useStore.getState().removeWorkspace('ws-1')

			expect(mockApi.killPty).toHaveBeenCalledWith('p1')
			expect(mockApi.killPty).toHaveBeenCalledWith('p2')
			expect(useStore.getState().activePtyIds.size).toBe(0)
		})
	})

	describe('closeWorkspaceTab PTY cleanup', () => {
		it('calls killPty for all workspace panes', () => {
			const ws = makeWorkspace({
				panes: {
					p1: { label: 'a', cwd: '/', startupCommand: null, themeOverride: null },
					p2: { label: 'b', cwd: '/', startupCommand: null, themeOverride: null },
				},
			})
			useStore.setState({
				workspaces: [ws],
				appState: {
					openWorkspaceIds: ['ws-1'],
					activeWorkspaceId: 'ws-1',
					windowBounds: TEST_BOUNDS,
				},
				activePtyIds: new Set(['p1', 'p2']),
			})

			useStore.getState().closeWorkspaceTab('ws-1')

			expect(mockApi.killPty).toHaveBeenCalledWith('p1')
			expect(mockApi.killPty).toHaveBeenCalledWith('p2')
			expect(useStore.getState().activePtyIds.size).toBe(0)
		})
	})
})

describe('store setPaneProcess', () => {
	it('sets agent type and process name for known agent', () => {
		useStore.getState().setPaneProcess('p1', { name: 'claude', pid: 1234 })

		expect(useStore.getState().paneAgentTypes.get('p1')).toBe('claude-code')
		expect(useStore.getState().paneProcessNames.get('p1')).toBe('claude')
	})

	it('sets process name but clears agent type for unknown process', () => {
		// First set a known agent
		useStore.getState().setPaneProcess('p1', { name: 'claude', pid: 1234 })
		expect(useStore.getState().paneAgentTypes.get('p1')).toBe('claude-code')

		// Now set an unknown process
		useStore.getState().setPaneProcess('p1', { name: 'node', pid: 5678 })

		expect(useStore.getState().paneProcessNames.get('p1')).toBe('node')
		expect(useStore.getState().paneAgentTypes.has('p1')).toBe(false)
	})

	it('clears both maps when info is null', () => {
		useStore.getState().setPaneProcess('p1', { name: 'claude', pid: 1234 })
		expect(useStore.getState().paneAgentTypes.get('p1')).toBe('claude-code')

		useStore.getState().setPaneProcess('p1', null)

		expect(useStore.getState().paneAgentTypes.has('p1')).toBe(false)
		expect(useStore.getState().paneProcessNames.has('p1')).toBe(false)
	})

	it('does not affect other panes', () => {
		useStore.getState().setPaneProcess('p1', { name: 'claude', pid: 1234 })
		useStore.getState().setPaneProcess('p2', { name: 'codex', pid: 5678 })

		expect(useStore.getState().paneAgentTypes.get('p1')).toBe('claude-code')
		expect(useStore.getState().paneAgentTypes.get('p2')).toBe('codex')

		useStore.getState().setPaneProcess('p1', null)

		expect(useStore.getState().paneAgentTypes.has('p1')).toBe(false)
		expect(useStore.getState().paneAgentTypes.get('p2')).toBe('codex')
	})
})

describe('store agent start times', () => {
	it('sets start time on first agent detection', () => {
		useStore.getState().setPaneProcess('p1', { name: 'claude', pid: 1234 })

		const startTime = useStore.getState().paneAgentStartTimes.get('p1')
		expect(startTime).toBeDefined()
		expect(typeof startTime).toBe('number')
	})

	it('preserves start time on repeated detections', () => {
		useStore.getState().setPaneProcess('p1', { name: 'claude', pid: 1234 })
		const firstStartTime = useStore.getState().paneAgentStartTimes.get('p1')

		useStore.getState().setPaneProcess('p1', { name: 'claude', pid: 1234 })
		const secondStartTime = useStore.getState().paneAgentStartTimes.get('p1')

		expect(secondStartTime).toBe(firstStartTime)
	})

	it('clears start time when agent exits', () => {
		useStore.getState().setPaneProcess('p1', { name: 'claude', pid: 1234 })
		expect(useStore.getState().paneAgentStartTimes.has('p1')).toBe(true)

		useStore.getState().setPaneProcess('p1', null)
		expect(useStore.getState().paneAgentStartTimes.has('p1')).toBe(false)
	})

	it('clears start time when switching to non-agent process', () => {
		useStore.getState().setPaneProcess('p1', { name: 'claude', pid: 1234 })
		expect(useStore.getState().paneAgentStartTimes.has('p1')).toBe(true)

		useStore.getState().setPaneProcess('p1', { name: 'node', pid: 5678 })
		expect(useStore.getState().paneAgentStartTimes.has('p1')).toBe(false)
	})

	it('resets start time when agent exits and restarts', () => {
		useStore.getState().setPaneProcess('p1', { name: 'claude', pid: 1234 })
		const firstStartTime = useStore.getState().paneAgentStartTimes.get('p1')

		useStore.getState().setPaneProcess('p1', null)
		useStore.getState().setPaneProcess('p1', { name: 'claude', pid: 9999 })
		const secondStartTime = useStore.getState().paneAgentStartTimes.get('p1')

		expect(secondStartTime).toBeDefined()
		expect(secondStartTime).toBeGreaterThanOrEqual(firstStartTime!)
	})

	it('killPtys clears start times', () => {
		useStore.setState({ activePtyIds: new Set(['p1']) })
		useStore.getState().setPaneProcess('p1', { name: 'claude', pid: 1234 })

		useStore.getState().killPtys(['p1'])
		expect(useStore.getState().paneAgentStartTimes.has('p1')).toBe(false)
	})
})

describe('store killPtys agent cleanup', () => {
	it('clears agent state for killed pane IDs', () => {
		useStore.setState({ activePtyIds: new Set(['p1', 'p2']) })
		useStore.getState().setPaneProcess('p1', { name: 'claude', pid: 1234 })
		useStore.getState().setPaneProcess('p2', { name: 'codex', pid: 5678 })

		useStore.getState().killPtys(['p1'])

		expect(useStore.getState().paneAgentTypes.has('p1')).toBe(false)
		expect(useStore.getState().paneProcessNames.has('p1')).toBe(false)
	})

	it('preserves agent state for panes not killed', () => {
		useStore.setState({ activePtyIds: new Set(['p1', 'p2']) })
		useStore.getState().setPaneProcess('p1', { name: 'claude', pid: 1234 })
		useStore.getState().setPaneProcess('p2', { name: 'codex', pid: 5678 })

		useStore.getState().killPtys(['p1'])

		expect(useStore.getState().paneAgentTypes.get('p2')).toBe('codex')
		expect(useStore.getState().paneProcessNames.get('p2')).toBe('codex')
	})
})

describe('store removePtyId agent cleanup', () => {
	it('clears agent state on natural PTY exit', () => {
		useStore.setState({ activePtyIds: new Set(['p1']) })
		useStore.getState().setPaneProcess('p1', { name: 'claude', pid: 1234 })

		useStore.getState().removePtyId('p1')

		expect(useStore.getState().paneAgentTypes.has('p1')).toBe(false)
		expect(useStore.getState().paneProcessNames.has('p1')).toBe(false)
		expect(useStore.getState().paneAgentStartTimes.has('p1')).toBe(false)
	})

	it('preserves other panes agent state', () => {
		useStore.setState({ activePtyIds: new Set(['p1', 'p2']) })
		useStore.getState().setPaneProcess('p1', { name: 'claude', pid: 1234 })
		useStore.getState().setPaneProcess('p2', { name: 'aider', pid: 5678 })

		useStore.getState().removePtyId('p1')

		expect(useStore.getState().paneAgentTypes.get('p2')).toBe('aider')
	})
})

describe('store setAltScreen', () => {
	it('adds pane to altScreenPaneIds when entering alt screen', () => {
		useStore.getState().setAltScreen('p1', true)

		expect(useStore.getState().altScreenPaneIds.has('p1')).toBe(true)
	})

	it('removes pane from altScreenPaneIds when leaving alt screen', () => {
		useStore.setState({ altScreenPaneIds: new Set(['p1']) })

		useStore.getState().setAltScreen('p1', false)

		expect(useStore.getState().altScreenPaneIds.has('p1')).toBe(false)
	})

	it('is a no-op when already in alt screen', () => {
		useStore.setState({ altScreenPaneIds: new Set(['p1']) })
		const before = useStore.getState().altScreenPaneIds

		useStore.getState().setAltScreen('p1', true)

		// Reference equality — no new Set created
		expect(useStore.getState().altScreenPaneIds).toBe(before)
	})

	it('is a no-op when already absent from alt screen', () => {
		const before = useStore.getState().altScreenPaneIds

		useStore.getState().setAltScreen('p1', false)

		expect(useStore.getState().altScreenPaneIds).toBe(before)
	})

	it('does not affect other panes', () => {
		useStore.setState({ altScreenPaneIds: new Set(['p1']) })

		useStore.getState().setAltScreen('p2', true)

		expect(useStore.getState().altScreenPaneIds.has('p1')).toBe(true)
		expect(useStore.getState().altScreenPaneIds.has('p2')).toBe(true)
	})
})

describe('store killPtys alt screen cleanup', () => {
	it('clears alt screen state for killed panes', () => {
		useStore.setState({
			activePtyIds: new Set(['p1', 'p2']),
			altScreenPaneIds: new Set(['p1', 'p2']),
		})

		useStore.getState().killPtys(['p1'])

		expect(useStore.getState().altScreenPaneIds.has('p1')).toBe(false)
		expect(useStore.getState().altScreenPaneIds.has('p2')).toBe(true)
	})

	it('preserves alt screen state for panes not killed', () => {
		useStore.setState({
			activePtyIds: new Set(['p1', 'p2']),
			altScreenPaneIds: new Set(['p2']),
		})

		useStore.getState().killPtys(['p1'])

		expect(useStore.getState().altScreenPaneIds.has('p2')).toBe(true)
	})
})

describe('store removePtyId alt screen cleanup', () => {
	it('clears alt screen state on natural PTY exit', () => {
		useStore.setState({
			activePtyIds: new Set(['p1']),
			altScreenPaneIds: new Set(['p1']),
		})

		useStore.getState().removePtyId('p1')

		expect(useStore.getState().altScreenPaneIds.has('p1')).toBe(false)
	})
})

describe('store removePtyId block cleanup', () => {
	it('clears agent blocks and collapsed state on natural PTY exit', () => {
		const blocks = [
			{
				id: 'b1',
				type: 'tool-call' as const,
				agent: 'claude-code' as const,
				startLine: 0,
				endLine: 2,
				metadata: {},
			},
		]
		useStore.setState({ activePtyIds: new Set(['p1']) })
		useStore.getState().updateAgentBlocks('p1', blocks)
		useStore.getState().toggleBlockCollapse('p1', 'b1')

		useStore.getState().removePtyId('p1')

		expect(useStore.getState().paneAgentBlocks.has('p1')).toBe(false)
		expect(useStore.getState().collapsedBlockIds.has('p1')).toBe(false)
	})
})

describe('store agent blocks', () => {
	it('updateAgentBlocks stores blocks for a pane', () => {
		const blocks = [
			{
				id: 'b1',
				type: 'tool-call' as const,
				agent: 'claude-code' as const,
				startLine: 0,
				endLine: 2,
				metadata: { tool: 'read' },
			},
		]
		useStore.getState().updateAgentBlocks('p1', blocks)
		expect(useStore.getState().paneAgentBlocks.get('p1')).toBe(blocks)
	})

	it('updateAgentBlocks removes entry when blocks empty', () => {
		const blocks = [
			{
				id: 'b1',
				type: 'tool-call' as const,
				agent: 'claude-code' as const,
				startLine: 0,
				endLine: 2,
				metadata: { tool: 'read' },
			},
		]
		useStore.getState().updateAgentBlocks('p1', blocks)
		useStore.getState().updateAgentBlocks('p1', [])
		expect(useStore.getState().paneAgentBlocks.has('p1')).toBe(false)
	})

	it('toggleBlockCollapse adds then removes block ID', () => {
		useStore.getState().toggleBlockCollapse('p1', 'b1')
		expect(useStore.getState().collapsedBlockIds.get('p1')?.has('b1')).toBe(true)

		useStore.getState().toggleBlockCollapse('p1', 'b1')
		expect(useStore.getState().collapsedBlockIds.get('p1')?.has('b1')).toBe(false)
	})

	it('collapseAllBlocks collapses all block IDs in a pane', () => {
		const blocks = [
			{
				id: 'b1',
				type: 'tool-call' as const,
				agent: 'claude-code' as const,
				startLine: 0,
				endLine: 2,
				metadata: {},
			},
			{
				id: 'b2',
				type: 'error' as const,
				agent: 'claude-code' as const,
				startLine: 3,
				endLine: 5,
				metadata: {},
			},
		]
		useStore.getState().updateAgentBlocks('p1', blocks)
		useStore.getState().collapseAllBlocks('p1')

		const collapsed = useStore.getState().collapsedBlockIds.get('p1')
		expect(collapsed?.has('b1')).toBe(true)
		expect(collapsed?.has('b2')).toBe(true)
	})

	it('expandAllBlocks clears all collapsed IDs for a pane', () => {
		useStore.getState().toggleBlockCollapse('p1', 'b1')
		useStore.getState().toggleBlockCollapse('p1', 'b2')
		useStore.getState().expandAllBlocks('p1')
		expect(useStore.getState().collapsedBlockIds.has('p1')).toBe(false)
	})

	it('killPtys cleans up agent blocks and collapsed state', () => {
		const blocks = [
			{
				id: 'b1',
				type: 'tool-call' as const,
				agent: 'claude-code' as const,
				startLine: 0,
				endLine: 2,
				metadata: {},
			},
		]
		useStore.setState({ activePtyIds: new Set(['p1']) })
		useStore.getState().updateAgentBlocks('p1', blocks)
		useStore.getState().toggleBlockCollapse('p1', 'b1')

		useStore.getState().killPtys(['p1'])

		expect(useStore.getState().paneAgentBlocks.has('p1')).toBe(false)
		expect(useStore.getState().collapsedBlockIds.has('p1')).toBe(false)
	})
})

describe('store init agent listener', () => {
	it('registers onPtyProcessChanged listener', async () => {
		const ws = makeWorkspace()
		mockApi.getWorkspaces.mockResolvedValue([ws])
		mockApi.getAppState.mockResolvedValue({
			openWorkspaceIds: ['ws-1'],
			activeWorkspaceId: 'ws-1',
			windowBounds: TEST_BOUNDS,
		})
		mockApi.getHomeDir.mockResolvedValue('/home')

		await useStore.getState().init()

		expect(mockApi.onPtyProcessChanged).toHaveBeenCalledTimes(1)
	})

	it('listener callback updates agent state', async () => {
		const ws = makeWorkspace()
		mockApi.getWorkspaces.mockResolvedValue([ws])
		mockApi.getAppState.mockResolvedValue({
			openWorkspaceIds: ['ws-1'],
			activeWorkspaceId: 'ws-1',
			windowBounds: TEST_BOUNDS,
		})
		mockApi.getHomeDir.mockResolvedValue('/home')

		await useStore.getState().init()

		// Capture the callback and invoke it
		// biome-ignore lint/suspicious/noExplicitAny: test mock extraction
		const callback = (mockApi.onPtyProcessChanged.mock.calls as any[][])[0]?.[0] as
			| ((paneId: string, info: { name: string; pid: number }) => void)
			| undefined
		expect(callback).toBeDefined()
		callback?.('p1', { name: 'claude', pid: 1234 })

		expect(useStore.getState().paneAgentTypes.get('p1')).toBe('claude-code')
	})

	it('does not register duplicate listeners on second init call', async () => {
		const ws = makeWorkspace()
		mockApi.getWorkspaces.mockResolvedValue([ws])
		mockApi.getAppState.mockResolvedValue({
			openWorkspaceIds: ['ws-1'],
			activeWorkspaceId: 'ws-1',
			windowBounds: TEST_BOUNDS,
		})
		mockApi.getHomeDir.mockResolvedValue('/home')

		await useStore.getState().init()
		await useStore.getState().init()

		expect(mockApi.onPtyProcessChanged).toHaveBeenCalledTimes(1)
	})
})

describe('setLaunchMode', () => {
	it('sets launchMode on pane config and spawns terminal PTY', () => {
		const ws = makeWorkspace({
			panes: {
				p1: {
					label: 'test',
					cwd: '/home',
					startupCommand: null,
					themeOverride: null,
					launchMode: null,
				},
			},
		})
		useStore.setState({ workspaces: [ws], homeDir: '/home' })

		useStore.getState().setLaunchMode('ws-1', 'p1', 'terminal')

		const pane = useStore.getState().workspaces[0].panes.p1
		expect(pane.launchMode).toBe('terminal')
		expect(mockApi.createPty).toHaveBeenCalledWith('p1', '/home', null)
	})

	it('sets launchMode and spawns agent with command + flags', () => {
		const ws = makeWorkspace({
			panes: {
				p1: {
					label: 'test',
					cwd: '/projects',
					startupCommand: null,
					themeOverride: null,
					launchMode: null,
				},
			},
			agentFlags: { 'claude-code': '--dangerously-skip-permissions' },
		})
		useStore.setState({ workspaces: [ws], homeDir: '/home' })

		useStore.getState().setLaunchMode('ws-1', 'p1', 'claude-code')

		const pane = useStore.getState().workspaces[0].panes.p1
		expect(pane.launchMode).toBe('claude-code')
		expect(mockApi.createPty).toHaveBeenCalledWith(
			'p1',
			'/projects',
			'claude --dangerously-skip-permissions --output-format stream-json',
		)
	})

	it('uses workspace CWD when pane CWD is empty', () => {
		const ws = makeWorkspace({
			cwd: '/workspace-dir',
			panes: {
				p1: { label: 'test', cwd: '', startupCommand: null, themeOverride: null, launchMode: null },
			},
		})
		useStore.setState({ workspaces: [ws], homeDir: '/home' })

		useStore.getState().setLaunchMode('ws-1', 'p1', 'terminal')

		expect(mockApi.createPty).toHaveBeenCalledWith('p1', '/workspace-dir', null)
	})

	it('falls back to homeDir when both CWDs are empty', () => {
		const ws = makeWorkspace({
			panes: {
				p1: { label: 'test', cwd: '', startupCommand: null, themeOverride: null, launchMode: null },
			},
		})
		useStore.setState({ workspaces: [ws], homeDir: '/fallback' })

		useStore.getState().setLaunchMode('ws-1', 'p1', 'terminal')

		expect(mockApi.createPty).toHaveBeenCalledWith('p1', '/fallback', null)
	})
})

describe('setWorkspaceCwd', () => {
	it('updates workspace CWD and persists', () => {
		const ws = makeWorkspace()
		useStore.setState({ workspaces: [ws] })

		useStore.getState().setWorkspaceCwd('ws-1', '/new-dir')

		expect(useStore.getState().workspaces[0].cwd).toBe('/new-dir')
		expect(mockApi.saveWorkspace).toHaveBeenCalled()
	})
})

describe('setAgentFlags', () => {
	it('sets agent flags and persists', () => {
		const ws = makeWorkspace()
		useStore.setState({ workspaces: [ws] })

		useStore.getState().setAgentFlags('ws-1', 'claude-code', '--dangerously-skip-permissions')

		expect(useStore.getState().workspaces[0].agentFlags).toEqual({
			'claude-code': '--dangerously-skip-permissions',
		})
		expect(mockApi.saveWorkspace).toHaveBeenCalled()
	})

	it('clears agent flags when empty string', () => {
		const ws = makeWorkspace({ agentFlags: { 'claude-code': '--model opus' } })
		useStore.setState({ workspaces: [ws] })

		useStore.getState().setAgentFlags('ws-1', 'claude-code', '')

		expect(useStore.getState().workspaces[0].agentFlags).toBeUndefined()
	})

	it('clears only the specified agent, keeps others', () => {
		const ws = makeWorkspace({
			agentFlags: { 'claude-code': '--model opus', 'gemini-cli': '--fast' },
		})
		useStore.setState({ workspaces: [ws] })

		useStore.getState().setAgentFlags('ws-1', 'claude-code', '')

		expect(useStore.getState().workspaces[0].agentFlags).toEqual({ 'gemini-cli': '--fast' })
	})

	it('does nothing for nonexistent workspace', () => {
		const ws = makeWorkspace()
		useStore.setState({ workspaces: [ws] })

		useStore.getState().setAgentFlags('nonexistent', 'claude-code', '--flag')

		expect(useStore.getState().workspaces[0].agentFlags).toBeUndefined()
		expect(mockApi.saveWorkspace).not.toHaveBeenCalled()
	})

	it('treats whitespace-only flags as empty (clears)', () => {
		const ws = makeWorkspace({ agentFlags: { 'claude-code': '--model opus' } })
		useStore.setState({ workspaces: [ws] })

		useStore.getState().setAgentFlags('ws-1', 'claude-code', '   ')

		expect(useStore.getState().workspaces[0].agentFlags).toBeUndefined()
	})
})

describe('createLayoutFromPreset launchMode', () => {
	it('new panes get launchMode: null', () => {
		const { panes } = createLayoutFromPreset('single', '/home')
		const pane = Object.values(panes)[0]
		expect(pane.launchMode).toBeNull()
	})
})

describe('setLaunchMode guard clauses', () => {
	it('does nothing for nonexistent workspace', () => {
		const ws = makeWorkspace()
		useStore.setState({ workspaces: [ws] })

		useStore.getState().setLaunchMode('nonexistent', 'p1', 'terminal')

		expect(mockApi.createPty).not.toHaveBeenCalled()
	})

	it('does nothing for nonexistent pane', () => {
		const ws = makeWorkspace()
		useStore.setState({ workspaces: [ws] })

		useStore.getState().setLaunchMode('ws-1', 'nonexistent', 'terminal')

		expect(mockApi.createPty).not.toHaveBeenCalled()
	})

	it('spawns agent without user flags when agentFlags is empty', () => {
		const ws = makeWorkspace({
			panes: {
				p1: {
					label: 'test',
					cwd: '/projects',
					startupCommand: null,
					themeOverride: null,
					launchMode: null,
				},
			},
		})
		useStore.setState({ workspaces: [ws], homeDir: '/home' })

		useStore.getState().setLaunchMode('ws-1', 'p1', 'claude-code')

		expect(mockApi.createPty).toHaveBeenCalledWith(
			'p1',
			'/projects',
			'claude --output-format stream-json',
		)
	})
})

describe('getEffectiveCwd', () => {
	it('returns pane cwd when set', () => {
		const ws = makeWorkspace({
			cwd: '/workspace-dir',
			panes: { p1: { label: 'test', cwd: '/pane-dir', startupCommand: null, themeOverride: null } },
		})
		expect(getEffectiveCwd(ws, 'p1', '/home')).toBe('/pane-dir')
	})

	it('returns workspace cwd when pane cwd is empty', () => {
		const ws = makeWorkspace({
			cwd: '/workspace-dir',
			panes: { p1: { label: 'test', cwd: '', startupCommand: null, themeOverride: null } },
		})
		expect(getEffectiveCwd(ws, 'p1', '/home')).toBe('/workspace-dir')
	})

	it('returns homeDir when both cwd are empty', () => {
		const ws = makeWorkspace({
			panes: { p1: { label: 'test', cwd: '', startupCommand: null, themeOverride: null } },
		})
		expect(getEffectiveCwd(ws, 'p1', '/fallback')).toBe('/fallback')
	})

	it('returns homeDir when pane does not exist', () => {
		const ws = makeWorkspace()
		expect(getEffectiveCwd(ws, 'nonexistent', '/fallback')).toBe('/fallback')
	})
})
