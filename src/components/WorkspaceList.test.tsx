// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Workspace } from "../shared/types";
import { WorkspaceList } from "./WorkspaceList";

function makeWorkspace(id: string, name: string): Workspace {
	return {
		id,
		name,
		theme: {
			background: "#111111",
			foreground: "#eeeeee",
			fontSize: 14,
			unfocusedDim: 0.3,
		},
		subgroups: [
			{
				id: `${id}-sg`,
				layout: {
					type: "preset",
					preset: "single",
					tree: { paneId: `${id}-pane`, size: 100 },
				},
			},
		],
		activeSubgroupId: `${id}-sg`,
		panes: {
			[`${id}-pane`]: {
				label: "terminal",
				cwd: "/tmp",
				shell: null,
				startupCommand: null,
				themeOverride: null,
			},
		},
		snippets: [],
	};
}

describe("WorkspaceList", () => {
	afterEach(() => {
		cleanup();
	});

	it("uses navigation semantics instead of listbox semantics", () => {
		render(
			<WorkspaceList
				workspaces={[makeWorkspace("ws-1", "Alpha"), makeWorkspace("ws-2", "Beta")]}
				selectedId="ws-2"
				onSelect={() => {}}
				onAdd={() => {}}
			/>,
		);

		expect(screen.getByRole("navigation", { name: "Workspaces" })).not.toBeNull();
		expect(screen.queryByRole("listbox")).toBeNull();
		expect(screen.getByRole("button", { name: "Beta" }).getAttribute("aria-current")).toBe("true");
		expect(screen.getByRole("button", { name: "Beta" }).getAttribute("aria-pressed")).toBe("true");
	});

	it("keeps actions inert while disabled", () => {
		const onSelect = vi.fn();
		const onAdd = vi.fn();

		render(
			<WorkspaceList
				workspaces={[makeWorkspace("ws-1", "Alpha"), makeWorkspace("ws-2", "Beta")]}
				selectedId="ws-1"
				onSelect={onSelect}
				onAdd={onAdd}
				disabled
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Beta" }));
		fireEvent.click(screen.getByRole("button", { name: "+ New Workspace" }));

		expect(onSelect).not.toHaveBeenCalled();
		expect(onAdd).not.toHaveBeenCalled();
	});
});
