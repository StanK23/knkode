import { describe, expect, it } from "vitest";
import type { Workspace } from "../shared/types";
import {
	getPaneRenderTiers,
	isForegroundPaneRenderTier,
} from "./pane-render-tier";

function makeWorkspace(
	id: string,
	activeSubgroupId: string,
	subgroups: Workspace["subgroups"],
	paneIds: string[],
): Workspace {
	return {
		id,
		name: id,
		theme: {
			background: "#111111",
			foreground: "#eeeeee",
			fontSize: 14,
			unfocusedDim: 0.3,
		},
		subgroups,
		activeSubgroupId,
		panes: Object.fromEntries(
			paneIds.map((paneId) => [
				paneId,
				{
					label: paneId,
					cwd: "/tmp",
					shell: null,
					startupCommand: null,
					themeOverride: null,
				},
			]),
		),
		snippets: [],
	};
}

describe("isForegroundPaneRenderTier", () => {
	it("recognizes focused and visible tiers as foreground", () => {
		expect(isForegroundPaneRenderTier("focused-visible")).toBe(true);
		expect(isForegroundPaneRenderTier("visible")).toBe(true);
		expect(isForegroundPaneRenderTier("hidden-mounted")).toBe(false);
		expect(isForegroundPaneRenderTier("unmounted")).toBe(false);
	});
});

describe("getPaneRenderTiers", () => {
	const workspaceA = makeWorkspace(
		"ws-a",
		"sg-a",
		[
			{
				id: "sg-a",
				layout: {
					type: "custom",
					tree: {
						direction: "horizontal",
						size: 100,
						children: [
							{ paneId: "pane-a1", size: 50 },
							{ paneId: "pane-a2", size: 50 },
						],
					},
				},
			},
			{
				id: "sg-a-hidden",
				layout: {
					type: "custom",
					tree: { paneId: "pane-a3", size: 100 },
				},
			},
		],
		["pane-a1", "pane-a2", "pane-a3"],
	);

	const workspaceB = makeWorkspace(
		"ws-b",
		"sg-b",
		[
			{
				id: "sg-b",
				layout: {
					type: "custom",
					tree: { paneId: "pane-b1", size: 100 },
				},
			},
		],
		["pane-b1"],
	);

	it("marks active subgroup panes as visible and the focused pane as focused-visible", () => {
		expect(
			getPaneRenderTiers({
				workspaces: [workspaceA],
				openWorkspaceIds: ["ws-a"],
				activeWorkspaceId: "ws-a",
				visitedWorkspaceIds: ["ws-a"],
				focusedPaneId: "pane-a2",
				activePtyIds: new Set(["pane-a1", "pane-a2", "pane-a3"]),
			}),
		).toEqual({
			"pane-a1": "visible",
			"pane-a2": "focused-visible",
			"pane-a3": "unmounted",
		});
	});

	it("marks visited inactive workspaces as hidden-mounted", () => {
		expect(
			getPaneRenderTiers({
				workspaces: [workspaceA, workspaceB],
				openWorkspaceIds: ["ws-a", "ws-b"],
				activeWorkspaceId: "ws-a",
				visitedWorkspaceIds: ["ws-a", "ws-b"],
				focusedPaneId: "pane-a1",
				activePtyIds: new Set(["pane-a1", "pane-b1"]),
			}),
		).toEqual({
			"pane-a1": "focused-visible",
			"pane-b1": "hidden-mounted",
		});
	});

	it("leaves active PTYs in unopened or inactive subgroups as unmounted", () => {
		expect(
			getPaneRenderTiers({
				workspaces: [workspaceA, workspaceB],
				openWorkspaceIds: ["ws-a"],
				activeWorkspaceId: "ws-a",
				visitedWorkspaceIds: ["ws-a"],
				focusedPaneId: "pane-a1",
				activePtyIds: new Set(["pane-a1", "pane-a3", "pane-b1"]),
			}),
		).toEqual({
			"pane-a1": "focused-visible",
			"pane-a3": "unmounted",
			"pane-b1": "unmounted",
		});
	});
});
