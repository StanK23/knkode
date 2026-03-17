import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkspaceStore } from "../workspace";

// Mock Tauri IPC — all terminal operations are async and call invoke/listen
vi.mock("@tauri-apps/api/core", () => ({
	invoke: vi.fn(async (cmd: string) => {
		if (cmd === "create_terminal") return "mock-terminal-id";
		if (cmd === "get_terminal_state")
			return {
				rows: 24,
				cols: 80,
				cells: [],
				cursor: { line: 0, col: 0, visible: true },
			};
		return undefined;
	}),
}));

vi.mock("@tauri-apps/api/event", () => ({
	listen: vi.fn(async () => () => {}),
}));

/** Get activePaneId with a preceding assertion so Biome doesn't require non-null assertions. */
function getActivePaneId(): string {
	const id = useWorkspaceStore.getState().activePaneId;
	if (!id) throw new Error("Expected activePaneId to be set");
	return id;
}

function resetStore() {
	useWorkspaceStore.setState({
		workspaces: {},
		openWorkspaceIds: [],
		activeWorkspaceId: null,
		activePaneId: null,
		visitedWorkspaceIds: new Set<string>(),
		paneTerminals: {},
	});
}

describe("workspace store", () => {
	beforeEach(() => {
		resetStore();
	});

	// -- createWorkspace --

	describe("createWorkspace", () => {
		it("creates a workspace with default single preset", () => {
			const id = useWorkspaceStore.getState().createWorkspace();
			const state = useWorkspaceStore.getState();

			expect(state.workspaces[id]).toBeDefined();
			expect(state.openWorkspaceIds).toContain(id);
			expect(state.activeWorkspaceId).toBe(id);
			expect(state.activePaneId).toBeTruthy();
			expect(state.visitedWorkspaceIds.has(id)).toBe(true);
		});

		it("creates workspace with custom name and preset", () => {
			const id = useWorkspaceStore.getState().createWorkspace("2-column", "Dev");
			const ws = useWorkspaceStore.getState().workspaces[id];

			expect(ws).toBeDefined();
			expect(ws?.name).toBe("Dev");
			expect(ws?.layout.type).toBe("preset");
			expect(Object.keys(ws?.panes ?? {})).toHaveLength(2);
		});

		it("cycles through workspace colors", () => {
			const id1 = useWorkspaceStore.getState().createWorkspace();
			const id2 = useWorkspaceStore.getState().createWorkspace();
			const state = useWorkspaceStore.getState();

			expect(state.workspaces[id1]?.color).not.toBe(state.workspaces[id2]?.color);
		});

		it("sets active workspace and pane to the newly created one", () => {
			useWorkspaceStore.getState().createWorkspace();
			const id2 = useWorkspaceStore.getState().createWorkspace();
			const state = useWorkspaceStore.getState();

			expect(state.activeWorkspaceId).toBe(id2);
		});
	});

	// -- duplicateWorkspace --

	describe("duplicateWorkspace", () => {
		it("duplicates a workspace with new IDs", () => {
			const id = useWorkspaceStore.getState().createWorkspace("2-column", "Original");
			const dupId = useWorkspaceStore.getState().duplicateWorkspace(id);

			expect(dupId).toBeTruthy();
			const state = useWorkspaceStore.getState();
			const dup = dupId ? state.workspaces[dupId] : undefined;

			expect(dup).toBeDefined();
			expect(dup?.name).toBe("Original (copy)");
			expect(Object.keys(dup?.panes ?? {})).toHaveLength(2);

			// Pane IDs should differ from original
			const origPaneIds = Object.keys(state.workspaces[id]?.panes ?? {});
			const dupPaneIds = Object.keys(dup?.panes ?? {});
			for (const pid of dupPaneIds) {
				expect(origPaneIds).not.toContain(pid);
			}
		});

		it("returns null for non-existent workspace", () => {
			const result = useWorkspaceStore.getState().duplicateWorkspace("non-existent");
			expect(result).toBeNull();
		});
	});

	// -- removeWorkspace --

	describe("removeWorkspace", () => {
		it("removes the workspace and cleans up state", () => {
			const id = useWorkspaceStore.getState().createWorkspace();
			// After removing, a new default workspace is auto-created
			useWorkspaceStore.getState().removeWorkspace(id);
			const state = useWorkspaceStore.getState();

			expect(state.workspaces[id]).toBeUndefined();
			// Auto-creates a new workspace when last one is removed
			expect(state.openWorkspaceIds).toHaveLength(1);
			expect(state.activeWorkspaceId).toBeTruthy();
		});

		it("switches active to adjacent workspace on removal", () => {
			const id1 = useWorkspaceStore.getState().createWorkspace();
			const id2 = useWorkspaceStore.getState().createWorkspace();
			const id3 = useWorkspaceStore.getState().createWorkspace();

			// Active is id3, remove it
			useWorkspaceStore.getState().removeWorkspace(id3);
			const state = useWorkspaceStore.getState();

			expect(state.activeWorkspaceId).toBe(id2);
			expect(state.openWorkspaceIds).toEqual([id1, id2]);
		});

		it("does nothing for non-existent workspace", () => {
			const id = useWorkspaceStore.getState().createWorkspace();
			useWorkspaceStore.getState().removeWorkspace("non-existent");
			const state = useWorkspaceStore.getState();

			expect(state.openWorkspaceIds).toHaveLength(1);
			expect(state.workspaces[id]).toBeDefined();
		});
	});

	// -- renameWorkspace --

	describe("renameWorkspace", () => {
		it("renames a workspace", () => {
			const id = useWorkspaceStore.getState().createWorkspace();
			useWorkspaceStore.getState().renameWorkspace(id, "New Name");

			expect(useWorkspaceStore.getState().workspaces[id]?.name).toBe("New Name");
		});

		it("does nothing for non-existent workspace", () => {
			useWorkspaceStore.getState().renameWorkspace("non-existent", "Name");
			// No error thrown
		});
	});

	// -- setWorkspaceColor --

	describe("setWorkspaceColor", () => {
		it("changes workspace color", () => {
			const id = useWorkspaceStore.getState().createWorkspace();
			useWorkspaceStore.getState().setWorkspaceColor(id, "#e74c3c");

			expect(useWorkspaceStore.getState().workspaces[id]?.color).toBe("#e74c3c");
		});
	});

	// -- reorderWorkspaces --

	describe("reorderWorkspaces", () => {
		it("reorders open workspace IDs", () => {
			const id1 = useWorkspaceStore.getState().createWorkspace();
			const id2 = useWorkspaceStore.getState().createWorkspace();
			const id3 = useWorkspaceStore.getState().createWorkspace();

			useWorkspaceStore.getState().reorderWorkspaces([id3, id1, id2]);

			expect(useWorkspaceStore.getState().openWorkspaceIds).toEqual([id3, id1, id2]);
		});
	});

	// -- setActiveWorkspace --

	describe("setActiveWorkspace", () => {
		it("sets active workspace and first pane", () => {
			const id1 = useWorkspaceStore.getState().createWorkspace();
			useWorkspaceStore.getState().createWorkspace();
			useWorkspaceStore.getState().setActiveWorkspace(id1);

			const state = useWorkspaceStore.getState();
			expect(state.activeWorkspaceId).toBe(id1);
			expect(state.activePaneId).toBeTruthy();
		});

		it("does nothing for non-existent workspace", () => {
			const id = useWorkspaceStore.getState().createWorkspace();
			useWorkspaceStore.getState().setActiveWorkspace("non-existent");

			expect(useWorkspaceStore.getState().activeWorkspaceId).toBe(id);
		});
	});

	// -- setActivePane --

	describe("setActivePane", () => {
		it("sets the active pane ID", () => {
			useWorkspaceStore.getState().createWorkspace();
			useWorkspaceStore.getState().setActivePane("some-pane-id");

			expect(useWorkspaceStore.getState().activePaneId).toBe("some-pane-id");
		});
	});

	// -- splitPane --

	describe("splitPane", () => {
		it("splits a pane and sets new pane as active", () => {
			const id = useWorkspaceStore.getState().createWorkspace();
			const paneId = getActivePaneId();

			useWorkspaceStore.getState().splitPane(paneId, "horizontal");

			const after = useWorkspaceStore.getState();
			const ws = after.workspaces[id];
			expect(ws?.layout.type).toBe("custom");
			expect(Object.keys(ws?.panes ?? {})).toHaveLength(2);
			expect(after.activePaneId).not.toBe(paneId);
		});

		it("does nothing for non-existent pane", () => {
			useWorkspaceStore.getState().createWorkspace();
			const before = useWorkspaceStore.getState().activePaneId;
			useWorkspaceStore.getState().splitPane("non-existent", "horizontal");

			expect(useWorkspaceStore.getState().activePaneId).toBe(before);
		});
	});

	// -- closePane --

	describe("closePane", () => {
		it("closes a pane and updates active pane", () => {
			const id = useWorkspaceStore.getState().createWorkspace();
			const paneId = getActivePaneId();

			// Split to have 2 panes
			useWorkspaceStore.getState().splitPane(paneId, "horizontal");
			const newPaneId = getActivePaneId();
			expect(newPaneId).not.toBe(paneId);

			// Close the new pane
			useWorkspaceStore.getState().closePane(newPaneId);

			const after = useWorkspaceStore.getState();
			expect(Object.keys(after.workspaces[id]?.panes ?? {})).toHaveLength(1);
			expect(after.activePaneId).toBe(paneId);
		});

		it("removes workspace when last pane is closed", () => {
			const id = useWorkspaceStore.getState().createWorkspace();
			const paneId = getActivePaneId();

			useWorkspaceStore.getState().closePane(paneId);

			const after = useWorkspaceStore.getState();
			// Workspace was removed but a new default one was auto-created
			expect(after.workspaces[id]).toBeUndefined();
			expect(after.openWorkspaceIds).toHaveLength(1);
		});
	});

	// -- updatePaneSizes --

	describe("updatePaneSizes", () => {
		it("updates sizes at a given path", () => {
			const id = useWorkspaceStore.getState().createWorkspace();
			const paneId = getActivePaneId();

			// Split to create a branch
			useWorkspaceStore.getState().splitPane(paneId, "horizontal");
			const ws = useWorkspaceStore.getState().workspaces[id];
			expect(ws?.layout.tree.type).toBe("branch");

			// Update sizes at root
			useWorkspaceStore.getState().updatePaneSizes(id, [], [60, 40]);

			const after = useWorkspaceStore.getState().workspaces[id];
			if (after?.layout.tree.type === "branch") {
				expect(after.layout.tree.children[0]?.size).toBe(60);
				expect(after.layout.tree.children[1]?.size).toBe(40);
			}
		});
	});

	// -- initPane (async with IPC mock) --

	describe("initPane", () => {
		it("creates terminal and stores state", async () => {
			useWorkspaceStore.getState().createWorkspace();
			const paneId = getActivePaneId();

			await useWorkspaceStore.getState().initPane(paneId);

			const terminal = useWorkspaceStore.getState().paneTerminals[paneId];
			expect(terminal).toBeDefined();
			expect(terminal?.terminalId).toBe("mock-terminal-id");
			expect(terminal?.connected).toBe(true);
			expect(terminal?.grid).toBeDefined();
		});

		it("skips if terminal already initialized", async () => {
			const { invoke } = await import("@tauri-apps/api/core");
			useWorkspaceStore.getState().createWorkspace();
			const paneId = getActivePaneId();

			await useWorkspaceStore.getState().initPane(paneId);
			const callCount = vi.mocked(invoke).mock.calls.length;

			await useWorkspaceStore.getState().initPane(paneId);
			// No additional create_terminal call
			expect(vi.mocked(invoke).mock.calls.length).toBe(callCount);
		});
	});

	// -- subscribeToEvents --

	describe("subscribeToEvents", () => {
		it("returns an unsubscribe function", async () => {
			const unsub = await useWorkspaceStore.getState().subscribeToEvents();
			expect(typeof unsub).toBe("function");
			unsub();
		});
	});
});
