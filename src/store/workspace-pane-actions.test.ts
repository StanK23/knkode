import { describe, expect, it } from "vitest";
import type { Workspace } from "../shared/types";
import type { AppState } from "../shared/types";
import {
	mergeAppStatePreservingWindowBounds,
	updateWorkspacePaneCwd,
} from "./workspace-pane-actions";

function makeWorkspace(): Workspace {
	return {
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
				id: "sg-1",
				layout: {
					type: "preset",
					preset: "single",
					tree: { paneId: "pane-1", size: 100 },
				},
			},
		],
		activeSubgroupId: "sg-1",
		panes: {
			"pane-1": {
				label: "terminal",
				cwd: "C:\\Users\\kenko",
				shell: null,
				startupCommand: null,
				themeOverride: null,
			},
		},
		snippets: [],
	};
}

describe("updateWorkspacePaneCwd", () => {
	it("returns a workspace copy with the pane cwd updated", () => {
		const workspace = makeWorkspace();
		const updated = updateWorkspacePaneCwd(workspace, "pane-1", "C:\\Projects\\knkode");

		expect(updated).not.toBeNull();
		expect(updated?.panes["pane-1"]?.cwd).toBe("C:\\Projects\\knkode");
		expect(workspace.panes["pane-1"]?.cwd).toBe("C:\\Users\\kenko");
	});

	it("returns null when the pane cwd is unchanged", () => {
		const workspace = makeWorkspace();
		expect(updateWorkspacePaneCwd(workspace, "pane-1", "C:\\Users\\kenko")).toBeNull();
	});

	it("returns null when the pane does not exist", () => {
		const workspace = makeWorkspace();
		expect(updateWorkspacePaneCwd(workspace, "missing-pane", "C:\\Projects\\knkode")).toBeNull();
	});
});

describe("mergeAppStatePreservingWindowBounds", () => {
	it("preserves persisted window bounds when saving other app state changes", () => {
		const nextState: AppState = {
			openWorkspaceIds: ["ws-1", "ws-2"],
			activeWorkspaceId: "ws-2",
			sidebarCollapsed: true,
			collapsedWorkspaceIds: ["ws-1"],
			windowBounds: { x: 100, y: 100, width: 1200, height: 800 },
		};
		const persistedState: Partial<AppState> = {
			windowBounds: { x: 640, y: 320, width: 1440, height: 900 },
		};

		expect(mergeAppStatePreservingWindowBounds(nextState, persistedState)).toEqual({
			...nextState,
			windowBounds: persistedState.windowBounds!,
		});
	});

	it("keeps in-memory window bounds when persisted bounds are missing", () => {
		const nextState: AppState = {
			openWorkspaceIds: ["ws-1"],
			activeWorkspaceId: "ws-1",
			sidebarCollapsed: false,
			collapsedWorkspaceIds: [],
			windowBounds: { x: 120, y: 90, width: 1280, height: 820 },
		};

		expect(mergeAppStatePreservingWindowBounds(nextState, null)).toEqual(nextState);
	});
});
