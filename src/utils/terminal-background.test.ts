import { describe, expect, it } from "vitest";
import { shouldPaintTerminalCellBackground } from "./terminal-background";

describe("shouldPaintTerminalCellBackground", () => {
	it("keeps default-background cells transparent on the normal screen", () => {
		expect(shouldPaintTerminalCellBackground("#111111", "#111111", false)).toBe(false);
	});

	it("paints custom backgrounds on the normal screen", () => {
		expect(shouldPaintTerminalCellBackground("#222222", "#111111", false)).toBe(true);
	});

	it("paints default-background cells on the alternate screen", () => {
		expect(shouldPaintTerminalCellBackground("#111111", "#111111", true)).toBe(true);
	});
});
