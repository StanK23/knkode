import { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useClickOutside } from "../hooks/useClickOutside";
import { getPortalRoot } from "../lib/ui-constants";
import type { PaneConfig, Workspace } from "../shared/types";
import { useStore } from "../store";
import { shortenPath } from "../utils/path";

interface SidebarPaneEntryProps {
	paneId: string;
	workspaceId: string;
	config: PaneConfig;
	isFocused: boolean;
	canClose: boolean;
	onClick: () => void;
	onClose: () => void;
}

export function SidebarPaneEntry({
	paneId,
	workspaceId,
	config,
	isFocused,
	canClose,
	onClick,
	onClose,
}: SidebarPaneEntryProps) {
	const branch = useStore((s) => s.paneBranches[paneId] ?? null);
	const pr = useStore((s) => s.panePrs[paneId] ?? null);
	const homeDir = useStore((s) => s.homeDir);
	const movePaneToWorkspace = useStore((s) => s.movePaneToWorkspace);
	const workspaces = useStore((s) => s.workspaces);
	const openWorkspaceIds = useStore((s) => s.appState.openWorkspaceIds);

	const shortCwd = shortenPath(config.cwd, homeDir);

	const [showContext, setShowContext] = useState(false);
	const [contextPos, setContextPos] = useState({ x: 0, y: 0 });
	const contextRef = useRef<HTMLDivElement>(null);
	const [showMoveMenu, setShowMoveMenu] = useState(false);

	const otherOpenWorkspaces = useMemo(
		() => workspaces.filter((w) => openWorkspaceIds.includes(w.id) && w.id !== workspaceId),
		[workspaces, openWorkspaceIds, workspaceId],
	);

	const handleContextMenu = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setContextPos({ x: e.clientX, y: e.clientY });
		setShowContext(true);
	}, []);

	const closeContext = useCallback(() => {
		setShowContext(false);
		setShowMoveMenu(false);
	}, []);

	useClickOutside(contextRef, closeContext, showContext);

	return (
		<>
			<button
				type="button"
				onClick={onClick}
				onContextMenu={handleContextMenu}
				data-pane-id={paneId}
				className={`flex flex-col gap-0.5 w-full text-left pl-7 pr-3 py-1 border-none cursor-pointer rounded-sm transition-colors duration-200 ${
					isFocused
						? "bg-overlay text-content"
						: "bg-transparent text-content-muted hover:bg-overlay/50 hover:text-content-secondary"
				}`}
			>
				{/* Row 1: pane label + branch + PR */}
				<div className="flex items-center gap-1.5 min-w-0">
					<span className={`text-[11px] truncate ${isFocused ? "font-medium" : ""}`}>
						{config.label}
					</span>
					{branch && (
						<span className="text-[10px] text-accent truncate max-w-[80px]">{branch}</span>
					)}
					{pr && (
						<span className="text-[10px] text-accent font-medium shrink-0">#{pr.number}</span>
					)}
				</div>

				{/* Row 2: CWD */}
				<span className="text-[9px] text-content-muted truncate">{shortCwd}</span>
			</button>

			{/* Context menu */}
			{showContext &&
				createPortal(
					<div
						ref={contextRef}
						className="ctx-menu fixed z-[300]"
						style={{ left: contextPos.x, top: contextPos.y }}
						onKeyDown={(e) => {
							if (e.key === "Escape") closeContext();
						}}
						onMouseDown={(e) => e.stopPropagation()}
					>
						<button
							type="button"
							className="ctx-item"
							onClick={(e) => {
								e.stopPropagation();
								onClick();
								closeContext();
							}}
						>
							Focus
						</button>
						{canClose && otherOpenWorkspaces.length > 0 && (
							<>
								<div className="ctx-separator" />
								<button
									type="button"
									className="ctx-item"
									onClick={(e) => {
										e.stopPropagation();
										setShowMoveMenu((v) => !v);
									}}
								>
									Move to Workspace
								</button>
								{showMoveMenu && (
									<MoveSubmenu
										workspaces={otherOpenWorkspaces}
										onMove={(toWsId) => {
											movePaneToWorkspace(workspaceId, paneId, toWsId);
											closeContext();
										}}
									/>
								)}
							</>
						)}
						{canClose && (
							<>
								<div className="ctx-separator" />
								<button
									type="button"
									className="ctx-item text-danger"
									onClick={(e) => {
										e.stopPropagation();
										onClose();
										closeContext();
									}}
								>
									Close Pane
								</button>
							</>
						)}
					</div>,
					getPortalRoot(),
				)}
		</>
	);
}

function MoveSubmenu({
	workspaces,
	onMove,
}: { workspaces: Workspace[]; onMove: (wsId: string) => void }) {
	return (
		<div className="flex flex-col gap-0.5 px-1 py-1">
			{workspaces.map((ws) => (
				<button
					type="button"
					key={ws.id}
					className="ctx-item flex items-center gap-2"
					onClick={(e) => {
						e.stopPropagation();
						onMove(ws.id);
					}}
				>
					<span
						className="w-2 h-2 rounded-full shrink-0"
						aria-hidden="true"
						style={{ background: ws.color }}
					/>
					<span className="truncate">{ws.name}</span>
				</button>
			))}
		</div>
	);
}
