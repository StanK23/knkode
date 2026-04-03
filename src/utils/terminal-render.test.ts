import { describe, expect, it } from "vitest";
import type { CellSnapshot, GridSnapshot } from "../shared/types";
import { diffTerminalViewport } from "./terminal-render";

function makeCell(overrides: Partial<CellSnapshot> = {}): CellSnapshot {
	return {
		text: " ",
		fg: "#ffffff",
		bg: "#000000",
		bold: false,
		dim: false,
		italic: false,
		underline: "none",
		strikethrough: false,
		hidden: false,
		overline: false,
		blink: false,
		...overrides,
	};
}

function makeGrid(
	rowTexts: readonly string[],
	overrides: Partial<GridSnapshot> = {},
): GridSnapshot {
	return {
		rows: rowTexts.map((text) => Array.from(text).map((char) => makeCell({ text: char }))),
		cursorRow: 0,
		cursorCol: 0,
		cursorVisible: true,
		cursorShape: "bar",
		cursorBlink: false,
		cols: rowTexts[0]?.length ?? 0,
		totalRows: rowTexts.length,
		scrollbackRows: 0,
		scrollOffset: 0,
		defaultBg: "#000000",
		isAltScreen: false,
		isMouseGrabbed: false,
		...overrides,
	};
}

describe("diffTerminalViewport", () => {
	it("returns a full redraw for the first snapshot", () => {
		expect(diffTerminalViewport(null, makeGrid(["abc", "def"]))).toEqual({
			kind: "full",
			changedRows: [],
			blit: null,
		});
	});

	it("returns a blit plan when output scrolls the viewport upward by one row", () => {
		const previous = makeGrid(["aaa", "bbb", "ccc"], { scrollbackRows: 10 });
		const next = makeGrid(["bbb", "ccc", "ddd"], {
			scrollbackRows: 11,
			cursorRow: 2,
		});

		expect(diffTerminalViewport(previous, next, { allowBlit: true })).toEqual({
			kind: "incremental",
			blit: {
				sourceRowStart: 1,
				destinationRowStart: 0,
				rowCount: 2,
			},
			changedRows: [0, 2],
		});
	});

	it("returns a downward blit plan when the viewport scrolls up into scrollback", () => {
		const previous = makeGrid(["bbb", "ccc", "ddd"], {
			scrollbackRows: 11,
			scrollOffset: 0,
			cursorRow: 2,
		});
		const next = makeGrid(["aaa", "bbb", "ccc"], {
			scrollbackRows: 11,
			scrollOffset: 1,
		});

		expect(diffTerminalViewport(previous, next, { allowBlit: true })).toEqual({
			kind: "incremental",
			blit: {
				sourceRowStart: 0,
				destinationRowStart: 1,
				rowCount: 2,
			},
			changedRows: [0, 2],
		});
	});

	it("returns changed rows when only a subset of rows changed", () => {
		const previous = makeGrid(["aaa", "bbb", "ccc"], {
			cursorRow: 0,
			cursorCol: 1,
		});
		const next = makeGrid(["aaa", "Bbb", "ccc"], {
			cursorRow: 1,
			cursorCol: 1,
		});

		expect(diffTerminalViewport(previous, next)).toEqual({
			kind: "incremental",
			blit: null,
			changedRows: [0, 1],
		});
	});

	it("falls back to a full redraw when images are present", () => {
		const previous = makeGrid(["aaa", "bbb"], {
			rows: [
				[makeCell({ text: "a", images: [{ hash: "hash", topLeftX: 0, topLeftY: 0, bottomRightX: 1, bottomRightY: 1, zIndex: 1 }] })],
				[makeCell({ text: "b" })],
			],
			cols: 1,
		});
		const next = makeGrid(["aaa", "bbb"], {
			rows: previous.rows,
			cols: 1,
		});

		expect(diffTerminalViewport(previous, next)).toEqual({
			kind: "full",
			changedRows: [],
			blit: null,
		});
	});

	it("falls back to a full redraw when most rows changed", () => {
		const previous = makeGrid(["aaa", "bbb", "ccc", "ddd"]);
		const next = makeGrid(["111", "222", "333", "ddd"]);

		expect(diffTerminalViewport(previous, next)).toEqual({
			kind: "full",
			changedRows: [],
			blit: null,
		});
	});
});
