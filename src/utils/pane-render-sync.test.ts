import { describe, expect, it } from "vitest";
import {
	getPaneRenderTierChanges,
	prunePaneRenderTiers,
} from "./pane-render-sync";

describe("getPaneRenderTierChanges", () => {
	it("refreshes only hidden-mounted panes promoted into the foreground", () => {
		expect(
			getPaneRenderTierChanges(
				{
					"pane-a": "hidden-mounted",
					"pane-b": "unmounted",
					"pane-c": "visible",
				},
				{
					"pane-a": "focused-visible",
					"pane-b": "focused-visible",
					"pane-c": "hidden-mounted",
				},
			),
		).toEqual([
			{
				paneId: "pane-a",
				nextTier: "focused-visible",
				shouldRefreshMountedPane: true,
			},
			{
				paneId: "pane-b",
				nextTier: "focused-visible",
				shouldRefreshMountedPane: false,
			},
			{
				paneId: "pane-c",
				nextTier: "hidden-mounted",
				shouldRefreshMountedPane: false,
			},
		]);
	});
});

describe("prunePaneRenderTiers", () => {
	it("drops pane ids that no longer exist in the current tier map", () => {
		expect(
			prunePaneRenderTiers(
				{
					"pane-a": "visible",
					"pane-b": "hidden-mounted",
				},
				{
					"pane-a": "focused-visible",
				},
			),
		).toEqual({
			"pane-a": "visible",
		});
	});
});
