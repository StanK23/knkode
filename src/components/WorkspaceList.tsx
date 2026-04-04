import type { Workspace } from "../shared/types";

interface WorkspaceListProps {
	workspaces: readonly Workspace[];
	selectedId: string;
	onSelect: (id: string) => void;
	onAdd: () => void;
}

export function WorkspaceList({ workspaces, selectedId, onSelect, onAdd }: WorkspaceListProps) {
	return (
		<div className="w-40 shrink-0 border-r border-edge/50 flex flex-col min-h-0">
			<nav
				className="flex-1 min-h-0 overflow-y-auto py-2"
				role="listbox"
				aria-label="Workspaces"
			>
				{workspaces.map((ws) => {
					const isSelected = ws.id === selectedId;
					return (
						<button
							key={ws.id}
							type="button"
							role="option"
							aria-selected={isSelected}
							onClick={() => onSelect(ws.id)}
							className={`w-full text-left px-3 py-1.5 text-xs cursor-pointer border-l-2 transition-colors duration-100 bg-transparent focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-inset focus-visible:outline-none active:scale-[0.98] origin-left ${
								isSelected
									? "border-accent text-content bg-accent/10"
									: "border-transparent text-content-secondary hover:text-content hover:bg-white/[0.04]"
							}`}
						>
							<span className="block truncate">{ws.name}</span>
						</button>
					);
				})}
			</nav>
			<div className="border-t border-edge/50 px-2 py-2">
				<button
					type="button"
					onClick={onAdd}
					className="w-full text-xs text-content-muted py-1 px-2 rounded-sm bg-transparent border border-edge cursor-pointer hover:text-content hover:border-content-muted focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none active:scale-[0.98] transition-all duration-100"
				>
					+ New Workspace
				</button>
			</div>
		</div>
	);
}
