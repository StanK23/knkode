import type { PaneRenderTier } from "../shared/types";
import { isForegroundPaneRenderTier } from "./pane-render-tier";

export interface PaneRenderTierChange {
	readonly paneId: string;
	readonly nextTier: PaneRenderTier;
	readonly shouldRefreshMountedPane: boolean;
}

export function getPaneRenderTierChanges(
	previousTiers: Readonly<Record<string, PaneRenderTier>>,
	currentTiers: Readonly<Record<string, PaneRenderTier>>,
): PaneRenderTierChange[] {
	const paneIds = new Set([
		...Object.keys(previousTiers),
		...Object.keys(currentTiers),
	]);
	const changes: PaneRenderTierChange[] = [];

	for (const paneId of paneIds) {
		const nextTier = currentTiers[paneId];
		if (!nextTier) continue;

		const previousTier = previousTiers[paneId];
		if (previousTier === nextTier) continue;

		changes.push({
			paneId,
			nextTier,
			shouldRefreshMountedPane:
				previousTier === "hidden-mounted" && isForegroundPaneRenderTier(nextTier),
		});
	}

	return changes;
}

export function prunePaneRenderTiers(
	tiers: Readonly<Record<string, PaneRenderTier>>,
	currentTiers: Readonly<Record<string, PaneRenderTier>>,
): Record<string, PaneRenderTier> {
	return Object.fromEntries(
		Object.entries(tiers).filter(([paneId]) => paneId in currentTiers),
	);
}
