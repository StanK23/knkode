import { useCallback, useEffect, useState } from "react";
import { THEME_PRESETS, type ThemePreset, type ThemePresetName } from "../data/theme-presets";
import {
	CURSOR_STYLES,
	type CursorStyle,
	EFFECT_LEVELS,
	type EffectLevel,
	MAX_FONT_SIZE,
	MAX_LINE_HEIGHT,
	MAX_SCROLLBACK,
	MIN_FONT_SIZE,
	MIN_LINE_HEIGHT,
	MIN_SCROLLBACK,
	type PaneConfig,
	type PaneTheme,
	isCursorStyle,
} from "../shared/types";
import { hexToRgba } from "../utils/colors";
import { CwdInput } from "./CwdInput";
import { FontPicker } from "./FontPicker";
import { SegmentedButton } from "./SegmentedButton";
import { SettingsSection } from "./SettingsSection";
import { ShellSelector } from "./ShellSelector";
import { SnippetSettingsPanel, useWorkspaceSnippetController } from "./SnippetsSection";

export type EffectCategory = "dim" | "opacity" | "gradient" | "glow" | "scanline" | "noise";

type StatusBarPosition = NonNullable<PaneTheme["statusBarPosition"]>;
const STATUS_BAR_POSITIONS = ["top", "bottom"] as const satisfies readonly [
	StatusBarPosition,
	...StatusBarPosition[],
];

const EFFECT_ENTRIES: readonly { category: EffectCategory; label: string }[] = [
	{ category: "dim", label: "Dim unfocused" },
	{ category: "opacity", label: "Opacity" },
	{ category: "gradient", label: "Gradient" },
	{ category: "glow", label: "Glow" },
	{ category: "scanline", label: "Scanlines" },
	{ category: "noise", label: "Noise" },
];

const THEME_PRESET_OPTIONS: readonly (ThemePreset & { name: ThemePresetName })[] = THEME_PRESETS;

function clampScrollback(value: number): number {
	return Math.max(MIN_SCROLLBACK, Math.min(MAX_SCROLLBACK, value));
}

interface WorkspaceDetailProps {
	workspaceId: string;
	panes: Record<string, PaneConfig>;
	name: string;
	onNameChange: (name: string) => void;
	homeDir: string;
	statusBarPosition: StatusBarPosition;
	onStatusBarPositionChange: (pos: StatusBarPosition) => void;
	onPaneUpdate: (paneId: string, updates: Partial<PaneConfig>) => void;
	selectedPreset: ThemePresetName;
	onPresetChange: (name: ThemePresetName) => void;
	fontFamily: string;
	onFontFamilyChange: (family: string) => void;
	fontSize: number;
	onFontSizeChange: (value: number) => void;
	lineHeight: number;
	onLineHeightChange: (value: number) => void;
	cursorStyle: CursorStyle;
	onCursorStyleChange: (style: CursorStyle) => void;
	scrollback: number;
	onScrollbackChange: (value: number) => void;
	effects: Record<EffectCategory, EffectLevel>;
	onEffectChange: (category: EffectCategory, level: EffectLevel) => void;
}

