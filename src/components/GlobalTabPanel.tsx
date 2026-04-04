import { SnippetSettingsPanel, useGlobalSnippetController } from "./SnippetsSection";

interface GlobalTabPanelProps {
	hidden?: boolean;
}

export function GlobalTabPanel({ hidden }: GlobalTabPanelProps) {
	const globalController = useGlobalSnippetController();

	return (
		<div
			id="settings-tabpanel-Shared"
			role="tabpanel"
			aria-labelledby="settings-tab-Shared"
			hidden={hidden}
			className="flex-1 min-h-0 px-6 py-6 overflow-y-auto overflow-x-hidden flex flex-col gap-8"
		>
			<SnippetSettingsPanel
				label="Shared commands"
				description="Available from the >_ menu in every workspace"
				controller={globalController}
				listId="global"
			/>
		</div>
	);
}
