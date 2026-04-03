import type { CellSnapshot, GridSnapshot, ImageCellSnapshot } from "../shared/types";

const FULL_REDRAW_ROW_RATIO = 0.75;

export interface TerminalCanvasBlit {
	readonly sourceRowStart: number;
	readonly destinationRowStart: number;
	readonly rowCount: number;
}

export interface TerminalRenderDiff {
	readonly kind: "full" | "incremental";
	readonly changedRows: readonly number[];
	readonly blit: TerminalCanvasBlit | null;
}

export interface TerminalRenderDiffOptions {
	readonly allowBlit?: boolean;
}

function imageSlicesEqual(
	left: readonly ImageCellSnapshot[] | undefined,
	right: readonly ImageCellSnapshot[] | undefined,
): boolean {
	if (left === right) return true;
	if (!left || !right || left.length !== right.length) return false;
	for (let index = 0; index < left.length; index++) {
		const leftSlice = left[index]!;
		const rightSlice = right[index]!;
		if (
			leftSlice.hash !== rightSlice.hash ||
			leftSlice.topLeftX !== rightSlice.topLeftX ||
			leftSlice.topLeftY !== rightSlice.topLeftY ||
			leftSlice.bottomRightX !== rightSlice.bottomRightX ||
			leftSlice.bottomRightY !== rightSlice.bottomRightY ||
			leftSlice.zIndex !== rightSlice.zIndex
		) {
			return false;
		}
	}
	return true;
}

function cellsEqual(left: CellSnapshot | undefined, right: CellSnapshot | undefined): boolean {
	if (left === right) return true;
	if (!left || !right) return false;
	return (
		left.text === right.text &&
		left.fg === right.fg &&
		left.bg === right.bg &&
		left.bold === right.bold &&
		left.dim === right.dim &&
		left.italic === right.italic &&
		left.underline === right.underline &&
		left.underlineColor === right.underlineColor &&
		left.strikethrough === right.strikethrough &&
		left.hidden === right.hidden &&
		left.overline === right.overline &&
		left.blink === right.blink &&
		left.link === right.link &&
		imageSlicesEqual(left.images, right.images)
	);
}

function rowsEqual(
	left: readonly CellSnapshot[] | undefined,
	right: readonly CellSnapshot[] | undefined,
): boolean {
	if (left === right) return true;
	if (!left || !right || left.length !== right.length) return false;
	for (let index = 0; index < left.length; index++) {
		if (!cellsEqual(left[index], right[index])) return false;
	}
	return true;
}

function hasRenderableImages(grid: GridSnapshot): boolean {
	if (grid.images) return true;
	for (const row of grid.rows) {
		for (const cell of row) {
			if (cell?.images?.length) return true;
		}
	}
	return false;
}

function getViewportBase(grid: GridSnapshot): number {
	return grid.scrollbackRows - grid.scrollOffset;
}

function getCursorRepairRows(previous: GridSnapshot, next: GridSnapshot): number[] {
	const rows = new Set<number>();
	if (previous.cursorVisible) rows.add(previous.cursorRow);
	if (next.cursorVisible) rows.add(next.cursorRow);
	return [...rows].sort((left, right) => left - right);
}

function buildRowSet(rows: readonly number[]): number[] {
	return [...new Set(rows)].sort((left, right) => left - right);
}

function buildScrollBlit(previous: GridSnapshot, next: GridSnapshot): TerminalRenderDiff | null {
	const baseDelta = getViewportBase(next) - getViewportBase(previous);
	if (baseDelta === 0 || Math.abs(baseDelta) >= next.rows.length) return null;

	const sourceRowStart = Math.max(baseDelta, 0);
	const destinationRowStart = Math.max(-baseDelta, 0);
	const rowCount = next.rows.length - Math.abs(baseDelta);

	for (let offset = 0; offset < rowCount; offset++) {
		if (
			!rowsEqual(
				previous.rows[sourceRowStart + offset],
				next.rows[destinationRowStart + offset],
			)
		) {
			return null;
		}
	}

	const exposedRows =
		baseDelta > 0
			? Array.from({ length: baseDelta }, (_, index) => next.rows.length - baseDelta + index)
			: Array.from({ length: -baseDelta }, (_, index) => index);

	return {
		kind: "incremental",
		blit: {
			sourceRowStart,
			destinationRowStart,
			rowCount,
		},
		changedRows: buildRowSet([...exposedRows, ...getCursorRepairRows(previous, next)]),
	};
}

export function diffTerminalViewport(
	previous: GridSnapshot | null,
	next: GridSnapshot,
	options?: TerminalRenderDiffOptions,
): TerminalRenderDiff {
	if (!previous) {
		return { kind: "full", changedRows: [], blit: null };
	}

	if (
		previous.cols !== next.cols ||
		previous.totalRows !== next.totalRows ||
		previous.defaultBg !== next.defaultBg ||
		previous.isAltScreen !== next.isAltScreen ||
		previous.rows.length !== next.rows.length ||
		hasRenderableImages(previous) ||
		hasRenderableImages(next)
	) {
		return { kind: "full", changedRows: [], blit: null };
	}

	const blit = options?.allowBlit === true ? buildScrollBlit(previous, next) : null;
	if (blit) return blit;

	const changedRows: number[] = [];
	for (let row = 0; row < next.rows.length; row++) {
		if (!rowsEqual(previous.rows[row], next.rows[row])) changedRows.push(row);
	}

	const rowsToRepaint = buildRowSet([...changedRows, ...getCursorRepairRows(previous, next)]);
	if (rowsToRepaint.length >= Math.ceil(next.rows.length * FULL_REDRAW_ROW_RATIO)) {
		return { kind: "full", changedRows: [], blit: null };
	}

	return {
		kind: "incremental",
		changedRows: rowsToRepaint,
		blit: null,
	};
}