export function WorkspaceDetail({
	workspaceId,
	panes,
	name,
	onNameChange,
	homeDir,
	statusBarPosition,
	onStatusBarPositionChange,
	onPaneUpdate,
	selectedPreset,
	onPresetChange,
	fontFamily,
	onFontFamilyChange,
	fontSize,
	onFontSizeChange,
	lineHeight,
	onLineHeightChange,
	cursorStyle,
	onCursorStyleChange,
	scrollback,
	onScrollbackChange,
	effects,
	onEffectChange,
}: WorkspaceDetailProps) {
	const workspaceSnippetController = useWorkspaceSnippetController(workspaceId);
	const [scrollbackInput, setScrollbackInput] = useState(() => String(scrollback));

	useEffect(() => {
		setScrollbackInput(String(scrollback));
	}, [scrollback]);

	const commitScrollback = useCallback(() => {
		const parsed = Number(scrollbackInput);
		if (!Number.isFinite(parsed)) {
			setScrollbackInput(String(scrollback));
			return;
		}
		const nextValue = clampScrollback(parsed);
		setScrollbackInput(String(nextValue));
		if (nextValue !== scrollback) {
			onScrollbackChange(nextValue);
		}
	}, [onScrollbackChange, scrollback, scrollbackInput]);

	return (
		<div className="flex-1 min-h-0 px-4 md:px-5 py-5 overflow-y-auto overflow-x-hidden flex flex-col gap-7">
			{/* General */}
			<SettingsSection label="General">
				<input
					value={name}
					onChange={(e) => onNameChange(e.target.value)}
					maxLength={128}
					className="settings-input flex-1 min-w-0"
					placeholder="Workspace name"
					aria-label="Workspace name"
				/>
			</SettingsSection>

			{/* Panes */}
			<SettingsSection label="Panes" gap={8}>
				{Object.entries(panes).map(([paneId, pane]) => (
					<div
						key={paneId}
						className="grid gap-1.5 lg:grid-cols-[minmax(0,6rem)_minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,1.7fr)]"
					>
						<input
							value={pane.label}
							onChange={(e) => onPaneUpdate(paneId, { label: e.target.value })}
							maxLength={64}
							className="settings-input w-full min-w-0"
							placeholder="Label"
							aria-label={`Pane ${pane.label} label`}
						/>
						<CwdInput
							value={pane.cwd}
							homeDir={homeDir}
							onChange={(cwd) => onPaneUpdate(paneId, { cwd })}
							aria-label={`Pane ${pane.label} working directory`}
						/>
						<ShellSelector
							value={pane.shell}
							onChange={(shell) => onPaneUpdate(paneId, { shell })}
							selectClassName="settings-input w-full min-w-0"
							inputClassName="settings-input w-full min-w-0"
							ariaLabel={`Pane ${pane.label} shell`}
						/>
						<input
							value={pane.startupCommand || ""}
							onChange={(e) =>
								onPaneUpdate(paneId, {
									startupCommand: e.target.value || null,
								})
							}
							maxLength={1024}
							className="settings-input w-full min-w-0"
							placeholder="Startup command"
							aria-label={`Pane ${pane.label} startup command`}
						/>
					</div>
				))}
			</SettingsSection>

			{/* Theme */}
			<SettingsSection label="Theme" gap={16}>
				<div
					className="grid grid-cols-4 gap-1.5"
					role="radiogroup"
					aria-label="Theme presets"
					onKeyDown={(e) => {
						if (
							e.key !== "ArrowRight" &&
							e.key !== "ArrowLeft" &&
							e.key !== "ArrowDown" &&
							e.key !== "ArrowUp"
						)
							return;
						e.preventDefault();
						const idx = THEME_PRESETS.findIndex((p) => p.name === selectedPreset);
						const cols = 4;
						let next = idx;
						if (e.key === "ArrowRight") next = (idx + 1) % THEME_PRESETS.length;
						else if (e.key === "ArrowLeft")
							next = (idx - 1 + THEME_PRESETS.length) % THEME_PRESETS.length;
						else if (e.key === "ArrowDown") next = Math.min(idx + cols, THEME_PRESETS.length - 1);
						else if (e.key === "ArrowUp") next = Math.max(idx - cols, 0);
						const nextPreset = THEME_PRESETS[next];
						if (!nextPreset) return;
						onPresetChange(nextPreset.name);
						document.getElementById(`theme-preset-${next}`)?.focus();
					}}
				>
					{THEME_PRESET_OPTIONS.map((preset, index) => {
						const isActive = selectedPreset === preset.name;
						return (
							<button
								type="button"
								id={`theme-preset-${index}`}
								key={preset.name}
								onClick={() => onPresetChange(preset.name)}
								role="radio"
								aria-checked={isActive}
								tabIndex={isActive ? 0 : -1}
								className={`py-1.5 px-1 rounded-md cursor-pointer border text-center focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none ${
									isActive
										? "border-accent ring-1 ring-accent"
										: "border-transparent hover:border-content-muted"
								}`}
								title={preset.name}
								aria-label={preset.name}
								style={{
									background: preset.background,
									color: preset.foreground,
									boxShadow:
										isActive && preset.glow
											? `0 0 8px ${hexToRgba(preset.glow, 0.25)}`
											: undefined,
								}}
							>
								<span className="text-[11px] font-medium leading-tight block truncate">
									{preset.name}
								</span>
							</button>
						);
					})}
				</div>
			</SettingsSection>

			{/* Font */}
			<SettingsSection label="Font" gap={12}>
				<FontPicker value={fontFamily} onChange={onFontFamilyChange} />
			</SettingsSection>

			{/* Display */}
			<SettingsSection label="Display" gap={8}>
				<div className="flex items-center gap-3">
					<span className="text-xs text-content-secondary w-20 shrink-0">Size</span>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => onFontSizeChange(Math.max(MIN_FONT_SIZE, fontSize - 1))}
							aria-label="Decrease font size"
							className="stepper-btn"
						>
							-
						</button>
						<span className="text-xs text-content tabular-nums w-5 text-center">{fontSize}</span>
						<button
							type="button"
							onClick={() => onFontSizeChange(Math.min(MAX_FONT_SIZE, fontSize + 1))}
							aria-label="Increase font size"
							className="stepper-btn"
						>
							+
						</button>
					</div>
				</div>

				<div className="flex items-center gap-3">
					<span className="text-xs text-content-secondary w-20 shrink-0">Line height</span>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() =>
								onLineHeightChange(Math.max(MIN_LINE_HEIGHT, +(lineHeight - 0.1).toFixed(1)))
							}
							aria-label="Decrease line height"
							className="stepper-btn"
						>
							-
						</button>
						<span className="text-xs text-content tabular-nums w-5 text-center">
							{lineHeight.toFixed(1)}
						</span>
						<button
							type="button"
							onClick={() =>
								onLineHeightChange(Math.min(MAX_LINE_HEIGHT, +(lineHeight + 0.1).toFixed(1)))
							}
							aria-label="Increase line height"
							className="stepper-btn"
						>
							+
						</button>
					</div>
				</div>

				<label className="flex items-center gap-3">
					<span className="text-xs text-content-secondary w-20 shrink-0">Cursor</span>
					<select
						value={cursorStyle}
						onChange={(e) => {
							if (isCursorStyle(e.target.value)) onCursorStyleChange(e.target.value);
						}}
						className="settings-input w-32"
					>
						{CURSOR_STYLES.map((s) => (
							<option key={s} value={s}>
								{s.slice(0, 1).toUpperCase() + s.slice(1)}
							</option>
						))}
					</select>
				</label>

				<label className="flex items-center gap-3">
					<span className="text-xs text-content-secondary w-20 shrink-0">Scrollback</span>
					<input
						type="number"
						min={MIN_SCROLLBACK}
						max={MAX_SCROLLBACK}
						step={500}
						value={scrollbackInput}
						onChange={(e) => setScrollbackInput(e.target.value)}
						onBlur={commitScrollback}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								commitScrollback();
								e.currentTarget.blur();
							}
							if (e.key === "Escape") {
								e.preventDefault();
								setScrollbackInput(String(scrollback));
								e.currentTarget.blur();
							}
						}}
						className="settings-input w-24"
					/>
					<span className="text-[11px] text-content-muted">lines</span>
				</label>

				<SegmentedButton
					options={STATUS_BAR_POSITIONS}
					value={statusBarPosition}
					onChange={onStatusBarPositionChange}
					label="Status bar"
				/>

				{EFFECT_ENTRIES.map(({ category, label }) => (
					<SegmentedButton
						key={category}
						options={EFFECT_LEVELS}
						value={effects[category]}
						onChange={(level) => onEffectChange(category, level)}
						label={label}
					/>
				))}
			</SettingsSection>

			<SnippetSettingsPanel
				label="Commands"
				description="Only available in this workspace"
				controller={workspaceSnippetController}
				listId="workspace"
			/>
		</div>
	);
}
