import { describe, expect, it } from "vitest";
import { DEFAULT_WINDOW_BOUNDS, sanitizeAppState } from "./app-state";

describe("sanitizeAppState", () => {
	it("returns defaults for malformed persisted state", () => {
		expect(sanitizeAppState(null)).toEqual({
			openWorkspaceIds: [],
			activeWorkspaceId: null,
			sidebarCollapsed: false,
			collapsedWorkspaceIds: [],
			windowBounds: DEFAULT_WINDOW_BOUNDS,
		});
	});

	it("filters invalid workspace ids and coerces active workspace to a visible tab", () => {
		expect(
			sanitizeAppState(
				{
					openWorkspaceIds: ["ws-1", "ws-1", "stale", 42],
					activeWorkspaceId: "stale",
					sidebarCollapsed: true,
					collapsedWorkspaceIds: ["ws-2", "stale"],
					windowBounds: { x: 10, y: 20, width: 1300, height: 900 },
				},
				["ws-1", "ws-2"],
			),
		).toEqual({
			openWorkspaceIds: ["ws-1"],
			activeWorkspaceId: "ws-1",
			sidebarCollapsed: true,
			collapsedWorkspaceIds: ["ws-2"],
			windowBounds: { x: 10, y: 20, width: 1300, height: 900 },
		});
	});

	it("falls back when window bounds are invalid", () => {
		expect(
			sanitizeAppState({
				openWorkspaceIds: ["ws-1"],
				activeWorkspaceId: "ws-1",
				windowBounds: { x: 0, y: 0, width: "wide", height: 900 },
			}),
		).toEqual({
			openWorkspaceIds: ["ws-1"],
			activeWorkspaceId: "ws-1",
			sidebarCollapsed: false,
			collapsedWorkspaceIds: [],
			windowBounds: DEFAULT_WINDOW_BOUNDS,
		});
	});
});
