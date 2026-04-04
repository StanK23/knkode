import { useStore } from "../store";
import { SnippetSettingsPanel, useGlobalSnippetController } from "./SnippetsSection";

interface GlobalTabPanelProps {
	hidden?: boolean;
}

export function GlobalTabPanel({ hidden }: GlobalTabPanelProps) {
	const globalController = useGlobalSnippetController();
	const workspaceCount = useStore((s) => s.workspaces.length);

	return (
		<div
			id="settings-tabpanel-Shared"
			role="tabpanel"
			aria-labelledby="settings-tab-Shared"
			hidden={hidden}
			className="flex-1 min-h-0 px-6 py-6 overflow-y-auto overflow-x-hidden flex flex-col gap-8"
		>
			<div className="space-y-1">
				<h3 className="text-xs font-medium text-content">Shared commands</h3>
				<p className="text-[11px] leading-5 text-content-muted max-w-[65ch]">
					These snippets are available from the &gt;_ menu in every workspace. Use the
					Workspaces tab when a command should live in only one of your {workspaceCount} workspaces.
				</p>
			</div>
			<SnippetSettingsPanel
				label="Shared commands"
				description="Shared snippets — available from the >_ menu in every workspace"
				controller={globalController}
				listId="global"
			/>
		</div>
	);
}
