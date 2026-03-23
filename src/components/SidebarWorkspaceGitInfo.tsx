import type { ThemePresetName } from "../data/theme-presets";
import { useWorkspaceGitInfo } from "../hooks/useWorkspaceGitInfo";
import { useStore } from "../store";
import { shortenPath } from "../utils/path";
import { WorkspaceGitInfoVariant } from "./sidebar-variants/ThemeRegistry";

interface Props {
	workspaceId: string;
	preset: ThemePresetName;
}

export function SidebarWorkspaceGitInfo({ workspaceId, preset }: Props) {
	const homeDir = useStore((s) => s.homeDir);
	const gitInfo = useWorkspaceGitInfo(workspaceId);
	const shortCwd = gitInfo.cwd ? shortenPath(gitInfo.cwd, homeDir) : null;

	return (
		<WorkspaceGitInfoVariant
			preset={preset}
			cwd={shortCwd}
			branch={gitInfo.branch}
			pr={gitInfo.pr}
		/>
	);
}
