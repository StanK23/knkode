import { describe, expect, it } from "vitest";
import { getActivePaneId, makePaneConfig } from "./layout-tree";

describe("makePaneConfig", () => {
	it("defaults shell to null", () => {
		expect(makePaneConfig("terminal", "/tmp")).toEqual({
			label: "terminal",
			cwd: "/tmp",
			shell: null,
			startupCommand: null,
			themeOverride: null,
		});
	});

	it("preserves an explicitly provided shell", () => {
		expect(makePaneConfig("terminal", "C:\\repo", "pwsh.exe")).toEqual({
			label: "terminal",
			cwd: "C:\\repo",
			shell: "pwsh.exe",
			startupCommand: null,
			themeOverride: null,
		});
	});
});

describe("getActivePaneId", () => {
	it("returns the first pane from the active subgroup tree", () => {
		expect(
			getActivePaneId({
				id: "ws-1",
				name: "Workspace",
				theme: {
					background: "#111111",
					foreground: "#eeeeee",
					fontSize: 14,
					unfocusedDim: 0.3,
				},
				subgroups: [
					{
						id: "sg-hidden",
						layout: { type: "custom", tree: { paneId: "hidden-pane", size: 100 } },
					},
					{
						id: "sg-visible",
						layout: { type: "custom", tree: { paneId: "visible-pane", size: 100 } },
					},
				],
				activeSubgroupId: "sg-visible",
				panes: {
					"hidden-pane": makePaneConfig("terminal", "/tmp"),
					"visible-pane": makePaneConfig("terminal", "/tmp"),
				},
				snippets: [],
			}),
		).toBe("visible-pane");
	});
});
