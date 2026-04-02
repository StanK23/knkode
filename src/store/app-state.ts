import type { AppState } from "../shared/types";

export const DEFAULT_WINDOW_BOUNDS: AppState["windowBounds"] = {
	x: 100,
	y: 100,
	width: 1200,
	height: 800,
};

const DEFAULT_APP_STATE: AppState = {
	openWorkspaceIds: [],
	activeWorkspaceId: null,
	sidebarCollapsed: false,
	collapsedWorkspaceIds: [],
	windowBounds: DEFAULT_WINDOW_BOUNDS,
};

function isFiniteNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}

export function isWindowBounds(value: unknown): value is AppState["windowBounds"] {
	if (typeof value !== "object" || value === null) return false;
	const bounds = value as Record<string, unknown>;
	return (
		isFiniteNumber(bounds.x) &&
		isFiniteNumber(bounds.y) &&
		isFiniteNumber(bounds.width) &&
		isFiniteNumber(bounds.height)
	);
}

function uniqueStrings(value: unknown, allowedIds?: ReadonlySet<string>): string[] {
	if (!Array.isArray(value)) return [];
	const next: string[] = [];
	for (const item of value) {
		if (typeof item !== "string") continue;
		if (allowedIds && !allowedIds.has(item)) continue;
		if (!next.includes(item)) next.push(item);
	}
	return next;
}

export function sanitizeAppState(
	value: unknown,
	validWorkspaceIds: readonly string[] = [],
): AppState {
	if (typeof value !== "object" || value === null) return DEFAULT_APP_STATE;

	const raw = value as Record<string, unknown>;
	const allowedIds = validWorkspaceIds.length > 0 ? new Set(validWorkspaceIds) : null;
	const openWorkspaceIds = uniqueStrings(raw.openWorkspaceIds, allowedIds ?? undefined);
	const collapsedWorkspaceIds = uniqueStrings(raw.collapsedWorkspaceIds, allowedIds ?? undefined);
	const activeWorkspaceId =
		typeof raw.activeWorkspaceId === "string" &&
		(allowedIds === null || allowedIds.has(raw.activeWorkspaceId))
			? raw.activeWorkspaceId
			: null;

	return {
		openWorkspaceIds,
		activeWorkspaceId:
			activeWorkspaceId && openWorkspaceIds.includes(activeWorkspaceId)
				? activeWorkspaceId
				: (openWorkspaceIds[0] ?? null),
		sidebarCollapsed:
			typeof raw.sidebarCollapsed === "boolean"
				? raw.sidebarCollapsed
				: DEFAULT_APP_STATE.sidebarCollapsed,
		collapsedWorkspaceIds,
		windowBounds: isWindowBounds(raw.windowBounds) ? raw.windowBounds : DEFAULT_WINDOW_BOUNDS,
	};
}
