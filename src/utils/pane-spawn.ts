import type { PaneConfig } from "../shared/types";

export interface PaneSpawnConfig {
	cwd: string;
	shell: string | null;
	startupCommand: string | null;
	scrollback: number;
}

export function getPaneSpawnConfig(
	config: Pick<PaneConfig, "cwd" | "shell" | "startupCommand">,
	scrollback: number,
): PaneSpawnConfig {
	return {
		cwd: config.cwd,
		shell: config.shell,
		startupCommand: config.startupCommand,
		scrollback,
	};
}
