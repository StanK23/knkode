// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PaneConfig } from "../shared/types";
import { WorkspaceDetail } from "./WorkspaceDetail";

vi.mock("./CwdInput", () => ({
	CwdInput: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
		<input aria-label="cwd" value={value} onChange={(event) => onChange(event.target.value)} />
	),
}));

vi.mock("./FontPicker", () => ({
	FontPicker: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
		<input aria-label="font family" value={value} onChange={(event) => onChange(event.target.value)} />
	),
}));

vi.mock("./SegmentedButton", () => ({
	SegmentedButton: ({
		label,
		options,
		value,
		onChange,
	}: {
		label?: string;
		options: readonly string[];
		value: string;
		onChange: (value: string) => void;
	}) => (
		<div aria-label={label ?? "segmented"}>
			{options.map((option) => (
				<button key={option} type="button" aria-pressed={option === value} onClick={() => onChange(option)}>
					{option}
				</button>
			))}
		</div>
	),
}));

vi.mock("./ShellSelector", () => ({
	ShellSelector: ({ value, onChange }: { value: string | null; onChange: (value: string | null) => void }) => (
		<input
			aria-label="shell"
			value={value ?? ""}
			onChange={(event) => onChange(event.target.value || null)}
		/>
	),
}));

vi.mock("./SnippetsSection", () => ({
	SnippetSettingsPanel: () => <div data-testid="snippet-settings-panel" />,
	useWorkspaceSnippetController: () => ({
		snippets: [],
		onAdd: () => {},
		onUpdate: () => {},
		onRemove: () => {},
		onReorder: () => {},
	}),
}));

const panes: Record<string, PaneConfig> = {
	"pane-1": {
		label: "terminal",
		cwd: "/tmp",
		shell: null,
		startupCommand: null,
		themeOverride: null,
	},
};

function renderWorkspaceDetail(props?: Partial<React.ComponentProps<typeof WorkspaceDetail>>) {
	const onScrollbackChange = vi.fn();

	render(
		<WorkspaceDetail
			workspaceId="ws-1"
			panes={panes}
			name="Workspace"
			onNameChange={() => {}}
			homeDir="/tmp"
			statusBarPosition="top"
			onStatusBarPositionChange={() => {}}
			onPaneUpdate={() => {}}
			selectedPreset="Default Dark"
			onPresetChange={() => {}}
			fontFamily=""
			onFontFamilyChange={() => {}}
			fontSize={14}
			onFontSizeChange={() => {}}
			lineHeight={1.2}
			onLineHeightChange={() => {}}
			cursorStyle="block"
			onCursorStyleChange={() => {}}
			scrollback={10000}
			onScrollbackChange={onScrollbackChange}
			effects={{
				dim: "subtle",
				opacity: "off",
				gradient: "off",
				glow: "off",
				scanline: "off",
				noise: "off",
			}}
			onEffectChange={() => {}}
			{...props}
		/>,
	);

	return { onScrollbackChange };
}

describe("WorkspaceDetail scrollback input", () => {
	afterEach(() => {
		cleanup();
	});

	it("allows replacing the value before clamping on blur", () => {
		const { onScrollbackChange } = renderWorkspaceDetail();
		const input = screen.getByRole("spinbutton");

		fireEvent.change(input, { target: { value: "" } });
		fireEvent.change(input, { target: { value: "2000" } });

		expect((input as HTMLInputElement).value).toBe("2000");
		expect(onScrollbackChange).not.toHaveBeenCalled();

		fireEvent.blur(input);

		expect(onScrollbackChange).toHaveBeenCalledWith(2000);
		expect((input as HTMLInputElement).value).toBe("2000");
	});

	it("snaps to configured limits when the edit is committed", () => {
		const { onScrollbackChange } = renderWorkspaceDetail();
		const input = screen.getByRole("spinbutton");

		fireEvent.change(input, { target: { value: "200" } });
		fireEvent.blur(input);
		expect(onScrollbackChange).toHaveBeenCalledWith(500);
		expect((input as HTMLInputElement).value).toBe("500");

		fireEvent.change(input, { target: { value: "90000" } });
		fireEvent.blur(input);
		expect(onScrollbackChange).toHaveBeenLastCalledWith(50000);
		expect((input as HTMLInputElement).value).toBe("50000");
	});
});
