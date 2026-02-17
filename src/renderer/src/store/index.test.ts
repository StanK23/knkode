import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppState, Workspace } from '../../../shared/types'
import { isLayoutBranch } from '../../../shared/types'
import { createLayoutFromPreset, getPaneIdsInOrder, useStore } from './index'

// Mock window.api used by the store
const mockApi = {
	getWorkspaces: vi.fn<() => Promise<Workspace[]>>(),
	getAppState: vi.fn<() => Promise<AppState>>(),
	getHomeDir: vi.fn<() => Promise<string>>(),
	saveWorkspace: vi.fn<(ws: Workspace) => Promise<void>>(),
	saveAppState: vi.fn<(state: AppState) => Promise<void>>(),
	deleteWorkspace: vi.fn<(id: string) => Promise<void>>(),
	createPty: vi.fn(),
	writePty: vi.fn(),
	resizePty: vi.fn(),
	killPty: vi.fn(),
	onPtyData: vi.fn(() => () => {}),
	onPtyExit: vi.fn(() => () => {}),
	onPtyCwdChanged: vi.fn(() => () => {}),
}

Object.defineProperty(globalThis, 'window', {
	value: { api: mockApi },
	writable: true,
})

// Mock crypto.randomUUID
let uuidCounter = 0
vi.stubGlobal('crypto', {
	randomUUID: () => `uuid-${++uuidCounter}`,
})

function resetStore() {
	useStore.setState({
		workspaces: [],
		appState: {
			openWorkspaceIds: [],
			activeWorkspaceId: null,
			windowBounds: { x: 100, y: 100, width: 1200, height: 800 },
		},
		homeDir: '/home/test',
		initialized: false,
		initError: null,
		focusedPaneId: null,
		focusGeneration: 0,
	})
}

beforeEach(() => {
	vi.clearAllMocks()
	uuidCounter = 0
	mockApi.saveWorkspace.mockResolvedValue(undefined)
	mockApi.saveAppState.mockResolvedValue(undefined)
	mockApi.deleteWorkspace.mockResolvedValue(undefined)
	resetStore()
})

// ── createLayoutFromPreset ──────────────────────────────────────

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

// ── getPaneIdsInOrder ───────────────────────────────────────────

describe('getPaneIdsInOrder', () => {
	it('returns single pane id for leaf', () => {
		expect(getPaneIdsInOrder({ paneId: 'a', size: 100 })).toEqual(['a'])
	})

	it('returns ids in depth-first order for branch', () => {
		const tree = {
			direction: 'horizontal' as const,
			size: 100,
			children: [
				{ paneId: 'left', size: 50 },
				{
					direction: 'vertical' as const,
					size: 50,
					children: [
						{ paneId: 'top-right', size: 50 },
						{ paneId: 'bottom-right', size: 50 },
					],
				},
			],
		}
		expect(getPaneIdsInOrder(tree)).toEqual(['left', 'top-right', 'bottom-right'])
	})
})

// ── Store: init ─────────────────────────────────────────────────

describe('store init', () => {
	it('loads workspaces and app state', async () => {
		const ws: Workspace = {
			id: 'ws-1',
			name: 'Test',
			color: '#fff',
			theme: { background: '#000', foreground: '#fff', fontSize: 14, opacity: 1 },
			layout: { type: 'preset', preset: 'single', tree: { paneId: 'p1', size: 100 } },
			panes: { p1: { label: 'term', cwd: '/home', startupCommand: null, themeOverride: null } },
		}
		const appState: AppState = {
			openWorkspaceIds: ['ws-1'],
			activeWorkspaceId: 'ws-1',
			windowBounds: { x: 0, y: 0, width: 1200, height: 800 },
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
			windowBounds: { x: 0, y: 0, width: 1200, height: 800 },
		})
		mockApi.getHomeDir.mockResolvedValue('/home')

		await useStore.getState().init()

		const state = useStore.getState()
		expect(state.workspaces).toHaveLength(1)
		expect(state.workspaces[0].name).toBe('Default')
		expect(mockApi.saveWorkspace).toHaveBeenCalled()
		expect(mockApi.saveAppState).toHaveBeenCalled()
	})

	it('sets initError on failure', async () => {
		mockApi.getWorkspaces.mockRejectedValue(new Error('disk error'))

		await useStore.getState().init()

		const state = useStore.getState()
		expect(state.initialized).toBe(true)
		expect(state.initError).toContain('disk error')
	})
})

