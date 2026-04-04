// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Workspace } from "../shared/types";
import { useStore } from "../store";
import { SettingsPanel } from "./SettingsPanel";

vi.mock("../hooks/useModalFocusTrap", () => ({
	useModalFocusTrap: () => {},
}));

vi.mock("./AboutTabPanel", () => ({
	AboutTabPanel: ({ hidden }: { hidden: boolean }) =>
		hidden ? null : <div data-testid="about-tab">about</div>,
}));

vi.mock("./GlobalTabPanel", () => ({
	GlobalTabPanel: ({ hidden }: { hidden: boolean }) =>
		hidden ? null : <div data-testid="global-tab">global</div>,
}));

vi.mock("./WorkspaceDetail", () => ({
	WorkspaceDetail: ({
		workspaceId,
		name,
		onNameChange,
	}: {
		workspaceId: string;
		name: string;
		onNameChange: (value: string) => void;
	}) => (
		<div data-testid="workspace-detail">
			<div>{workspaceId}</div>
			<input
				aria-label="Workspace name"
				value={name}
				onChange={(event) => onNameChange(event.target.value)}
			/>
		</div>
	),
}));

function makeWorkspace(id: string, name: string): Workspace {
	return {
		id,
		name,
		theme: {
			background: "#111111",
			foreground: "#eeeeee",
			fontSize: 14,
			unfocusedDim: 0.3,
			preset: "Cyberpunk",
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

const updateState = {
	status: "idle",
	version: null,
	progress: 0,
	error: null,
	dismissed: false,
} as const;

const updateActions = {
	checkForUpdate: () => {},
	installUpdate: () => {},
	restartApp: () => {},
	dismiss: () => {},
} as const;

const baseStoreState = useStore.getState();

function renderSettings() {
	return render(
		<SettingsPanel
			updateState={updateState}
			updateActions={updateActions}
			onClose={() => {}}
		/>,
	);
}

describe("SettingsPanel", () => {
	beforeEach(() => {
		useStore.setState(baseStoreState);
	});

	afterEach(() => {
		cleanup();
		useStore.setState(baseStoreState);
	});

	it("flushes dirty workspace edits before switching selection", async () => {
		const updateWorkspace = vi.fn().mockResolvedValue(undefined);
		const ws1 = makeWorkspace("ws-1", "Alpha");
		const ws2 = makeWorkspace("ws-2", "Beta");

		useStore.setState({
			workspaces: [ws1, ws2],
			appState: {
				...baseStoreState.appState,
				openWorkspaceIds: [ws1.id, ws2.id],
				activeWorkspaceId: ws1.id,
			},
			updateWorkspace,
			createDefaultWorkspace: vi.fn(),
			removeWorkspace: vi.fn(),
			updatePaneConfig: vi.fn(),
			homeDir: "/tmp",
		});

		renderSettings();

		fireEvent.change(screen.getByLabelText("Workspace name"), {
			target: { value: "Alpha revised" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Beta" }));

		await waitFor(() => {
			expect(updateWorkspace).toHaveBeenCalledWith(
				expect.objectContaining({ id: ws1.id, name: "Alpha revised" }),
			);
		});
		await waitFor(() => {
			expect(screen.getByTestId("workspace-detail").textContent).toContain("ws-2");
		});
	});

	it("shows an inline error and keeps selection stable when creating a workspace fails", async () => {
		const ws1 = makeWorkspace("ws-1", "Alpha");
		const createDefaultWorkspace = vi.fn().mockRejectedValue(new Error("boom"));

		useStore.setState({
			workspaces: [ws1],
			appState: {
				...baseStoreState.appState,
				openWorkspaceIds: [ws1.id],
				activeWorkspaceId: ws1.id,
			},
			updateWorkspace: vi.fn().mockResolvedValue(undefined),
			createDefaultWorkspace,
			removeWorkspace: vi.fn(),
			updatePaneConfig: vi.fn(),
			homeDir: "/tmp",
		});

		renderSettings();
		fireEvent.click(screen.getByRole("button", { name: "+ New Workspace" }));

		await waitFor(() => {
			expect(screen.getByText("Failed to create workspace")).not.toBeNull();
		});
		expect(screen.getByTestId("workspace-detail").textContent).toContain("ws-1");
	});

	it("shows an inline error and keeps selection stable when deleting a workspace fails", async () => {
		const ws1 = makeWorkspace("ws-1", "Alpha");
		const ws2 = makeWorkspace("ws-2", "Beta");
		const removeWorkspace = vi.fn().mockRejectedValue(new Error("boom"));

		useStore.setState({
			workspaces: [ws1, ws2],
			appState: {
				...baseStoreState.appState,
				openWorkspaceIds: [ws1.id, ws2.id],
				activeWorkspaceId: ws1.id,
			},
			updateWorkspace: vi.fn().mockResolvedValue(undefined),
			createDefaultWorkspace: vi.fn(),
			removeWorkspace,
			updatePaneConfig: vi.fn(),
			homeDir: "/tmp",
		});

		renderSettings();
		fireEvent.click(screen.getByRole("button", { name: "Delete Workspace" }));
		fireEvent.click(screen.getByRole("button", { name: "Are you sure?" }));

		await waitFor(() => {
			expect(screen.getByText("Failed to delete workspace")).not.toBeNull();
		});
		expect(screen.getByTestId("workspace-detail").textContent).toContain("ws-1");
	});

	it("renders a safe empty state when no workspaces are available", () => {
		useStore.setState({
			workspaces: [],
			appState: {
				...baseStoreState.appState,
				openWorkspaceIds: [],
				activeWorkspaceId: null,
			},
			updateWorkspace: vi.fn().mockResolvedValue(undefined),
			createDefaultWorkspace: vi.fn(),
			removeWorkspace: vi.fn(),
			updatePaneConfig: vi.fn(),
			homeDir: "/tmp",
		});

		renderSettings();

		expect(screen.getByText("No workspace selected")).not.toBeNull();
		expect(screen.queryByRole("listbox")).toBeNull();
		expect(screen.getByRole("navigation", { name: "Workspaces" })).not.toBeNull();
	});
});
