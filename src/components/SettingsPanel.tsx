import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { DEFAULT_PRESET_NAME, type ThemePresetName, findPreset } from "../data/theme-presets";
import { useModalFocusTrap } from "../hooks/useModalFocusTrap";
import type { UpdateActions, UpdateState } from "../hooks/useUpdateChecker";
import {
	type CursorStyle,
	DEFAULT_CURSOR_STYLE,
	DEFAULT_FONT_SIZE,
	DEFAULT_LINE_HEIGHT,
	DEFAULT_PANE_OPACITY,
	DEFAULT_SCROLLBACK,
	EFFECT_LEVELS,
	type EffectLevel,
	isEffectLevel,
	MAX_UNFOCUSED_DIM,
	MIN_PANE_OPACITY,
	type PaneConfig,
	type PaneTheme,
	type Workspace,
} from "../shared/types";
import { useStore } from "../store";
import { AboutTabPanel } from "./AboutTabPanel";
import { GlobalTabPanel } from "./GlobalTabPanel";
import { type EffectCategory, WorkspaceDetail } from "./WorkspaceDetail";
import { WorkspaceList } from "./WorkspaceList";

/** Numeric values for the EffectLevel-based dim and opacity controls. */
const DIM_VALUES: Record<EffectLevel, number> = {
	off: 0,
	subtle: 0.3,
	medium: 0.6,
	intense: MAX_UNFOCUSED_DIM,
};
const OPACITY_VALUES: Record<EffectLevel, number> = {
	off: 1.0,
	subtle: 0.7,
	medium: 0.4,
	intense: MIN_PANE_OPACITY,
};

/** Find the closest EffectLevel key for a numeric value. */
function closestLevel(value: number, map: Record<EffectLevel, number>): EffectLevel {
	let best: EffectLevel = "off";
	let bestDist = Number.POSITIVE_INFINITY;
	for (const level of EFFECT_LEVELS) {
		const dist = Math.abs(value - map[level]);
		if (dist <= bestDist) {
			bestDist = dist;
			best = level;
		}
	}
	return best;
}

/** Read the latest workspace from the store to avoid stale-snapshot races
 *  when multiple auto-persist effects fire in close succession. */
function getLatestWorkspace(wsId: string): Workspace | undefined {
	return useStore.getState().workspaces.find((w) => w.id === wsId);
}

interface SettingsPanelProps {
	updateState: UpdateState;
	updateActions: UpdateActions;
	onClose: () => void;
}

const SETTINGS_TABS = ["Workspaces", "Global", "About"] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number];

// ── Settings reducer ──────────────────────────────────────────────

interface SettingsState {
	activeTab: SettingsTab;
	selectedWorkspaceId: string;
	name: string;
	themePreset: ThemePresetName;
	fontSize: number;
	fontFamily: string;
	scrollback: number;
	cursorStyle: CursorStyle;
	statusBarPosition: "top" | "bottom";
	lineHeight: number;
	dimLevel: EffectLevel;
	opacityLevel: EffectLevel;
	gradientLevel: EffectLevel;
	glowLevel: EffectLevel;
	scanlineLevel: EffectLevel;
	noiseLevel: EffectLevel;
	saveFailed: boolean;
	confirmDelete: boolean;
	actionError: string | null;
	isMutating: boolean;
}

type SettingsAction =
	| { type: "UPDATE"; patch: Partial<SettingsState> }
	| { type: "SET_EFFECT"; category: EffectCategory; level: EffectLevel }
	| { type: "APPLY_PRESET"; preset: ThemePresetName }
	| { type: "SWITCH_WORKSPACE"; workspace: Workspace };

/** Effect-level field names within SettingsState. */
type EffectStateField =
	| "dimLevel"
	| "opacityLevel"
	| "gradientLevel"
	| "glowLevel"
	| "scanlineLevel"
	| "noiseLevel";

/** Maps effect UI categories to their corresponding state field names, used by SET_EFFECT. */
const EFFECT_STATE_KEY: Record<EffectCategory, EffectStateField> = {
	dim: "dimLevel",
	opacity: "opacityLevel",
	gradient: "gradientLevel",
	glow: "glowLevel",
	scanline: "scanlineLevel",
	noise: "noiseLevel",
};