// ── Store: workspace CRUD ───────────────────────────────────────

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
		const ws: Workspace = {
			id: 'ws-1',
			name: 'Original',
			color: '#fff',
			theme: { background: '#000', foreground: '#fff', fontSize: 14, opacity: 1 },
			layout: { type: 'preset', preset: 'single', tree: { paneId: 'p1', size: 100 } },
			panes: { p1: { label: 'term', cwd: '/', startupCommand: null, themeOverride: null } },
		}
		useStore.setState({ workspaces: [ws] })

		const updated = { ...ws, name: 'Updated' }
		await useStore.getState().updateWorkspace(updated)

		expect(useStore.getState().workspaces[0].name).toBe('Updated')
		expect(mockApi.saveWorkspace).toHaveBeenCalledWith(updated)
	})

	it('removes a workspace', async () => {
		const ws: Workspace = {
			id: 'ws-1',
			name: 'Test',
			color: '#fff',
			theme: { background: '#000', foreground: '#fff', fontSize: 14, opacity: 1 },
			layout: { type: 'preset', preset: 'single', tree: { paneId: 'p1', size: 100 } },
			panes: { p1: { label: 'term', cwd: '/', startupCommand: null, themeOverride: null } },
		}
		useStore.setState({
			workspaces: [ws],
			appState: {
				openWorkspaceIds: ['ws-1'],
				activeWorkspaceId: 'ws-1',
				windowBounds: { x: 0, y: 0, width: 1200, height: 800 },
			},
		})

		await useStore.getState().removeWorkspace('ws-1')

		expect(useStore.getState().workspaces).toHaveLength(0)
		expect(useStore.getState().appState.openWorkspaceIds).toHaveLength(0)
		expect(mockApi.deleteWorkspace).toHaveBeenCalledWith('ws-1')
	})
})

// ── Store: tab management ───────────────────────────────────────

