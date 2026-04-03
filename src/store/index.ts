import { create } from "zustand";
import type {
	AgentKind,
	AgentSession,
	AgentStatus,
	AppState,
	DropPosition,
	LayoutPreset,
	PaneConfig,
	PrInfo,
	Snippet,
	SplitDirection,
	Workspace,
} from "../shared/types";
import { nextPaneTitlesForUpdate } from "../utils/pane-title";
import { DEFAULT_WINDOW_BOUNDS, sanitizeAppState } from "./app-state";
import { createLayoutFromPreset, getActivePaneId, makeSingleSubgroup } from "./layout-tree";
import { createSessionHistorySlice } from "./session-history-actions";
import { createSnippetSlice } from "./snippet-actions";
import {
	createWorkspacePaneSlice,
	defaultTheme,
	persistAppState,
	saveAppStatePreservingWindowBounds,
} from "./workspace-pane-actions";

interface StoreState {
	// Data
	workspaces: Workspace[];
	appState: AppState;
	homeDir: string;
	snippets: Snippet[];

	// UI state
	initialized: boolean;
	initError: string | null;
	focusedPaneId: string | null;
	focusGeneration: number;
	/** Workspace IDs that have been activated at least once this session.
	 *  Used for lazy PTY loading — only visited workspaces render PaneAreas. */
	visitedWorkspaceIds: string[];
	/** Pane IDs for which a PTY has been requested or is running.
	 *  Prevents double-creation on remount.
	 *  IMPORTANT: Always create a new Set on mutation — Zustand uses reference equality. */
	activePtyIds: ReadonlySet<string>;
	/** Current git branch per pane. Hydrated from PaneConfig.lastBranch on init,
	 *  updated live by CwdTracker events and persisted back to pane config. */
	paneBranches: Record<string, string | null>;
	/** Current PR info per pane. Ephemeral runtime state — NOT persisted to disk.
	 *  Starts empty each session; re-detected by CwdTracker. PRs go stale on merge
	 *  so persisting would cause stuck indicators on next startup. */
	panePrs: Record<string, PrInfo | null>;
	/** Current agent status per pane. Ephemeral runtime state. */
	paneAgentStatuses: Record<string, AgentStatus>;
	/** Panes where the user has typed since last attention acknowledgment.
	 *  Gates attention indicators — only panes with user input show attention
	 *  when going idle while unfocused. Prevents HMR/dev-server noise. */
	paneHadUserInput: ReadonlySet<string>;
	/** Terminal title per pane (from terminal title escape sequences). Ephemeral runtime state.
	 *  Values are never null — entries are deleted on pane removal via cleanPaneEphemeral. */
	paneTitles: Record<string, string>;
	/** Pane IDs whose PTY has exited (any exit including signals).
	 *  Consumers can show a restart prompt. Cleaned by cleanPaneEphemeral on pane removal.
	 *  IMPORTANT: Always create a new Set on mutation — Zustand uses reference equality. */
	exitedPtyIds: ReadonlySet<string>;
	/** In-memory mirror of `appState.collapsedWorkspaceIds` as a Set for O(1) lookup.
	 *  Hydrated from AppState on init, kept in sync by `toggleSidebarSection`.
	 *  IMPORTANT: Always create a new Set on mutation — Zustand uses reference equality. */
	collapsedSidebarSections: ReadonlySet<string>;

