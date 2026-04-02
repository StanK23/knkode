import { describe, expect, it } from "vitest";
import { makePaneConfig } from "./layout-tree";

describe("makePaneConfig", () => {
	it("defaults shell to null", () => {
		expect(makePaneConfig("terminal", "/tmp")).toEqual({
			label: "terminal",
			cwd: "/tmp",
			shell: null,
			startupCommand: null,
			themeOverride: null,
		});
	});

	it("preserves an explicitly provided shell", () => {
		expect(makePaneConfig("terminal", "C:\\repo", "pwsh.exe")).toEqual({
			label: "terminal",
			cwd: "C:\\repo",
			shell: "pwsh.exe",
			startupCommand: null,
			themeOverride: null,
		});
	});
});
