// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Workspace } from "../shared/types";
import { useStore } from "../store";
import { GlobalTabPanel } from "./GlobalTabPanel";
import { SnippetsSection } from "./SnippetsSection";

vi.mock("../hooks/useDragReorder", () => ({
	useDragReorder: () => ({
		dragFromIndex: null,
		dragOverIndex: null,
		handlePointerDown: () => {},
	}),
}));

const baseStoreState = useStore.getState();

function makeWorkspace(): Workspace {
	return {
		id: "ws-1",
		name: "Workspace One",
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
				cwd: "/tmp",
				shell: null,
				startupCommand: null,
				themeOverride: null,
			},
		},
		snippets: [{ id: "w-1", name: "Workspace snippet", command: "echo local" }],
	};
}

describe("snippet panel scope", () => {
	afterEach(() => {
		cleanup();
		useStore.setState(baseStoreState);
	});

	it("keeps the shared tab isolated to shared snippets", () => {
		useStore.setState({
			...baseStoreState,
			snippets: [{ id: "g-1", name: "Global snippet", command: "echo global" }],
			workspaces: [makeWorkspace()],
		});

		render(<GlobalTabPanel hidden={false} />);

		expect(screen.getAllByText("Shared commands").length).toBeGreaterThan(0);
		expect(screen.getByText("Global snippet")).not.toBeNull();
		expect(screen.queryByText("Workspace snippet")).toBeNull();
	});

	it("keeps combined snippet sections separated by scope", () => {
		useStore.setState({
			...baseStoreState,
			snippets: [{ id: "g-1", name: "Global snippet", command: "echo global" }],
			workspaces: [makeWorkspace()],
		});

		render(<SnippetsSection workspaceId="ws-1" />);

		expect(screen.getByText("Global snippet")).not.toBeNull();
		expect(screen.getByText("Workspace snippet")).not.toBeNull();
		expect(screen.getByText("Workspace One snippets — only available in this workspace")).not.toBeNull();
	});
});
