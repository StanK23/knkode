import { create } from 'zustand'
import type {
	AgentType,
	AppState,
	DropPosition,
	LaunchMode,
	LaunchableAgent,
	LayoutLeaf,
	LayoutNode,
	LayoutPreset,
	PaneConfig,
	PaneTheme,
	ProcessInfo,
	Snippet,
	SplitDirection,
	Workspace,
	WorkspaceLayout,
} from '../../../shared/types'
import {
	AGENT_LAUNCH_CONFIG,
	DEFAULT_CURSOR_STYLE,
	DEFAULT_SCROLLBACK,
	DEFAULT_UNFOCUSED_DIM,
	PROCESS_TO_AGENT,
	isLayoutBranch,
} from '../../../shared/types'
import { THEME_PRESETS } from '../data/theme-presets'
import { ClaudeCodeStreamParser } from '../lib/agent-renderers/claude-code'
import type { StreamMessage, StreamParser } from '../lib/agent-renderers/types'
import { stripAnsi } from '../lib/ansi'

function defaultTheme(): PaneTheme {
	return {
		background: THEME_PRESETS[0].background,
		foreground: THEME_PRESETS[0].foreground,
		fontSize: 14,
		unfocusedDim: DEFAULT_UNFOCUSED_DIM,
		scrollback: DEFAULT_SCROLLBACK,
		cursorStyle: DEFAULT_CURSOR_STYLE,
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
		launchMode: null,
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
	snippets: Snippet[]

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
	/** Pane IDs running an agent subprocess (bidirectional stream-json). */
	activeAgentIds: Set<string>
	/** Detected agent type per pane (absent from map = no agent detected). */
	paneAgentTypes: Map<string, AgentType>
	/** Raw process name per pane (for debugging). */
	paneProcessNames: Map<string, string>
	/** Pane IDs currently in alternate screen buffer (TUI mode like vim, htop). */
	altScreenPaneIds: Set<string>
	/** Timestamp (Date.now()) when each agent was first detected in a pane. */
	paneAgentStartTimes: Map<string, number>
	/** Whether an agent is mid-turn (between user send and result event). */
	paneAgentResponding: Map<string, boolean>
	/** Parsed stream messages per pane (for JSON stream renderers). */
	paneStreamMessages: Map<string, readonly StreamMessage[]>
	/** ANSI-stripped raw text per pane — used by rendered view when NDJSON is unavailable. */
	paneStreamText: Map<string, string>
	/** Session IDs per pane — extracted from result events, used for --resume multi-turn. */
	paneSessionIds: Map<string, string>

	// Actions
	/** Update alt screen buffer state for a pane. No-op if state already matches. */
	setAltScreen: (paneId: string, isAlt: boolean) => void
	/** Update agent type for a pane based on process info. */
	setPaneProcess: (paneId: string, info: ProcessInfo | null) => void
	setFocusedPane: (paneId: string | null) => void
	/** Ensure a PTY exists for the given pane. No-op if already requested or active. */
	ensurePty: (paneId: string, cwd: string, startupCommand: string | null) => void
	/** Kill PTYs for the given pane IDs and remove them from activePtyIds. */
	killPtys: (paneIds: string[]) => void
	/** Kill agent subprocesses for the given pane IDs. */
	killAgents: (paneIds: string[]) => void
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
	/** Move a pane from one workspace to another. PTY stays alive. */
	movePaneToWorkspace: (fromWsId: string, paneId: string, toWsId: string) => void
	/** Swap two panes' positions within a workspace layout tree.
	 *  Only swaps leaf paneId values; pane configs and PTYs are untouched. */
	swapPanes: (workspaceId: string, paneIdA: string, paneIdB: string) => void
	/** Move a pane to a position (left/right/top/bottom) relative to another pane.
	 *  Both panes must belong to the given workspace. Restructures the layout tree
	 *  by removing the source and inserting it as a new split alongside the target.
	 *  PTYs and pane configs stay alive. */
	movePaneToPosition: (
		workspaceId: string,
		sourcePaneId: string,
		targetPaneId: string,
		position: DropPosition,
	) => void
	/** Set the launch mode for a pane and start it — either as a PTY (terminal/TUI agents) or an agent subprocess (stream-json agents). */
	setLaunchMode: (workspaceId: string, paneId: string, mode: LaunchMode) => void
	/** Update workspace-level CWD. */
	setWorkspaceCwd: (workspaceId: string, cwd: string) => void
	/** Update per-agent CLI flags for a workspace. Empty string clears the flag. */
	setAgentFlags: (workspaceId: string, agent: LaunchableAgent, flags: string) => void
	/** Feed raw agent subprocess output to the stream parser for a pane. Creates parser on first call. */
	feedStreamData: (paneId: string, chunk: string) => void
	/** Clear stream data and parser for a pane. */
	clearStreamData: (paneId: string) => void
	/** Send a user message to an agent pane. Uses structured IPC for subprocesses or raw PTY write for TUI agents. */
	sendAgentMessage: (paneId: string, message: string) => void
	updatePaneConfig: (workspaceId: string, paneId: string, updates: Partial<PaneConfig>) => void
	updatePaneCwd: (workspaceId: string, paneId: string, cwd: string) => void
	saveState: () => Promise<void>
	addSnippet: (name: string, command: string) => void
	updateSnippet: (id: string, updates: Pick<Snippet, 'name' | 'command'>) => void
	removeSnippet: (id: string) => void
	/** Move the snippet at fromIndex to toIndex (splice-remove then insert). */
	reorderSnippets: (fromIndex: number, toIndex: number) => void
	runSnippet: (snippetId: string, paneId: string) => void
}

function persistSnippets(snippets: Snippet[]): void {
	window.api.saveSnippets(snippets).catch((err) => {
		console.error('[store] Failed to save snippets:', err)
	})
}

type PaneCleanupState = Pick<
	StoreState,
	| 'paneAgentTypes'
	| 'paneProcessNames'
	| 'altScreenPaneIds'
	| 'paneAgentStartTimes'
	| 'paneAgentResponding'
	| 'paneStreamMessages'
	| 'paneStreamText'
	| 'paneSessionIds'
>

/** Clone all per-pane Maps/Sets, delete entries for the given IDs, and return the partial state update. */
function cleanupPaneState(paneIds: string[], state: PaneCleanupState): PaneCleanupState {
	const agents = new Map(state.paneAgentTypes)
	const procs = new Map(state.paneProcessNames)
	const altIds = new Set(state.altScreenPaneIds)
	const startTimes = new Map(state.paneAgentStartTimes)
	const responding = new Map(state.paneAgentResponding)
	const streamMsgs = new Map(state.paneStreamMessages)
	const streamText = new Map(state.paneStreamText)
	const sessionIds = new Map(state.paneSessionIds)
	for (const id of paneIds) {
		agents.delete(id)
		procs.delete(id)
		altIds.delete(id)
		startTimes.delete(id)
		responding.delete(id)
		streamMsgs.delete(id)
		streamText.delete(id)
		sessionIds.delete(id)
		streamParsers.delete(id)
	}
	return {
		paneAgentTypes: agents,
		paneProcessNames: procs,
		altScreenPaneIds: altIds,
		paneAgentStartTimes: startTimes,
		paneAgentResponding: responding,
		paneStreamMessages: streamMsgs,
		paneStreamText: streamText,
		paneSessionIds: sessionIds,
	}
}

/** Module-level parser instances — not serializable, not in Zustand state. */
const streamParsers = new Map<string, StreamParser>()

/** Tracks pending rAF flush per pane for throttled stream updates. */
const pendingStreamFlush = new Map<string, number>()
/** Accumulated raw text between flushes. */
const pendingRawText = new Map<string, string>()

/** Maximum raw stream text kept per pane (500 KB). */
const MAX_STREAM_TEXT = 500_000

/** @internal — test-only: clear module-level parser cache. */
export function _resetStreamParsers(): void {
	streamParsers.clear()
}

export const useStore = create<StoreState>((set, get) => ({
	workspaces: [],
	appState: {
		openWorkspaceIds: [],
		activeWorkspaceId: null,
		windowBounds: { x: 100, y: 100, width: 1200, height: 800 },
	},
	homeDir: '/tmp',
	snippets: [],
	initialized: false,
	initError: null,
	focusedPaneId: null,
	focusGeneration: 0,
	visitedWorkspaceIds: [],
	activePtyIds: new Set(),
	activeAgentIds: new Set(),
	paneAgentTypes: new Map(),
	paneProcessNames: new Map(),
	altScreenPaneIds: new Set(),
	paneAgentStartTimes: new Map(),
	paneAgentResponding: new Map(),
	paneStreamMessages: new Map(),
	paneStreamText: new Map(),
	paneSessionIds: new Map(),

	setAltScreen: (paneId, isAlt) => {
		const current = get().altScreenPaneIds
		const has = current.has(paneId)
		if (isAlt === has) return
		const next = new Set(current)
		if (isAlt) next.add(paneId)
		else next.delete(paneId)
		set({ altScreenPaneIds: next })
	},

	setPaneProcess: (paneId, info) => {
		set((state) => {
			const newProcessNames = new Map(state.paneProcessNames)
			const newAgentTypes = new Map(state.paneAgentTypes)
			let newStartTimes = state.paneAgentStartTimes

			if (!info) {
				newProcessNames.delete(paneId)
				newAgentTypes.delete(paneId)
				if (newStartTimes.has(paneId)) {
					newStartTimes = new Map(newStartTimes)
					newStartTimes.delete(paneId)
				}
			} else {
				newProcessNames.set(paneId, info.name)
				const agentType = PROCESS_TO_AGENT[info.name]
				if (agentType) {
					newAgentTypes.set(paneId, agentType)
					// Only set start time on first detection
					if (!state.paneAgentStartTimes.has(paneId)) {
						newStartTimes = new Map(newStartTimes)
						newStartTimes.set(paneId, Date.now())
					}
				} else {
					newAgentTypes.delete(paneId)
					if (newStartTimes.has(paneId)) {
						newStartTimes = new Map(newStartTimes)
						newStartTimes.delete(paneId)
					}
				}
			}

			return {
				paneProcessNames: newProcessNames,
				paneAgentTypes: newAgentTypes,
				paneAgentStartTimes: newStartTimes,
			}
		})
	},

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
			// Kill both PTY and agent subprocess (pane might have either)
			if (get().activeAgentIds.has(id)) {
				window.api.killAgent(id).catch((err) => {
					console.warn(`[store] killAgent failed for pane ${id}:`, err)
				})
			}
			window.api.killPty(id).catch((err) => {
				console.warn(`[store] killPty failed for pane ${id}:`, err)
			})
		}
		const ptyIds = get().activePtyIds
		const newPtySet = new Set(ptyIds)
		const agentIds = get().activeAgentIds
		const newAgentSet = new Set(agentIds)
		let ptyChanged = false
		let agentChanged = false
		for (const id of paneIds) {
			if (newPtySet.delete(id)) ptyChanged = true
			if (newAgentSet.delete(id)) agentChanged = true
		}
		const updates: Partial<StoreState> = {}
		if (ptyChanged) updates.activePtyIds = newPtySet
		if (agentChanged) updates.activeAgentIds = newAgentSet
		set({ ...updates, ...cleanupPaneState(paneIds, get()) })
	},

	killAgents: (paneIds) => {
		for (const id of paneIds) {
			window.api.killAgent(id).catch((err) => {
				console.warn(`[store] killAgent failed for pane ${id}:`, err)
			})
		}
		const current = get().activeAgentIds
		const newSet = new Set(current)
		let changed = false
		for (const id of paneIds) {
			if (newSet.delete(id)) changed = true
		}
		if (changed) set({ activeAgentIds: newSet })
		set(cleanupPaneState(paneIds, get()))
	},

	removePtyId: (paneId) => {
		const current = get().activePtyIds
		if (!current.has(paneId)) return
		const newSet = new Set(current)
		newSet.delete(paneId)
		set({ activePtyIds: newSet, ...cleanupPaneState([paneId], get()) })
	},

	feedStreamData: (paneId, chunk) => {
		// 1. Feed parser immediately — no data loss
		let parser = streamParsers.get(paneId)
		if (!parser) {
			parser = new ClaudeCodeStreamParser()
			streamParsers.set(paneId, parser)
		}
		try {
			parser.feed(chunk)
		} catch (err) {
			console.error('[store] feedStreamData: parser.feed() failed, resetting parser:', err)
			parser.reset()
			streamParsers.delete(paneId)
		}

		// Accumulate raw text in-place (module-level, not in store yet)
		const prev = pendingRawText.get(paneId) ?? get().paneStreamText.get(paneId) ?? ''
		const cleaned = stripAnsi(chunk)
		let newText = prev + cleaned
		if (newText.length > MAX_STREAM_TEXT) {
			newText = newText.slice(-MAX_STREAM_TEXT)
		}
		pendingRawText.set(paneId, newText)

		// 2. Batch React state update — rAF in browser, sync in tests
		const flushToStore = () => {
			pendingStreamFlush.delete(paneId)
			const currentParser = streamParsers.get(paneId)
			if (!currentParser) return

			const msgs = currentParser.getMessages()
			const nextMsgs = new Map(get().paneStreamMessages)
			nextMsgs.set(
				paneId,
				msgs.map((m) => ({ ...m, blocks: [...m.blocks] })),
			)

			const rawText = pendingRawText.get(paneId)
			const nextText = new Map(get().paneStreamText)
			if (rawText !== undefined) {
				nextText.set(paneId, rawText)
				pendingRawText.delete(paneId)
			}

			const sessionId = currentParser.getSessionId()
			const updates: Partial<StoreState> = {
				paneStreamMessages: nextMsgs,
				paneStreamText: nextText,
			}
			if (sessionId && get().paneSessionIds.get(paneId) !== sessionId) {
				const nextSessions = new Map(get().paneSessionIds)
				nextSessions.set(paneId, sessionId)
				updates.paneSessionIds = nextSessions
			}

			// Sync parser's responding state to React state
			const responding = currentParser.isResponding()
			if (get().paneAgentResponding.get(paneId) !== responding) {
				const nextResponding = new Map(get().paneAgentResponding)
				nextResponding.set(paneId, responding)
				updates.paneAgentResponding = nextResponding
			}

			set(updates)
		}

		if (pendingStreamFlush.has(paneId)) return
		if (typeof requestAnimationFrame === 'function' && process.env.NODE_ENV !== 'test') {
			// Electron renderer — batch updates per animation frame
			const rafId = requestAnimationFrame(flushToStore)
			pendingStreamFlush.set(paneId, rafId)
		} else {
			// Node/test — flush synchronously
			flushToStore()
		}
	},

	clearStreamData: (paneId) => {
		// Cancel any pending rAF flush and clear module-level caches
		const rafId = pendingStreamFlush.get(paneId)
		if (rafId) cancelAnimationFrame(rafId)
		pendingStreamFlush.delete(paneId)
		pendingRawText.delete(paneId)
		// cleanupPaneState handles streamParsers + all per-pane Maps/Sets
		set(cleanupPaneState([paneId], get()))
	},

	init: async () => {
		if (get().initialized) return
		// Set immediately to prevent double-registration from concurrent calls.
		// The async work below takes time, and React StrictMode / HMR can trigger
		// init() again before the first call completes.
		set({ initialized: true })
		try {
			// Register IPC event listeners FIRST — before any async work.
			// Agent subprocesses can spawn immediately on pane mount and start
			// sending data. If listeners aren't registered yet, events are lost.
			window.api.onPtyProcessChanged((paneId, info) => {
				get().setPaneProcess(paneId, info)
			})
			window.api.onAgentData((paneId, data) => {
				get().feedStreamData(paneId, data)
			})
			window.api.onAgentError((paneId, error) => {
				console.error(`[store] agent error for pane ${paneId}:`, error)
				// Surface agent stderr to user by feeding it as raw stream data
				get().feedStreamData(paneId, error)
			})
			window.api.onAgentExit((paneId, code, signal) => {
				console.log(`[store] agent exited for pane ${paneId}:`, { code, signal })
				const current = get().activeAgentIds
				if (current.has(paneId)) {
					const newSet = new Set(current)
					newSet.delete(paneId)
					set({ activeAgentIds: newSet })
				}
			})

			const [workspaces, appState, homeDir, snippets] = await Promise.all([
				window.api.getWorkspaces(),
				window.api.getAppState(),
				window.api.getHomeDir(),
				window.api.getSnippets(),
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
				snippets,
				visitedWorkspaceIds: initialVisited,
				focusedPaneId: initialFocusedPaneId,
				focusGeneration: initialFocusedPaneId ? 1 : 0,
			})
		} catch (err) {
			console.error('[store] Failed to initialize:', err)
			set({ initError: String(err) })
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
			cwd: source.cwd,
			agentFlags: source.agentFlags ? { ...source.agentFlags } : undefined,
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
				launchMode: null,
			}

			const newTree = replaceLeafInTree(workspace.layout.tree, paneId, (leaf) => ({
				direction,
				size: leaf.size,
				children: [
					{ paneId, size: 50 },
					{ paneId: newPaneId, size: 50 },
				],
			}))

			const updated = {
				...workspace,
				layout: { type: 'custom' as const, tree: newTree },
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

			const newTree = removeLeafFromTree(workspace.layout.tree, paneId)
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

	movePaneToWorkspace: (fromWsId, paneId, toWsId) => {
		// PTY intentionally NOT killed — it stays alive in the destination workspace
		if (fromWsId === toWsId) return

		set((state) => {
			const fromWs = state.workspaces.find((w) => w.id === fromWsId)
			const toWs = state.workspaces.find((w) => w.id === toWsId)
			if (!fromWs || !toWs) {
				console.error('[store] movePaneToWorkspace: workspace not found', { fromWsId, toWsId })
				return state
			}
			if (Object.keys(fromWs.panes).length <= 1) {
				console.warn('[store] movePaneToWorkspace: cannot move last pane', fromWsId)
				return state
			}
			const config = fromWs.panes[paneId]
			if (!config) {
				console.error('[store] movePaneToWorkspace: pane config not found', { paneId, fromWsId })
				return state
			}
			if (toWs.panes[paneId]) {
				console.error('[store] movePaneToWorkspace: pane ID already exists in destination', {
					paneId,
					toWsId,
				})
				return state
			}

			const newSourceTree = removeLeafFromTree(fromWs.layout.tree, paneId)
			if (!newSourceTree) {
				console.error('[store] movePaneToWorkspace: removeLeafFromTree returned null', {
					paneId,
					fromWsId,
				})
				return state
			}
			const { [paneId]: _, ...remainingPanes } = fromWs.panes
			const updatedFrom: Workspace = {
				...fromWs,
				layout: { type: 'custom' as const, tree: newSourceTree },
				panes: remainingPanes,
			}

			// Add to destination tree: if root is a horizontal branch, append as a new
			// equal-width child (resets existing size ratios). Otherwise wrap the entire
			// tree in a new horizontal split at 50/50.
			const destRoot = toWs.layout.tree
			let newDestTree: LayoutNode
			if (isLayoutBranch(destRoot) && destRoot.direction === 'horizontal') {
				const count = destRoot.children.length + 1
				const size = Math.round(100 / count)
				const lastSize = 100 - size * (count - 1)
				newDestTree = {
					...destRoot,
					children: [...destRoot.children.map((c) => ({ ...c, size })), { paneId, size: lastSize }],
				}
			} else {
				newDestTree = {
					direction: 'horizontal',
					size: 100,
					children: [
						{ ...destRoot, size: 50 },
						{ paneId, size: 50 },
					],
				}
			}
			const updatedTo: Workspace = {
				...toWs,
				layout: { type: 'custom' as const, tree: newDestTree },
				panes: { ...toWs.panes, [paneId]: config },
			}

			// Persist both workspaces and app state. Grouped so partial failure is detectable.
			Promise.all([
				window.api.saveWorkspace(updatedFrom),
				window.api.saveWorkspace(updatedTo),
			]).catch((err) => {
				console.error('[store] movePaneToWorkspace: failed to save workspaces', {
					fromWsId,
					toWsId,
					err,
				})
			})

			// Ensure destination is open, switch to it, and mark as visited
			// (required for lazy PaneArea rendering)
			const openIds = state.appState.openWorkspaceIds
			const newOpen = openIds.includes(toWsId) ? openIds : [...openIds, toWsId]
			const newAppState = {
				...state.appState,
				openWorkspaceIds: newOpen,
				activeWorkspaceId: toWsId,
			}
			window.api.saveAppState(newAppState).catch((err) => {
				console.error('[store] movePaneToWorkspace: failed to save app state', {
					toWsId,
					err,
				})
			})

			return {
				workspaces: state.workspaces.map((w) => {
					if (w.id === fromWsId) return updatedFrom
					if (w.id === toWsId) return updatedTo
					return w
				}),
				appState: newAppState,
				focusedPaneId: paneId,
				focusGeneration: state.focusGeneration + 1,
				visitedWorkspaceIds: addToVisited(state.visitedWorkspaceIds, toWsId),
			}
		})
	},

	swapPanes: (workspaceId, paneIdA, paneIdB) => {
		if (paneIdA === paneIdB) return
		set((state) => {
			const workspace = state.workspaces.find((w) => w.id === workspaceId)
			if (!workspace) {
				console.error('[store] swapPanes: workspace not found', { workspaceId })
				return state
			}
			if (!workspace.panes[paneIdA] || !workspace.panes[paneIdB]) {
				console.error('[store] swapPanes: pane not found', { paneIdA, paneIdB, workspaceId })
				return state
			}
			const swappedTree = remapLayoutTree(workspace.layout.tree, (id) =>
				id === paneIdA ? paneIdB : id === paneIdB ? paneIdA : id,
			)
			const updated = {
				...workspace,
				layout: { type: 'custom' as const, tree: swappedTree },
			}
			window.api.saveWorkspace(updated).catch((err) => {
				console.error('[store] Failed to save workspace:', err)
			})
			return {
				workspaces: state.workspaces.map((w) => (w.id === workspaceId ? updated : w)),
			}
		})
	},

	movePaneToPosition: (workspaceId, sourcePaneId, targetPaneId, position) => {
		if (sourcePaneId === targetPaneId) return
		set((state) => {
			const workspace = state.workspaces.find((w) => w.id === workspaceId)
			if (!workspace?.panes[sourcePaneId] || !workspace.panes[targetPaneId]) {
				console.error('[store] movePaneToPosition: pane not found', {
					sourcePaneId,
					targetPaneId,
					workspaceId,
				})
				return state
			}

			// 1. Remove source leaf from tree
			const treeWithoutSource = removeLeafFromTree(workspace.layout.tree, sourcePaneId)
			if (!treeWithoutSource) {
				console.error('[store] movePaneToPosition: removeLeafFromTree returned null', {
					sourcePaneId,
					workspaceId,
				})
				return state
			}

			// 2. Find target leaf and replace it with a new branch containing
			// source and target in position-dependent order
			const direction: SplitDirection =
				position === 'left' || position === 'right' ? 'horizontal' : 'vertical'
			const sourceFirst = position === 'left' || position === 'top'

			const newTree = replaceLeafInTree(treeWithoutSource, targetPaneId, (leaf) => {
				const sourceLeaf: LayoutLeaf = { paneId: sourcePaneId, size: 50 }
				const targetLeaf: LayoutLeaf = { paneId: targetPaneId, size: 50 }
				return {
					direction,
					size: leaf.size,
					children: sourceFirst ? [sourceLeaf, targetLeaf] : [targetLeaf, sourceLeaf],
				}
			})
			const updated = {
				...workspace,
				layout: { type: 'custom' as const, tree: newTree },
			}
			window.api.saveWorkspace(updated).catch((err) => {
				console.error('[store] Failed to save workspace:', err)
			})
			return {
				workspaces: state.workspaces.map((w) => (w.id === workspaceId ? updated : w)),
				focusedPaneId: sourcePaneId,
				focusGeneration: state.focusGeneration + 1,
			}
		})
	},

	sendAgentMessage: (paneId, message) => {
		if (get().activeAgentIds.has(paneId)) {
			// Inject user message into parser so it's visible in the conversation
			let parser = streamParsers.get(paneId)
			if (!parser) {
				parser = new ClaudeCodeStreamParser()
				streamParsers.set(paneId, parser)
			}
			parser.addUserMessage(message)
			const nextMsgs = new Map(get().paneStreamMessages)
			nextMsgs.set(paneId, [...parser.getMessages()])
			const nextResponding = new Map(get().paneAgentResponding)
			nextResponding.set(paneId, true)
			set({ paneStreamMessages: nextMsgs, paneAgentResponding: nextResponding })

			// Subprocess mode — send structured message via IPC
			window.api.sendAgentMessage(paneId, message).catch((err) => {
				console.error('[store] sendAgentMessage: IPC send failed', { paneId, err })
			})
		} else {
			// PTY mode — write text directly to the agent TUI
			window.api.writePty(paneId, `${message}\r`).catch((err) => {
				console.error('[store] sendAgentMessage: writePty failed', { paneId, err })
			})
		}
	},

	setLaunchMode: (workspaceId, paneId, mode) => {
		const state = get()
		const workspace = state.workspaces.find((w) => w.id === workspaceId)
		if (!workspace || !workspace.panes[paneId]) {
			console.warn('[store] setLaunchMode: workspace or pane not found', { workspaceId, paneId })
			return
		}

		get().updatePaneConfig(workspaceId, paneId, { launchMode: mode })
		const cwd = getEffectiveCwd(workspace, paneId, state.homeDir)

		if (mode !== 'terminal') {
			const config = AGENT_LAUNCH_CONFIG[mode]
			if (!config) {
				console.error(`[store] No launch config for agent type: ${mode}`)
				return
			}

			// Agents with subprocess config use bidirectional stream-json mode
			if (config.subprocess) {
				// Record agent start time immediately (no need to wait for process detection)
				const newStartTimes = new Map(get().paneAgentStartTimes)
				newStartTimes.set(paneId, Date.now())
				const newAgentIds = new Set(get().activeAgentIds)
				newAgentIds.add(paneId)
				set({ activeAgentIds: newAgentIds, paneAgentStartTimes: newStartTimes })
				window.api.spawnAgent(paneId, mode, cwd).catch((err) => {
					console.error(`[store] spawnAgent failed for pane ${paneId}:`, err)
					const current = get().activeAgentIds
					const rollback = new Set(current)
					rollback.delete(paneId)
					// Reset launchMode to null so launcher reappears instead of zombie state
					get().updatePaneConfig(workspaceId, paneId, { launchMode: null })
					set({ activeAgentIds: rollback })
				})
				return
			}

			// Non-subprocess agents: launch via PTY with startup command
			const agent = mode as LaunchableAgent
			const userFlags = workspace.agentFlags?.[agent] ?? ''
			const parts = [config.command]
			if (userFlags.trim()) parts.push(userFlags.trim())
			parts.push(...config.defaultFlags)
			get().ensurePty(paneId, cwd, parts.join(' '))
			return
		}

		// Terminal mode — plain PTY, no agent
		get().ensurePty(paneId, cwd, null)
	},

	setWorkspaceCwd: (workspaceId, cwd) => {
		set((state) => {
			const workspace = state.workspaces.find((w) => w.id === workspaceId)
			if (!workspace) return state
			const updated = { ...workspace, cwd }
			window.api.saveWorkspace(updated).catch((err) => {
				console.error('[store] Failed to save workspace:', err)
			})
			return {
				workspaces: state.workspaces.map((w) => (w.id === workspaceId ? updated : w)),
			}
		})
	},

	setAgentFlags: (workspaceId, agent, flags) => {
		set((state) => {
			const workspace = state.workspaces.find((w) => w.id === workspaceId)
			if (!workspace) return state
			const current = { ...(workspace.agentFlags ?? {}) }
			const trimmed = flags.trim()
			if (trimmed) {
				current[agent] = trimmed
			} else {
				delete current[agent]
			}
			const updated = {
				...workspace,
				agentFlags: Object.keys(current).length > 0 ? current : undefined,
			}
			window.api.saveWorkspace(updated).catch((err) => {
				console.error('[store] Failed to save workspace:', err)
			})
			return {
				workspaces: state.workspaces.map((w) => (w.id === workspaceId ? updated : w)),
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

	addSnippet: (name, command) => {
		const snippet: Snippet = { id: crypto.randomUUID(), name, command }
		const snippets = [...get().snippets, snippet]
		set({ snippets })
		persistSnippets(snippets)
	},

	updateSnippet: (id, updates) => {
		const snippets = get().snippets.map((s) => (s.id === id ? { ...s, ...updates } : s))
		set({ snippets })
		persistSnippets(snippets)
	},

	removeSnippet: (id) => {
		const snippets = get().snippets.filter((s) => s.id !== id)
		set({ snippets })
		persistSnippets(snippets)
	},

	reorderSnippets: (fromIndex, toIndex) => {
		const snippets = [...get().snippets]
		if (
			fromIndex < 0 ||
			fromIndex >= snippets.length ||
			toIndex < 0 ||
			toIndex >= snippets.length
		) {
			console.warn('[store] reorderSnippets: index out of range', {
				fromIndex,
				toIndex,
				length: snippets.length,
			})
			return
		}
		if (fromIndex === toIndex) return
		const [moved] = snippets.splice(fromIndex, 1)
		if (!moved) return
		snippets.splice(toIndex, 0, moved)
		set({ snippets })
		persistSnippets(snippets)
	},

	runSnippet: (snippetId, paneId) => {
		const snippet = get().snippets.find((s) => s.id === snippetId)
		if (!snippet) {
			console.warn('[store] runSnippet: snippet not found', snippetId)
			return
		}
		window.api.writePty(paneId, `${snippet.command}\r`).catch((err) => {
			console.error(`[store] Failed to run snippet in pane ${paneId}:`, err)
		})
	},
}))

/** Remove a leaf from a layout tree by pane ID.
 *  If a branch is left with one child, collapse it upward
 *  (promote the child, preserving the parent's size).
 *  Returns null if the target was the only node (callers should guard against this). */
function removeLeafFromTree(node: LayoutNode, targetPaneId: string): LayoutNode | null {
	if (!isLayoutBranch(node)) {
		return node.paneId === targetPaneId ? null : node
	}
	const remaining = node.children
		.map((child) => removeLeafFromTree(child, targetPaneId))
		.filter((n): n is LayoutNode => n !== null)
	if (remaining.length === 0) return null
	if (remaining.length === 1) return { ...remaining[0], size: node.size }
	return { ...node, children: remaining }
}

/** Find a leaf by pane ID and replace it using the given function.
 *  The replacer receives the matched leaf and returns its replacement node. */
function replaceLeafInTree(
	node: LayoutNode,
	targetPaneId: string,
	replacer: (leaf: LayoutNode) => LayoutNode,
): LayoutNode {
	if (isLayoutBranch(node)) {
		return {
			...node,
			children: node.children.map((c) => replaceLeafInTree(c, targetPaneId, replacer)),
		}
	}
	return node.paneId === targetPaneId ? replacer(node) : node
}

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
			if (!config)
				throw new Error(`[applyPresetWithRemap] missing pane config for "${existingIds[i]}"`)
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

/** Resolve the effective CWD for a pane: pane.cwd > workspace.cwd > homeDir. */
export function getEffectiveCwd(workspace: Workspace, paneId: string, homeDir: string): string {
	const pane = workspace.panes[paneId]
	return pane?.cwd || workspace.cwd || homeDir
}

export { WORKSPACE_COLORS, applyPresetWithRemap, createLayoutFromPreset, getPaneIdsInOrder }
