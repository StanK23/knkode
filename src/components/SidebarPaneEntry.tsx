import { useCallback } from "react";
import { mergeThemeWithPreset, type ThemePresetName, toPresetName } from "../data/theme-presets";
import { useContextMenu } from "../hooks/useContextMenu";
import { DEFAULT_SCROLLBACK, PANE_RENAME_EVENT, type PaneConfig } from "../shared/types";
import { useStore } from "../store";
import { PaneContextMenu } from "./PaneContextMenu";
import { PaneEntryVariant } from "./sidebar-variants/ThemeRegistry";

interface SidebarPaneEntryProps {
	paneId: string;
	workspaceId: string;
	workspacePreset?: ThemePresetName | undefined;
	config: PaneConfig;
	isFocused: boolean;
	canClose: boolean;
	onClick: () => void;
	onClose?: () => void;
}

export function SidebarPaneEntry({
	paneId,
	workspaceId,
	workspacePreset,
	config,
	isFocused,
	canClose,
	onClick,
	onClose,
}: SidebarPaneEntryProps) {
	const agentStatus = useStore((s) => s.paneAgentStatuses[paneId] ?? "idle");
	const title = useStore((s) => s.paneTitles[paneId] ?? null);
	const splitPane = useStore((s) => s.splitPane);
	const updatePaneConfig = useStore((s) => s.updatePaneConfig);
	const workspaceTheme = useStore(
		(s) => s.workspaces.find((workspace) => workspace.id === workspaceId)?.theme ?? null,
	);

	const preset = toPresetName(config.themeOverride?.preset ?? workspacePreset);
	const scrollback =
		(workspaceTheme
			? mergeThemeWithPreset(workspaceTheme, config.themeOverride).scrollback
			: undefined) ?? DEFAULT_SCROLLBACK;

	const ctx = useContextMenu();

	const handleRename = useCallback(() => {
		window.dispatchEvent(new CustomEvent(PANE_RENAME_EVENT, { detail: { paneId } }));
	}, [paneId]);

	const statusClass =
		agentStatus === "active"
			? "sidebar-pane-active"
			: agentStatus === "attention"
				? "sidebar-pane-attention"
				: "";

	return (
		<>
			<div className={statusClass}>
				<PaneEntryVariant
					preset={preset}
					paneId={paneId}
					label={config.label}
					title={title}
					agentStatus={agentStatus}
					isFocused={isFocused}
					onClick={onClick}
					onContextMenu={ctx.open}
				/>
			</div>

			{ctx.isOpen && (
				<PaneContextMenu
					paneId={paneId}
					workspaceId={workspaceId}
					config={config}
					scrollback={scrollback}
					canClose={canClose}
					anchorPos={ctx.position}
					onUpdateConfig={(updates) => updatePaneConfig(workspaceId, paneId, updates)}
					// iTerm2 convention: "Split Vertical" = vertical divider = horizontal (side-by-side) layout
					onSplitVertical={() => splitPane(workspaceId, paneId, "horizontal")}
					onSplitHorizontal={() => splitPane(workspaceId, paneId, "vertical")}
					onClose={() => onClose?.()}
					onRename={handleRename}
					onFocus={onClick}
					onDismiss={ctx.close}
				/>
			)}
		</>
	);
}
