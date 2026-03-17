import { useCallback } from "react";
import { useWorkspaceStore } from "../store/workspace";
import Terminal from "./Terminal";

interface PaneProps {
	paneId: string;
	workspaceId: string;
}

export default function Pane({ paneId, workspaceId }: PaneProps) {
	const isActive = useWorkspaceStore((s) => s.activePaneId === paneId);
	const connected = useWorkspaceStore((s) => s.paneTerminals[paneId]?.connected ?? false);
	const error = useWorkspaceStore((s) => s.paneTerminals[paneId]?.error ?? null);
	const setActivePane = useWorkspaceStore((s) => s.setActivePane);
	const workspaceColor = useWorkspaceStore((s) => s.workspaces[workspaceId]?.color ?? null);
	const label = useWorkspaceStore(
		(s) => s.workspaces[workspaceId]?.panes[paneId]?.label ?? "Terminal",
	);

	const handleFocus = useCallback(() => {
		if (isActive) return;
		setActivePane(paneId);
	}, [setActivePane, paneId, isActive]);

	return (
		<div
			className="flex h-full w-full flex-col overflow-hidden"
			role="group"
			aria-label="Terminal pane"
			onMouseDown={handleFocus}
		>
			<div
				className={`flex h-7 shrink-0 items-center border-t-2 px-2 text-xs ${
					isActive ? "bg-white/[0.03]" : "border-transparent"
				}`}
				style={isActive && workspaceColor ? { borderTopColor: workspaceColor } : undefined}
			>
				<span className="truncate text-neutral-500">{label}</span>
			</div>
			<div className="min-h-0 flex-1">
				{connected ? (
					<Terminal paneId={paneId} />
				) : (
					<div className="flex h-full items-center justify-center bg-[#1d1f21] text-sm text-neutral-500">
						{error ?? "Connecting..."}
					</div>
				)}
			</div>
		</div>
	);
}