function hydrateFromWorkspace(
	workspace: Workspace,
): Omit<SettingsState, "activeTab" | "saveFailed" | "confirmDelete" | "actionError" | "isMutating"> {
	const t = workspace.theme;
	return {
		selectedWorkspaceId: workspace.id,
		name: workspace.name,
		themePreset: t.preset ?? DEFAULT_PRESET_NAME,
		fontSize: t.fontSize,
		fontFamily: t.fontFamily ?? "",
		scrollback: t.scrollback ?? DEFAULT_SCROLLBACK,
		cursorStyle: t.cursorStyle ?? DEFAULT_CURSOR_STYLE,
		statusBarPosition: t.statusBarPosition ?? "top",
		lineHeight: t.lineHeight ?? DEFAULT_LINE_HEIGHT,
		dimLevel: closestLevel(t.unfocusedDim, DIM_VALUES),
		opacityLevel: closestLevel(t.paneOpacity ?? DEFAULT_PANE_OPACITY, OPACITY_VALUES),
		gradientLevel: isEffectLevel(t.gradientLevel) ? t.gradientLevel : "off",
		glowLevel: isEffectLevel(t.glowLevel) ? t.glowLevel : "off",
		scanlineLevel: isEffectLevel(t.scanlineLevel) ? t.scanlineLevel : "off",
		noiseLevel: isEffectLevel(t.noiseLevel) ? t.noiseLevel : "off",
	};
}

function initState(workspace: Workspace | null): SettingsState {
	if (!workspace) {
		return {
			activeTab: "Workspaces",
			selectedWorkspaceId: "",
			name: "",
			themePreset: DEFAULT_PRESET_NAME,
			fontSize: DEFAULT_FONT_SIZE,
			fontFamily: "",
			scrollback: DEFAULT_SCROLLBACK,
			cursorStyle: DEFAULT_CURSOR_STYLE,
			statusBarPosition: "top",
			lineHeight: DEFAULT_LINE_HEIGHT,
			dimLevel: "subtle",
			opacityLevel: "off",
			gradientLevel: "off",
			glowLevel: "off",
			scanlineLevel: "off",
			noiseLevel: "off",
			saveFailed: false,
			confirmDelete: false,
			actionError: null,
			isMutating: false,
		};
	}
	return {
		activeTab: "Workspaces",
		...hydrateFromWorkspace(workspace),
		saveFailed: false,
		confirmDelete: false,
		actionError: null,
		isMutating: false,
	};
}

function hasWorkspaceDraftChanges(workspace: Workspace, state: SettingsState): boolean {
	const persisted = hydrateFromWorkspace(workspace);
	const trimmedName = state.name.trim();
	return (
		(trimmedName.length > 0 && trimmedName !== workspace.name) ||
		state.themePreset !== persisted.themePreset ||
		state.fontSize !== persisted.fontSize ||
		state.fontFamily !== persisted.fontFamily ||
		state.scrollback !== persisted.scrollback ||
		state.cursorStyle !== persisted.cursorStyle ||
		state.statusBarPosition !== persisted.statusBarPosition ||
		state.lineHeight !== persisted.lineHeight ||
		state.dimLevel !== persisted.dimLevel ||
		state.opacityLevel !== persisted.opacityLevel ||
		state.gradientLevel !== persisted.gradientLevel ||
		state.glowLevel !== persisted.glowLevel ||
		state.scanlineLevel !== persisted.scanlineLevel ||
		state.noiseLevel !== persisted.noiseLevel
	);
}

function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
	switch (action.type) {
		case "UPDATE":
			return { ...state, ...action.patch };
		case "SET_EFFECT":
			return { ...state, [EFFECT_STATE_KEY[action.category]]: action.level };
		case "APPLY_PRESET": {
			const p = findPreset(action.preset);
			if (!p) console.warn("[settings] unknown theme preset:", action.preset);
			return {
				...state,
				themePreset: action.preset,
				gradientLevel: p?.gradientLevel ?? "off",
				glowLevel: p?.glowLevel ?? "off",
				scanlineLevel: p?.scanlineLevel ?? "off",
				noiseLevel: p?.noiseLevel ?? "off",
				statusBarPosition: p?.statusBarPosition ?? "top",
				fontFamily: p?.fontFamily ?? "",
				fontSize: p?.fontSize ?? DEFAULT_FONT_SIZE,
				lineHeight: p?.lineHeight ?? DEFAULT_LINE_HEIGHT,
			};
		}
		case "SWITCH_WORKSPACE":
			return {
				...state,
				activeTab: state.activeTab,
				...hydrateFromWorkspace(action.workspace),
				saveFailed: false,
				confirmDelete: false,
				actionError: null,
				isMutating: false,
			};
		default:
			return state;
	}
}

