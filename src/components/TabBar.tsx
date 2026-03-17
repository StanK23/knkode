import { useCallback, useState } from "react";
import { useWorkspaceStore } from "../store/workspace";
import TabContextMenu from "./TabContextMenu";
import WorkspaceTab from "./WorkspaceTab";

interface ContextMenuState {
	workspaceId: string;
	clientX: number;
	clientY: number;
}

export default function TabBar() {
	const openWorkspaceIds = useWorkspaceStore((s) => s.openWorkspaceIds);
	const createWorkspace = useWorkspaceStore((s) => s.createWorkspace);
	const initWorkspace = useWorkspaceStore((s) => s.initWorkspace);
	const canClose = openWorkspaceIds.length > 1;

	const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
	const [renamingId, setRenamingId] = useState<string | null>(null);

	const handleContextMenu = useCallback((e: React.MouseEvent, workspaceId: string) => {
		setContextMenu({ workspaceId, clientX: e.clientX, clientY: e.clientY });
	}, []);

	const handleCloseMenu = useCallback(() => {
		setContextMenu(null);
	}, []);

	const handleStartRename = useCallback((workspaceId: string) => {
		setRenamingId(workspaceId);
		setContextMenu(null);
	}, []);

	const handleRenameComplete = useCallback(() => {
		setRenamingId(null);
	}, []);

	const handleCreate = useCallback(() => {
		const id = createWorkspace();
		initWorkspace(id).catch(console.error);
	}, [createWorkspace, initWorkspace]);

	return (
		<div
			className="flex h-9 shrink-0 items-stretch border-b border-neutral-700 bg-neutral-900"
			role="tablist"
			aria-label="Workspaces"
		>
			{openWorkspaceIds.map((id) => (
				<WorkspaceTab
					key={id}
					workspaceId={id}
					canClose={canClose}
					isRenaming={renamingId === id}
					onContextMenu={handleContextMenu}
					onStartRename={handleStartRename}
					onRenameComplete={handleRenameComplete}
				/>
			))}

			<button
				type="button"
				className="flex items-center px-3 text-neutral-500 hover:text-neutral-300"
				onClick={handleCreate}
				title="New workspace"
				aria-label="New workspace"
			>
				<span className="text-sm">+</span>
			</button>

			{contextMenu && (
				<TabContextMenu
					workspaceId={contextMenu.workspaceId}
					x={contextMenu.clientX}
					y={contextMenu.clientY}
					canClose={canClose}
					onClose={handleCloseMenu}
					onStartRename={handleStartRename}
				/>
			)}
		</div>
	);
}
