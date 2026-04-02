import { describe, expect, it } from "vitest";
import { getPaneSpawnConfig } from "./pane-spawn";

describe("getPaneSpawnConfig", () => {
	it("returns the current pane spawn values", () => {
		expect(
			getPaneSpawnConfig({
				cwd: "C:\\Projects\\knkode",
				shell: "pwsh.exe",
				startupCommand: "claude",
			}),
		).toEqual({
			cwd: "C:\\Projects\\knkode",
			shell: "pwsh.exe",
			startupCommand: "claude",
		});
	});

	it("preserves null shell and startup command", () => {
		expect(
			getPaneSpawnConfig({
				cwd: "/Users/sfory/dev/knkode",
				shell: null,
				startupCommand: null,
			}),
		).toEqual({
			cwd: "/Users/sfory/dev/knkode",
			shell: null,
			startupCommand: null,
		});
	});
});