describe('store tab management', () => {
	const makeState = () => ({
		workspaces: [],
		appState: {
			openWorkspaceIds: ['a', 'b', 'c'],
			activeWorkspaceId: 'b',
			windowBounds: { x: 0, y: 0, width: 1200, height: 800 },
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

// ── Store: reorderWorkspaceTabs ─────────────────────────────────

describe('store reorderWorkspaceTabs', () => {
	beforeEach(() => {
		useStore.setState({
			appState: {
				openWorkspaceIds: ['a', 'b', 'c', 'd'],
				activeWorkspaceId: 'a',
				windowBounds: { x: 0, y: 0, width: 1200, height: 800 },
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
		useStore.getState().reorderWorkspaceTabs(-1, 2)
		expect(useStore.getState().appState.openWorkspaceIds).toEqual(['a', 'b', 'c', 'd'])
		expect(mockApi.saveAppState).not.toHaveBeenCalled()
	})

	it('persists to app state', () => {
		useStore.getState().reorderWorkspaceTabs(0, 3)
		expect(mockApi.saveAppState).toHaveBeenCalled()
	})
})

// ── Store: pane focus ───────────────────────────────────────────

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

// ── Store: splitPane ────────────────────────────────────────────

describe('store splitPane', () => {
	const makeWs = (): Workspace => ({
		id: 'ws-1',
		name: 'Test',
		color: '#fff',
		theme: { background: '#000', foreground: '#fff', fontSize: 14, opacity: 1 },
		layout: { type: 'preset', preset: 'single', tree: { paneId: 'p1', size: 100 } },
		panes: { p1: { label: 'term', cwd: '/home', startupCommand: null, themeOverride: null } },
	})

	it('splits a pane vertically', () => {
		useStore.setState({ workspaces: [makeWs()] })
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
		useStore.setState({ workspaces: [makeWs()] })
		useStore.getState().splitPane('ws-1', 'p1', 'horizontal')

		const state = useStore.getState()
		expect(state.focusedPaneId).not.toBe('p1')
		expect(state.focusedPaneId).toBeTruthy()
		expect(state.focusGeneration).toBe(1)
	})

	it('inherits cwd from source pane', () => {
		useStore.setState({ workspaces: [makeWs()] })
		useStore.getState().splitPane('ws-1', 'p1', 'vertical')

		const ws = useStore.getState().workspaces[0]
		const newPaneId = Object.keys(ws.panes).find((id) => id !== 'p1')
		expect(newPaneId).toBeDefined()
		expect(ws.panes[newPaneId as string].cwd).toBe('/home')
	})

	it('no-ops for non-existent pane', () => {
		useStore.setState({ workspaces: [makeWs()] })
		useStore.getState().splitPane('ws-1', 'nonexistent', 'vertical')
		expect(Object.keys(useStore.getState().workspaces[0].panes)).toHaveLength(1)
	})
})

// ── Store: closePane ────────────────────────────────────────────

describe('store closePane', () => {
	const makeWs = (): Workspace => ({
		id: 'ws-1',
		name: 'Test',
		color: '#fff',
		theme: { background: '#000', foreground: '#fff', fontSize: 14, opacity: 1 },
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
		useStore.setState({ workspaces: [makeWs()] })
		useStore.getState().closePane('ws-1', 'p1')

		const ws = useStore.getState().workspaces[0]
		expect(Object.keys(ws.panes)).toHaveLength(1)
		expect(ws.panes.p2).toBeDefined()
		// Branch should collapse to leaf
		expect(isLayoutBranch(ws.layout.tree)).toBe(false)
	})

	it('does not close the last pane', () => {
		const ws = makeWs()
		// Make it single-pane
		ws.layout = { type: 'preset', preset: 'single', tree: { paneId: 'p1', size: 100 } }
		ws.panes = { p1: ws.panes.p1 }
		useStore.setState({ workspaces: [ws] })

		useStore.getState().closePane('ws-1', 'p1')
		expect(Object.keys(useStore.getState().workspaces[0].panes)).toHaveLength(1)
	})

	it('clears focus if closed pane was focused', () => {
		useStore.setState({ workspaces: [makeWs()], focusedPaneId: 'p1' })
		useStore.getState().closePane('ws-1', 'p1')
		expect(useStore.getState().focusedPaneId).toBeNull()
	})

	it('preserves focus if different pane closed', () => {
		useStore.setState({ workspaces: [makeWs()], focusedPaneId: 'p2' })
		useStore.getState().closePane('ws-1', 'p1')
		expect(useStore.getState().focusedPaneId).toBe('p2')
	})
})

// ── Store: pane config ──────────────────────────────────────────

describe('store pane config', () => {
	const makeWs = (): Workspace => ({
		id: 'ws-1',
		name: 'Test',
		color: '#fff',
		theme: { background: '#000', foreground: '#fff', fontSize: 14, opacity: 1 },
		layout: { type: 'preset', preset: 'single', tree: { paneId: 'p1', size: 100 } },
		panes: { p1: { label: 'term', cwd: '/home', startupCommand: null, themeOverride: null } },
	})

	it('updates pane label', () => {
		useStore.setState({ workspaces: [makeWs()] })
		useStore.getState().updatePaneConfig('ws-1', 'p1', { label: 'renamed' })
		expect(useStore.getState().workspaces[0].panes.p1.label).toBe('renamed')
	})

	it('updates pane cwd', () => {
		useStore.setState({ workspaces: [makeWs()] })
		useStore.getState().updatePaneCwd('ws-1', 'p1', '/new/path')
		expect(useStore.getState().workspaces[0].panes.p1.cwd).toBe('/new/path')
	})

	it('no-ops for non-existent pane', () => {
		useStore.setState({ workspaces: [makeWs()] })
		useStore.getState().updatePaneConfig('ws-1', 'nonexistent', { label: 'test' })
		expect(useStore.getState().workspaces[0].panes.p1.label).toBe('term')
	})
})
