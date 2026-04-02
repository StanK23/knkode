import type { ShellOption } from "../shared/types";
import { isWindows } from "./platform";

export const DEFAULT_SHELL_VALUE = "__default__";
export const CUSTOM_SHELL_VALUE = "__custom__";

const FALLBACK_WINDOWS_SHELL_OPTIONS: readonly ShellOption[] = [
	{ value: "powershell.exe", label: "PowerShell" },
	{ value: "pwsh.exe", label: "PowerShell 7" },
	{ value: "cmd.exe", label: "Command Prompt" },
];

const FALLBACK_UNIX_SHELL_OPTIONS: readonly ShellOption[] = [
	{ value: "/bin/zsh", label: "Zsh" },
	{ value: "/bin/bash", label: "Bash" },
	{ value: "/opt/homebrew/bin/fish", label: "Fish" },
];

export const FALLBACK_SHELL_OPTIONS: readonly ShellOption[] = isWindows
	? FALLBACK_WINDOWS_SHELL_OPTIONS
	: FALLBACK_UNIX_SHELL_OPTIONS;

let shellOptionsPromise: Promise<readonly ShellOption[]> | null = null;

function compareShellValues(left: string, right: string): boolean {
	if (left === right) return true;
	if (!isWindows) return false;
	const normalize = (value: string) =>
		value.replace(/\//g, "\\").split("\\").at(-1)?.toLowerCase();
	return normalize(left) === normalize(right);
}

export function getShellSelectValue(
	shell: string | null,
	options: readonly ShellOption[],
): string {
	if (shell === null) return DEFAULT_SHELL_VALUE;
	const matched = options.find((option) => compareShellValues(shell, option.value));
	return matched?.value ?? CUSTOM_SHELL_VALUE;
}

export function getShellPlaceholder(): string {
	return isWindows ? "Custom shell path or exe" : "/bin/zsh";
}

export function loadShellOptions(): Promise<readonly ShellOption[]> {
	if (!shellOptionsPromise) {
		shellOptionsPromise = window.api
			.getAvailableShells()
			.then((options) => (options.length > 0 ? options : FALLBACK_SHELL_OPTIONS))
			.catch((err) => {
				console.warn("[shells] Failed to load available shells:", err);
				return FALLBACK_SHELL_OPTIONS;
			});
	}
	return shellOptionsPromise;
}
