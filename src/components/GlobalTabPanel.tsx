import { useStore } from "../store";
import { SettingsSection } from "./SettingsSection";
import { SnippetList } from "./SnippetsSection";

interface GlobalTabPanelProps {
	hidden?: boolean;
}

export function GlobalTabPanel({ hidden }: GlobalTabPanelProps) {
	const snippets = useStore((s) => s.snippets);
	const addSnippet = useStore((s) => s.addSnippet);
	const updateSnippet = useStore((s) => s.updateSnippet);
	const removeSnippet = useStore((s) => s.removeSnippet);
	const reorderSnippets = useStore((s) => s.reorderSnippets);

	return (
		<div
			id="settings-tabpanel-Global"
			role="tabpanel"
			aria-labelledby="settings-tab-Global"
			hidden={hidden}
			className="flex-1 min-h-0 px-6 py-6 overflow-y-auto overflow-x-hidden flex flex-col gap-8"
		>
			<SettingsSection label="Commands" gap={8}>
				<span className="text-[10px] text-content-muted -mt-1 mb-1">
					Global snippets — available from the &gt;_ icon on any pane
				</span>
				<SnippetList
					snippets={snippets}
					onAdd={addSnippet}
					onUpdate={updateSnippet}
					onRemove={removeSnippet}
					onReorder={reorderSnippets}
					listId="global"
				/>
			</SettingsSection>
		</div>
	);
}
