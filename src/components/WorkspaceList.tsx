import type { Workspace } from "../shared/types";

interface WorkspaceListProps {
	workspaces: readonly Workspace[];
	selectedId: string;
	onSelect: (id: string) => void;
	onAdd: () => void;
	disabled?: boolean;
}

export function WorkspaceList({
	workspaces,
	selectedId,
	onSelect,
	onAdd,
	disabled = false,
}: WorkspaceListProps) {
	return (
		<div className="w-full md:w-44 lg:w-48 shrink-0 border-b md:border-b-0 md:border-r border-edge/50 flex flex-col min-h-0">
			<nav className="flex-1 min-h-0 overflow-y-auto py-2" aria-label="Workspaces">
				<ul className="flex flex-col gap-0.5 px-2">
					{workspaces.map((ws) => {
						const isSelected = ws.id === selectedId;
						return (
							<li key={ws.id}>
								<button
									type="button"
									aria-current={isSelected ? "true" : undefined}
									aria-pressed={isSelected}
									disabled={disabled}
									onClick={() => onSelect(ws.id)}
									className={`w-full text-left px-3 py-2 text-xs rounded-sm cursor-pointer transition-colors duration-100 bg-transparent focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none active:scale-[0.98] ${
										isSelected
											? "text-content bg-accent/10 ring-1 ring-inset ring-accent/40"
											: "text-content-secondary hover:text-content hover:bg-white/[0.04]"
									} ${disabled ? "opacity-60 cursor-wait active:scale-100" : ""}`}
								>
									<span className="block truncate">{ws.name}</span>
								</button>
							</li>
						);
					})}
				</ul>
			</nav>
			<div className="border-t border-edge/50 px-2 py-2">
				<button
					type="button"
					onClick={onAdd}
					disabled={disabled}
					className={`w-full text-xs text-content-muted py-1.5 px-2 rounded-sm bg-transparent border border-edge cursor-pointer hover:text-content hover:border-content-muted focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none active:scale-[0.98] transition-all duration-100 ${
						disabled ? "opacity-60 cursor-wait active:scale-100" : ""
					}`}
				>
					+ New Workspace
				</button>
			</div>
		</div>
	);
}
