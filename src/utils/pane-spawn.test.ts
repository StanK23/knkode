import { describe, expect, it } from "vitest";
import { DEFAULT_SCROLLBACK } from "../shared/types";
import { getPaneSpawnConfig } from "./pane-spawn";

describe("getPaneSpawnConfig", () => {
	it("returns the current pane spawn values", () => {
		expect(
			getPaneSpawnConfig(
				{
					cwd: "C:\\Projects\\knkode",
					shell: "pwsh.exe",
					startupCommand: "claude",
				},
				DEFAULT_SCROLLBACK,
			),
		).toEqual({
			cwd: "C:\\Projects\\knkode",
			shell: "pwsh.exe",
			startupCommand: "claude",
			scrollback: DEFAULT_SCROLLBACK,
		});
	});

	it("preserves null shell and startup command", () => {
		expect(
			getPaneSpawnConfig(
				{
					cwd: "/Users/sfory/dev/knkode",
					shell: null,
					startupCommand: null,
				},
				12000,
			),
		).toEqual({
			cwd: "/Users/sfory/dev/knkode",
			shell: null,
			startupCommand: null,
			scrollback: 12000,
		});
	});
});
