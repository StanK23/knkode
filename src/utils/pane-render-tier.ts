import type { PaneRenderTier, Workspace } from "../shared/types";
import { getActiveSubgroup, getPaneIdsInOrder } from "../store/layout-tree";

interface PaneRenderTierInput {
	workspaces: readonly Workspace[];
	openWorkspaceIds: readonly string[];
	activeWorkspaceId: string | null;
	visitedWorkspaceIds: readonly string[];
	focusedPaneId: string | null;
	activePtyIds: ReadonlySet<string>;
}

export function isForegroundPaneRenderTier(tier: PaneRenderTier): boolean {
	return tier === "focused-visible" || tier === "visible";
}

/** Classify active PTY panes by visibility/focus so the backend can vary only
 *  snapshot emission cadence. */
export function getPaneRenderTiers({
	workspaces,
	openWorkspaceIds,
	activeWorkspaceId,
	visitedWorkspaceIds,
	focusedPaneId,
	activePtyIds,
}: PaneRenderTierInput): Record<string, PaneRenderTier> {
	const tiers: Record<string, PaneRenderTier> = {};
	if (activePtyIds.size === 0) return tiers;

	const openSet = new Set(openWorkspaceIds);
	const visitedSet = new Set(visitedWorkspaceIds);

	for (const paneId of activePtyIds) {
		tiers[paneId] = "unmounted";
	}

	for (const workspace of workspaces) {
		if (!openSet.has(workspace.id)) continue;

		const visiblePaneIds = new Set(getPaneIdsInOrder(getActiveSubgroup(workspace).layout.tree));
		const workspaceTier: PaneRenderTier =
			workspace.id === activeWorkspaceId
				? "visible"
				: visitedSet.has(workspace.id)
					? "hidden-mounted"
					: "unmounted";

		for (const paneId of Object.keys(workspace.panes)) {
			if (!activePtyIds.has(paneId)) continue;
			if (!visiblePaneIds.has(paneId)) {
				tiers[paneId] = "unmounted";
				continue;
			}
			tiers[paneId] =
				workspaceTier === "visible" && paneId === focusedPaneId
					? "focused-visible"
					: workspaceTier;
		}
	}

	return tiers;
}
