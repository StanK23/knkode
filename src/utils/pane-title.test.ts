import { describe, expect, it } from "vitest";
import { nextPaneTitlesForUpdate, sanitizePaneTitle } from "./pane-title";

describe("sanitizePaneTitle", () => {
	it("strips control characters", () => {
		expect(sanitizePaneTitle("hello\u0007 world")).toBe("hello world");
	});
});

describe("nextPaneTitlesForUpdate", () => {
	it("stores sanitized non-empty titles", () => {
		expect(nextPaneTitlesForUpdate({}, "pane-1", "build log")).toEqual({
			"pane-1": "build log",
		});
	});

	it("clears an existing title when the sanitized title is empty", () => {
		expect(nextPaneTitlesForUpdate({ "pane-1": "old" }, "pane-1", "\u0007")).toEqual({});
	});

	it("returns null when an empty title arrives for a pane without stored title", () => {
		expect(nextPaneTitlesForUpdate({}, "pane-1", "")).toBeNull();
	});
});