	// Actions
	setFocusedPane: (paneId: string | null) => void;
	toggleSidebar: () => void;
	toggleSidebarSection: (workspaceId: string) => void;
	/** Ensure a PTY exists for the given pane. No-op if already requested or active. */
	ensurePty: (
		paneId: string,
		cwd: string,
		shell: string | null,
		startupCommand: string | null,
		scrollback: number,
	) => void;
	/** Kill PTYs for the given pane IDs and remove them from activePtyIds. */
	killPtys: (paneIds: string[]) => void;
	/** Remove a single pane ID from activePtyIds (e.g. on natural PTY exit). */
	removePtyId: (paneId: string) => void;
	/** Atomically remove from activePtyIds and add to exitedPtyIds. */
	handlePtyExit: (paneId: string) => void;
	/** Mark a pane's PTY as exited so consumers can show a restart prompt. */
	markPtyExited: (paneId: string) => void;
	/** Clear the exited flag for a pane. */
	clearPtyExited: (paneId: string) => void;
	/** Mark that the user has typed in a pane — gates attention indicators. */
	markPaneUserInput: (paneId: string) => void;
	init: () => Promise<void>;
	createWorkspace: (name: string, preset: LayoutPreset) => Promise<Workspace>;
	createDefaultWorkspace: () => Promise<Workspace>;
	updateWorkspace: (workspace: Workspace) => Promise<void>;
	duplicateWorkspace: (id: string) => Promise<Workspace | null>;
	removeWorkspace: (id: string) => Promise<void>;
	setActiveWorkspace: (id: string) => void;
	openWorkspace: (id: string) => void;
	closeWorkspaceTab: (id: string) => void;
	/** Move the tab at fromIndex to toIndex within openWorkspaceIds (splice-remove then insert). */
	reorderWorkspaceTabs: (fromIndex: number, toIndex: number) => void;
	splitPane: (workspaceId: string, paneId: string, direction: SplitDirection) => void;
	closePane: (workspaceId: string, paneId: string) => void;
	/** Move a pane from one workspace to another. PTY stays alive.
	 *  The moved pane becomes a new solo subgroup in the destination workspace. */
	movePaneToWorkspace: (fromWsId: string, paneId: string, toWsId: string) => void;
	/** Swap two panes' positions within the same subgroup's layout tree.
	 *  Both panes must be in the same subgroup. PTYs and pane configs are untouched. */
	swapPanes: (workspaceId: string, paneIdA: string, paneIdB: string) => void;
	/** Move a pane to a position (left/right/top/bottom) relative to another pane.
	 *  Both panes must be in the same subgroup. Restructures the subgroup's layout tree
	 *  by removing the source and inserting it as a new split alongside the target.
	 *  PTYs and pane configs stay alive. */
	movePaneToPosition: (
		workspaceId: string,
		sourcePaneId: string,
		targetPaneId: string,
		position: DropPosition,
	) => void;
	updatePaneConfig: (workspaceId: string, paneId: string, updates: Partial<PaneConfig>) => void;
	updatePaneCwd: (workspaceId: string, paneId: string, cwd: string) => void;
	/** Update git branch for a pane and persist to PaneConfig.lastBranch. */
	updatePaneBranch: (paneId: string, branch: string | null) => void;
	/** Update PR info for a pane. Ephemeral — not persisted to disk. */
	updatePanePr: (paneId: string, pr: PrInfo | null) => void;
	/** Update agent status for a pane. */
	updatePaneAgentStatus: (paneId: string, status: AgentStatus) => void;
	/** Update terminal title for a pane (from OSC 1/2 escape sequences). */
	updatePaneTitle: (paneId: string, title: string) => void;
	/** Persist pixel sizes as percentages at a given tree path within the active subgroup.
	 *  `path` is an array of child indices from the root to the target branch node.
	 *  An empty array `[]` targets the root node itself.
	 *  Also transitions the active subgroup's layout type from 'preset' to 'custom'. */
	updateNodeSizes: (workspaceId: string, path: number[], pixelSizes: number[]) => void;
	/** Add a new solo pane subgroup to a workspace and set it active. */
	addSubgroup: (workspaceId: string) => void;
	/** Switch the active subgroup within a workspace. */
	setActiveSubgroup: (workspaceId: string, subgroupId: string) => void;
	/** Cycle to the next (+1) or previous (-1) subgroup within a workspace. */
	cycleSubgroup: (workspaceId: string, direction: 1 | -1) => void;
	saveState: () => Promise<void>;
	addSnippet: (name: string, command: string) => void;
	updateSnippet: (id: string, updates: Pick<Snippet, "name" | "command">) => void;
	removeSnippet: (id: string) => void;
	/** Move the snippet at fromIndex to toIndex (splice-remove then insert). */
	reorderSnippets: (fromIndex: number, toIndex: number) => void;
	runSnippet: (snippetId: string, paneId: string) => void;
	addWorkspaceSnippet: (wsId: string, name: string, command: string) => void;
	updateWorkspaceSnippet: (
		wsId: string,
		id: string,
		updates: Pick<Snippet, "name" | "command">,
	) => void;
	removeWorkspaceSnippet: (wsId: string, id: string) => void;
	reorderWorkspaceSnippets: (wsId: string, fromIndex: number, toIndex: number) => void;
	runWorkspaceSnippet: (wsId: string, snippetId: string, paneId: string) => void;