// ── Component ─────────────────────────────────────────────────────

export function SettingsPanel({
	updateState,
	updateActions,
	onClose,
}: SettingsPanelProps) {
	const workspaces = useStore((s) => s.workspaces);
	const activeWorkspaceId = useStore((s) => s.appState.activeWorkspaceId);
	const updateWorkspace = useStore((s) => s.updateWorkspace);
	const removeWorkspace = useStore((s) => s.removeWorkspace);
	const updatePaneConfig = useStore((s) => s.updatePaneConfig);
	const createDefaultWorkspace = useStore((s) => s.createDefaultWorkspace);
	const homeDir = useStore((s) => s.homeDir);

	const initialWorkspace =
		workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0] ?? null;

	const [state, dispatch] = useReducer(
		settingsReducer,
		initialWorkspace,
		initState,
	);

	const selectedWorkspace = workspaces.find((w) => w.id === state.selectedWorkspaceId);
	const pendingSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const confirmDeleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const dialogRef = useRef<HTMLDivElement>(null);

	const update = useCallback(
		(patch: Partial<SettingsState>) => dispatch({ type: "UPDATE", patch }),
		[],
	);

	const effects = useMemo(
		(): Record<EffectCategory, EffectLevel> => ({
			dim: state.dimLevel,
			opacity: state.opacityLevel,
			gradient: state.gradientLevel,
			glow: state.glowLevel,
			scanline: state.scanlineLevel,
			noise: state.noiseLevel,
		}),
		[
			state.dimLevel,
			state.opacityLevel,
			state.gradientLevel,
			state.glowLevel,
			state.scanlineLevel,
			state.noiseLevel,
		],
	);

	const handleEffectChange = useCallback((category: EffectCategory, level: EffectLevel) => {
		dispatch({ type: "SET_EFFECT", category, level });
	}, []);

	const draftTheme = useMemo((): PaneTheme => {
		const preset = findPreset(state.themePreset);
		if (!preset) console.warn("[settings] unknown theme preset:", state.themePreset);
		return {
			background: preset?.background ?? "#1a1a2e",
			foreground: preset?.foreground ?? "#e0e0e0",
			fontSize: state.fontSize,
			unfocusedDim: DIM_VALUES[state.dimLevel],
			...(state.fontFamily ? { fontFamily: state.fontFamily } : {}),
			scrollback: state.scrollback,
			cursorStyle: state.cursorStyle,
			statusBarPosition: state.statusBarPosition,
			paneOpacity: OPACITY_VALUES[state.opacityLevel],
			...(preset?.ansiColors ? { ansiColors: preset.ansiColors } : {}),
			...(preset?.accent ? { accent: preset.accent } : {}),
			...(preset?.glow ? { glow: preset.glow } : {}),
			...(preset?.gradient ? { gradient: preset.gradient } : {}),
			gradientLevel: state.gradientLevel,
			glowLevel: state.glowLevel,
			scanlineLevel: state.scanlineLevel,
			noiseLevel: state.noiseLevel,
			...(preset?.scrollbarAccent ? { scrollbarAccent: preset.scrollbarAccent } : {}),
			...(preset?.cursorColor ? { cursorColor: preset.cursorColor } : {}),
			...(preset?.selectionColor ? { selectionColor: preset.selectionColor } : {}),
			lineHeight: state.lineHeight,
			preset: state.themePreset,
		};
	}, [
		state.cursorStyle,
		state.dimLevel,
		state.fontFamily,
		state.fontSize,
		state.glowLevel,
		state.gradientLevel,
		state.lineHeight,
		state.noiseLevel,
		state.opacityLevel,
		state.scanlineLevel,
		state.scrollback,
		state.statusBarPosition,
		state.themePreset,
	]);

	const buildDraftWorkspace = useCallback(
		(workspace: Workspace): Workspace => ({
			...workspace,
			name: state.name.trim() || workspace.name,
			theme: draftTheme,
		}),
		[state.name, draftTheme],
	);

	/** Persist workspace, surfacing errors to the user via saveFailed indicator. */
	const persistWorkspace = useCallback(
		async (ws: Workspace) => {
			update({ saveFailed: false, actionError: null });
			try {
				await updateWorkspace(ws);
				return true;
			} catch (err: unknown) {
				console.error("[settings] persist failed:", err);
				update({ saveFailed: true });
				return false;
			}
		},
		[updateWorkspace, update],
	);

	const flushWorkspaceDraft = useCallback(
		async (workspaceId: string) => {
			if (pendingSaveTimerRef.current) {
				clearTimeout(pendingSaveTimerRef.current);
				pendingSaveTimerRef.current = null;
			}
			const latest = getLatestWorkspace(workspaceId);
			if (!latest || !hasWorkspaceDraftChanges(latest, state)) return true;
			return persistWorkspace(buildDraftWorkspace(latest));
		},
		[state, persistWorkspace, buildDraftWorkspace],
	);

	// Auto-persist the current draft. Selection changes explicitly flush before switching.
	const prevAutoSaveRef = useRef({
		name: state.name,
		selectedWorkspaceId: state.selectedWorkspaceId,
		theme: draftTheme,
	});
	useEffect(() => {
		if (
			prevAutoSaveRef.current.name === state.name &&
			prevAutoSaveRef.current.selectedWorkspaceId === state.selectedWorkspaceId &&
			prevAutoSaveRef.current.theme === draftTheme
		)
			return;
		prevAutoSaveRef.current = {
			name: state.name,
			selectedWorkspaceId: state.selectedWorkspaceId,
			theme: draftTheme,
		};
		const latest = getLatestWorkspace(state.selectedWorkspaceId);
		if (!latest || !hasWorkspaceDraftChanges(latest, state)) return;
		pendingSaveTimerRef.current = setTimeout(() => {
			void flushWorkspaceDraft(state.selectedWorkspaceId);
		}, 250);
		return () => {
			if (pendingSaveTimerRef.current) {
				clearTimeout(pendingSaveTimerRef.current);
				pendingSaveTimerRef.current = null;
			}
		};
	}, [state, state.name, state.selectedWorkspaceId, draftTheme, flushWorkspaceDraft]);

	useEffect(() => {
		if (selectedWorkspace || workspaces.length === 0) return;
		const fallback =
			workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? workspaces[0];
		if (fallback) {
			dispatch({ type: "SWITCH_WORKSPACE", workspace: fallback });
		}
	}, [selectedWorkspace, workspaces, activeWorkspaceId]);

	const handleSelectWorkspace = useCallback(
		async (id: string) => {
			if (id === state.selectedWorkspaceId || state.isMutating) return;
			update({ isMutating: true, actionError: null });
			const flushed = await flushWorkspaceDraft(state.selectedWorkspaceId);
			if (!flushed) {
				update({ isMutating: false, actionError: "Failed to save workspace changes" });
				return;
			}
			const ws = useStore.getState().workspaces.find((w) => w.id === id);
			if (!ws) {
				update({ isMutating: false, actionError: "Selected workspace is no longer available" });
				return;
			}
			dispatch({ type: "SWITCH_WORKSPACE", workspace: ws });
			update({ isMutating: false });
		},
		[state.selectedWorkspaceId, state.isMutating, flushWorkspaceDraft, update],
	);

	const handleAddWorkspace = useCallback(async () => {
		if (state.isMutating) return;
		update({ isMutating: true, actionError: null });
		const flushed = await flushWorkspaceDraft(state.selectedWorkspaceId);
		if (!flushed) {
			update({ isMutating: false, actionError: "Failed to save workspace changes" });
			return;
		}
		try {
			const ws = await createDefaultWorkspace();
			dispatch({ type: "SWITCH_WORKSPACE", workspace: ws });
		} catch (err) {
			console.error("[settings] failed to create workspace:", err);
			update({ actionError: "Failed to create workspace" });
		} finally {
			update({ isMutating: false });
		}
	}, [createDefaultWorkspace, flushWorkspaceDraft, state.isMutating, state.selectedWorkspaceId, update]);

	const handleDelete = useCallback(async () => {
		if (!state.confirmDelete) {
			update({ confirmDelete: true });
			if (confirmDeleteTimerRef.current) {
				clearTimeout(confirmDeleteTimerRef.current);
			}
			confirmDeleteTimerRef.current = setTimeout(() => update({ confirmDelete: false }), 3000);
			return;
		}
		if (state.isMutating) return;
		const currentId = state.selectedWorkspaceId;
		const stateSnapshot = useStore.getState();
		const remaining = stateSnapshot.workspaces.filter((w) => w.id !== currentId);
		const fallbackSelection =
			remaining.find((workspace) => workspace.id === stateSnapshot.appState.activeWorkspaceId) ??
			remaining[0] ??
			null;
		update({ isMutating: true, actionError: null, confirmDelete: false });
		try {
			await removeWorkspace(currentId);
			if (fallbackSelection) {
				dispatch({ type: "SWITCH_WORKSPACE", workspace: fallbackSelection });
			} else {
				onClose();
			}
		} catch (err) {
			console.error("[settings] failed to delete workspace:", err);
			update({ actionError: "Failed to delete workspace" });
		} finally {
			update({ isMutating: false });
		}
	}, [state.confirmDelete, state.isMutating, state.selectedWorkspaceId, removeWorkspace, onClose, update]);

	// Close on Escape key
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [onClose]);

	useEffect(
		() => () => {
			if (pendingSaveTimerRef.current) clearTimeout(pendingSaveTimerRef.current);
			if (confirmDeleteTimerRef.current) clearTimeout(confirmDeleteTimerRef.current);
		},
		[],
	);

	useModalFocusTrap(dialogRef, true, { initialFocus: "first" });

	const handlePaneUpdate = useCallback(
		(paneId: string, updates: Partial<PaneConfig>) => {
			updatePaneConfig(state.selectedWorkspaceId, paneId, updates);
		},
		[state.selectedWorkspaceId, updatePaneConfig],
	);

	const canDelete = workspaces.length > 1;

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: Escape key handled via document listener above
		<div
			role="presentation"
			className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
			onClick={onClose}
		>
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation only, keyboard handled by overlay */}
			{/* biome-ignore lint/a11y/useSemanticElements: native dialog has styling/focus-trap limitations */}
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-label="Settings"
				className="bg-canvas/80 backdrop-blur-2xl border border-edge/50 rounded-md w-[min(960px,calc(100vw-1.5rem))] h-[85vh] flex flex-col shadow-panel animate-panel-in"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between px-6 py-4 border-b border-edge/50">
					<div className="min-w-0">
						<h2 className="text-sm font-semibold tracking-wide">Settings</h2>
						{state.actionError && (
							<p className="mt-1 text-[10px] text-danger">{state.actionError}</p>
						)}
					</div>
					{state.saveFailed && <span className="text-[10px] text-danger">Save failed</span>}
					<button
						type="button"
						onClick={onClose}
						aria-label="Close settings"
						className="bg-transparent border-none text-content-muted cursor-pointer text-sm hover:text-content focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
					>
						&#x2715;
					</button>
				</div>

				{/* Tab bar */}
				<div className="flex px-6 border-b border-edge/50" role="tablist" aria-label="Settings">
					{SETTINGS_TABS.map((tab) => (
						<button
							key={tab}
							id={`settings-tab-${tab}`}
							type="button"
							role="tab"
							aria-selected={state.activeTab === tab}
							aria-controls={`settings-tabpanel-${tab}`}
							tabIndex={state.activeTab === tab ? 0 : -1}
							onClick={() => update({ activeTab: tab })}
							onKeyDown={(e) => {
								const idx = SETTINGS_TABS.indexOf(tab);
								if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
									e.preventDefault();
									const next =
										e.key === "ArrowRight"
											? SETTINGS_TABS[(idx + 1) % SETTINGS_TABS.length]!
											: SETTINGS_TABS[(idx - 1 + SETTINGS_TABS.length) % SETTINGS_TABS.length]!;
									update({ activeTab: next });
									document.getElementById(`settings-tab-${next}`)?.focus();
								}
							}}
							className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer bg-transparent ${
								state.activeTab === tab
									? "border-accent text-content"
									: "border-transparent text-content-muted hover:text-content-secondary"
							}`}
						>
							{tab}
						</button>
					))}
				</div>

				{/* Workspaces tab — master-detail layout */}
				<div
					id="settings-tabpanel-Workspaces"
					role="tabpanel"
					aria-labelledby="settings-tab-Workspaces"
					hidden={state.activeTab !== "Workspaces"}
					className="flex-1 min-h-0 flex flex-col md:flex-row"
				>
					<WorkspaceList
						workspaces={workspaces}
						selectedId={state.selectedWorkspaceId}
						onSelect={(id) => void handleSelectWorkspace(id)}
						onAdd={() => void handleAddWorkspace()}
						disabled={state.isMutating}
					/>
					{selectedWorkspace && (
						<WorkspaceDetail
							workspaceId={selectedWorkspace.id}
							panes={selectedWorkspace.panes}
							name={state.name}
							onNameChange={(v) => update({ name: v })}
							homeDir={homeDir}
							statusBarPosition={state.statusBarPosition}
							onStatusBarPositionChange={(v) => update({ statusBarPosition: v })}
							onPaneUpdate={handlePaneUpdate}
							selectedPreset={state.themePreset}
							onPresetChange={(name) => dispatch({ type: "APPLY_PRESET", preset: name })}
							fontFamily={state.fontFamily}
							onFontFamilyChange={(v) => update({ fontFamily: v })}
							fontSize={state.fontSize}
							onFontSizeChange={(v) => update({ fontSize: v })}
							lineHeight={state.lineHeight}
							onLineHeightChange={(v) => update({ lineHeight: v })}
							cursorStyle={state.cursorStyle}
							onCursorStyleChange={(v) => update({ cursorStyle: v })}
							scrollback={state.scrollback}
							onScrollbackChange={(v) => update({ scrollback: v })}
							effects={effects}
							onEffectChange={handleEffectChange}
						/>
					)}
					{!selectedWorkspace && (
						<div className="flex-1 min-h-0 flex items-center justify-center px-6 py-10">
							<div className="max-w-sm text-center space-y-3">
								<h3 className="text-sm font-medium text-content">No workspace selected</h3>
								<p className="text-xs leading-5 text-content-muted">
									Create or reopen a workspace to edit its settings here.
								</p>
								<button
									type="button"
									onClick={() => void handleAddWorkspace()}
									disabled={state.isMutating}
									className="border border-edge rounded-sm px-3 py-1.5 text-xs text-content-secondary hover:text-content hover:border-content-muted focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none disabled:opacity-60 disabled:cursor-wait"
								>
									Create workspace
								</button>
							</div>
						</div>
					)}
				</div>

				<GlobalTabPanel hidden={state.activeTab !== "Global"} />

				<AboutTabPanel
					updateState={updateState}
					updateActions={updateActions}
					hidden={state.activeTab !== "About"}
				/>

				<div className="flex items-center gap-2 px-6 py-3 border-t border-edge/50">
					{state.activeTab === "Workspaces" && canDelete && (
						<button
							type="button"
							onClick={() => void handleDelete()}
							disabled={state.isMutating}
							className={`border cursor-pointer text-xs py-1.5 px-3 rounded-sm focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none ${
								state.confirmDelete
									? "bg-danger text-white border-danger"
									: "bg-transparent border-danger text-danger hover:bg-danger/10"
							} ${state.isMutating ? "opacity-60 cursor-wait" : ""}`}
						>
							{state.confirmDelete ? "Are you sure?" : "Delete Workspace"}
						</button>
					)}
					<div className="flex-1" />
					<button
						type="button"
						onClick={onClose}
						className="bg-transparent border border-edge text-content-secondary cursor-pointer text-xs py-1.5 px-3 rounded-sm hover:text-content hover:border-content-muted focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
					>
						Done
					</button>
				</div>
			</div>
		</div>
	);
}
