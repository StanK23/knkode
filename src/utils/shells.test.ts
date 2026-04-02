import { describe, expect, it } from "vitest";
import type { ShellOption } from "../shared/types";
import { CUSTOM_SHELL_VALUE, DEFAULT_SHELL_VALUE, getShellSelectValue } from "./shells";

const OPTIONS: readonly ShellOption[] = [
	{ value: "powershell.exe", label: "PowerShell" },
	{ value: "cmd.exe", label: "Command Prompt" },
];

describe("getShellSelectValue", () => {
	it("treats undefined shell values as default", () => {
		expect(getShellSelectValue(undefined, OPTIONS)).toBe(DEFAULT_SHELL_VALUE);
	});

	it("returns custom for non-matching shells", () => {
		expect(getShellSelectValue("nu.exe", OPTIONS)).toBe(CUSTOM_SHELL_VALUE);
	});
});
