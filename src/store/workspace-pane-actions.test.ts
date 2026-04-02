import { describe, expect, it } from "vitest";
import type { Workspace } from "../shared/types";
import { updateWorkspacePaneCwd } from "./workspace-pane-actions";

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