	// Session history
	agentSessions: AgentSession[];
	agentFilter: AgentKind | null;
	sessionHistoryPaneId: string | null;
	fetchAgentSessions: (projectCwd: string) => Promise<void>;
	setAgentFilter: (filter: AgentKind | null) => void;
	openSessionHistory: (paneId: string) => void;
	closeSessionHistory: () => void;
	resumeSession: (paneId: string, session: AgentSession, unsafe: boolean) => void;
}

export const useStore = create<StoreState>((set, get) => ({
	workspaces: [],
	appState: {
		openWorkspaceIds: [],
		activeWorkspaceId: null,
		sidebarCollapsed: false,
		collapsedWorkspaceIds: [],
		windowBounds: DEFAULT_WINDOW_BOUNDS,
	},
	homeDir: "/tmp",
	snippets: [],
	initialized: false,
	initError: null,
	focusedPaneId: null,
	focusGeneration: 0,
	visitedWorkspaceIds: [],
	activePtyIds: new Set<string>(),
	exitedPtyIds: new Set<string>(),
	paneBranches: {},
	panePrs: {},
	paneAgentStatuses: {},
	paneHadUserInput: new Set<string>(),
	paneTitles: {},
	collapsedSidebarSections: new Set(),

	setFocusedPane: (paneId) =>
		set((state) => {
			// Clear attention + hadUserInput when user focuses a pane (acknowledges the notification)
			if (paneId && state.paneAgentStatuses[paneId] === "attention") {
				const nextInput = new Set(state.paneHadUserInput);
				nextInput.delete(paneId);
				return {
					focusedPaneId: paneId,
					focusGeneration: state.focusGeneration + 1,
					paneAgentStatuses: { ...state.paneAgentStatuses, [paneId]: "idle" },
					paneHadUserInput: nextInput,
				};
			}
			return {
				focusedPaneId: paneId,
				focusGeneration: state.focusGeneration + 1,
			};
		}),

	toggleSidebar: () => {
		const { appState } = get();
		const updated = { ...appState, sidebarCollapsed: !appState.sidebarCollapsed };
		set({ appState: updated });
		persistAppState(updated);
	},

	toggleSidebarSection: (workspaceId) => {
		const state = get();
		const next = new Set(state.collapsedSidebarSections);
		if (next.has(workspaceId)) next.delete(workspaceId);
		else next.add(workspaceId);
		const updated = { ...state.appState, collapsedWorkspaceIds: Array.from(next).sort() };
		set({ collapsedSidebarSections: next, appState: updated });
		persistAppState(updated);
	},

	updatePaneAgentStatus: (paneId, status) => {
		set((state) => {
			if (state.paneAgentStatuses[paneId] === status) return {};
			return { paneAgentStatuses: { ...state.paneAgentStatuses, [paneId]: status } };
		});
	},

	markPaneUserInput: (paneId) => {
		set((state) => {
			if (state.paneHadUserInput.has(paneId)) return {};
			const next = new Set(state.paneHadUserInput);
			next.add(paneId);
			return { paneHadUserInput: next };
		});
	},

	updatePaneTitle: (paneId, title) => {
		set((state) => {
			const nextTitles = nextPaneTitlesForUpdate(state.paneTitles, paneId, title);
			if (!nextTitles) return {};
			return { paneTitles: nextTitles };
		});
	},

	ensurePty: (paneId, cwd, shell, startupCommand, scrollback) => {
		const { activePtyIds } = get();
		if (activePtyIds.has(paneId)) return;
		// Optimistically mark as active to prevent concurrent creation attempts
		const newSet = new Set(activePtyIds);
		newSet.add(paneId);
		set({ activePtyIds: newSet });
		window.api.createPty(paneId, cwd, shell, startupCommand, scrollback).catch((err) => {
			console.error(`[store] Failed to create PTY for pane ${paneId}:`, err);
			// Remove from active set on failure so retry is possible
			const current = get().activePtyIds;
			if (current.has(paneId)) {
				const rollback = new Set(current);
				rollback.delete(paneId);
				set({ activePtyIds: rollback });
			}
		});
	},

	killPtys: (paneIds) => {
		for (const id of paneIds) {
			window.api.killPty(id).catch((err) => {
				console.warn(`[store] killPty failed for pane ${id}:`, err);
			});
		}
		const current = get().activePtyIds;
		const newSet = new Set(current);
		let changed = false;
		for (const id of paneIds) {
			if (newSet.delete(id)) changed = true;
		}
		if (changed) set({ activePtyIds: newSet });
	},

	removePtyId: (paneId) => {
		const current = get().activePtyIds;
		if (!current.has(paneId)) return;
		const newSet = new Set(current);
		newSet.delete(paneId);
		set({ activePtyIds: newSet });
	},

	handlePtyExit: (paneId) => {
		const { activePtyIds, exitedPtyIds } = get();
		const newActive = new Set(activePtyIds);
		newActive.delete(paneId);
		const newExited = new Set(exitedPtyIds);
		newExited.add(paneId);
		set({ activePtyIds: newActive, exitedPtyIds: newExited });
	},

	markPtyExited: (paneId) => {
		const current = get().exitedPtyIds;
		if (current.has(paneId)) return;
		const newSet = new Set(current);
		newSet.add(paneId);
		set({ exitedPtyIds: newSet });
	},

	clearPtyExited: (paneId) => {
		const current = get().exitedPtyIds;
		if (!current.has(paneId)) return;
		const newSet = new Set(current);
		newSet.delete(paneId);
		set({ exitedPtyIds: newSet });
	},

	init: async () => {
		try {
			const [loadedWorkspaces, loadedAppState, homeDir, snippets] = await Promise.all([
				window.api.getWorkspaces(),
				window.api.getAppState(),
				window.api.getHomeDir(),
				window.api.getSnippets(),
			]);

			// Migrate workspaces from single `layout` to `subgroups` array.
			// Configs saved before subgroups was added will have `layout` but no `subgroups`.
			// preset is intentionally `string` — legacy configs may contain preset names
			// that no longer exist in the current ThemePresetName union.
			type LegacyLayout = { type: string; tree: unknown; preset?: string };
			function hasLegacyLayout(obj: unknown): obj is { layout: LegacyLayout } {
				if (typeof obj !== "object" || obj === null) return false;
				const rec = obj as Record<string, unknown>;
				if (typeof rec.layout !== "object" || rec.layout === null) return false;
				const layout = rec.layout as Record<string, unknown>;
				return typeof layout.type === "string" && layout.tree != null;
			}
			const migrationPromises: Promise<void>[] = [];
			let workspaces = loadedWorkspaces.map((ws) => {
				let nextWorkspace = ws;
				let shouldPersist = false;

				if (!Array.isArray(ws.subgroups) || ws.subgroups.length === 0) {
					if (!hasLegacyLayout(ws)) return ws;
					nextWorkspace = {
						id: ws.id,
						name: ws.name,
						theme: ws.theme,
						// Cast: type guard validates shape but not that tree conforms to LayoutNode —
						// acceptable for migration of arbitrary persisted data.
						...makeSingleSubgroup(ws.layout as Workspace["subgroups"][0]["layout"]),
						panes: ws.panes,
						// Rust backfill_snippets guarantees this field; fallback is a safety net
						snippets: ws.snippets ?? [],
					};
					shouldPersist = true;
				}

				const normalizedPanes = Object.fromEntries(
					Object.entries(nextWorkspace.panes).map(([paneId, pane]) => {
						if ("shell" in pane && pane.shell !== undefined) {
							return [paneId, pane];
						}
						shouldPersist = true;
						return [paneId, { ...pane, shell: null }];
					}),
				) as Workspace["panes"];

				if (shouldPersist) {
					nextWorkspace = { ...nextWorkspace, panes: normalizedPanes };
					migrationPromises.push(
						window.api.saveWorkspace(nextWorkspace).catch((err) => {
							console.error("[store] Failed to persist workspace migration:", err);
						}),
					);
				}

				return shouldPersist ? nextWorkspace : ws;
			});
			if (migrationPromises.length > 0) {
				await Promise.all(migrationPromises);
			}
			let appState = sanitizeAppState(
				loadedAppState,
				workspaces.map((workspace) => workspace.id),
			);

			// If no workspaces exist, create a default one
			if (workspaces.length === 0) {
				const { layout, panes } = createLayoutFromPreset("single", homeDir);
				const defaultWorkspace: Workspace = {
					id: crypto.randomUUID(),
					name: "Default",
					theme: defaultTheme(),
					...makeSingleSubgroup(layout),
					panes,
					snippets: [],
				};
				workspaces = [...workspaces, defaultWorkspace];
				appState = {
					...appState,
					openWorkspaceIds: [defaultWorkspace.id],
					activeWorkspaceId: defaultWorkspace.id,
				};
				await window.api.saveWorkspace(defaultWorkspace);
				await saveAppStatePreservingWindowBounds(appState);
			}

			// Ensure at least one tab is open
			if (appState.openWorkspaceIds.length === 0 && workspaces.length > 0) {
				const firstId = workspaces[0]!.id;
				appState = {
					...appState,
					openWorkspaceIds: [firstId],
					activeWorkspaceId: firstId,
				};
				await saveAppStatePreservingWindowBounds(appState);
			}

			const initialVisited = appState.activeWorkspaceId ? [appState.activeWorkspaceId] : [];
			const activeWs = workspaces.find((w) => w.id === appState.activeWorkspaceId);
			const initialFocusedPaneId = activeWs ? getActivePaneId(activeWs) : null;

			// Hydrate branch from persisted pane configs for instant sidebar rendering.
			// PR data is NOT hydrated — it's ephemeral remote state that goes stale
			// on merge and must be re-detected by the tracker each session.
			const paneBranches: Record<string, string | null> = {};
			for (const ws of workspaces) {
				for (const [paneId, config] of Object.entries(ws.panes)) {
					if (config.lastBranch !== undefined) paneBranches[paneId] = config.lastBranch;
				}
			}

			set({
				workspaces,
				appState,
				homeDir,
				snippets,
				initialized: true,
				visitedWorkspaceIds: initialVisited,
				focusedPaneId: initialFocusedPaneId,
				focusGeneration: initialFocusedPaneId ? 1 : 0,
				paneBranches,
				panePrs: {},
				collapsedSidebarSections: new Set(appState.collapsedWorkspaceIds),
			});
		} catch (err) {
			console.error("[store] Failed to initialize:", err);
			set({ initError: String(err), initialized: true });
		}
	},

	...createWorkspacePaneSlice(set, get),

	saveState: async () => {
		await saveAppStatePreservingWindowBounds(get().appState).catch((err) => {
			console.error("[store] Failed to save app state:", err);
		});
	},

	...createSnippetSlice(set, get),
	...createSessionHistorySlice(set, get),
}));

export {
	applyPresetWithRemap,
	createLayoutFromPreset,
	findSubgroupForPane,
	getActiveSubgroup,
	getAllPaneIds,
	getFirstPaneId,
	getPaneIdsInOrder,
	makeSingleSubgroup,
	updateSubgroupLayout,
} from "./layout-tree";
