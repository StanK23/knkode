import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GridSnapshot } from "../shared/types";
import { CanvasTerminal } from "./CanvasTerminal";

vi.mock("@tauri-apps/plugin-clipboard-manager", () => ({
	readText: vi.fn(),
	writeText: vi.fn(),
}));

class ResizeObserverMock {
	static instances: ResizeObserverMock[] = [];
	private readonly callback: ResizeObserverCallback;

	constructor(callback: ResizeObserverCallback) {
		this.callback = callback;
		ResizeObserverMock.instances.push(this);
	}

	observe() {}
	unobserve() {}
	disconnect() {}

	trigger() {
		this.callback([], this as unknown as ResizeObserver);
	}
}

const originalResizeObserver = globalThis.ResizeObserver;

function makeGrid(rowTexts: readonly string[]): GridSnapshot {
	return {
		rows: rowTexts.map((text) =>
			Array.from(text).map((char) => ({
				text: char,
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
			})),
		),
		cursorRow: 0,
		cursorCol: 0,
		cursorVisible: false,
		cursorShape: "bar",
		cursorBlink: false,
		cols: rowTexts[0]?.length ?? 0,
		totalRows: rowTexts.length,
		scrollbackRows: 0,
		scrollOffset: 0,
		images: {},
		defaultBg: "#000000",
		isAltScreen: false,
		isMouseGrabbed: false,
	};
}

describe("CanvasTerminal resize redraw", () => {
	const clearRect = vi.fn();
	const fillRect = vi.fn();
	const fillText = vi.fn();
	const drawImage = vi.fn();
	const setLineDash = vi.fn();
	const beginPath = vi.fn();
	const moveTo = vi.fn();
	const lineTo = vi.fn();
	const stroke = vi.fn();
	const quadraticCurveTo = vi.fn();
	const size = { width: 30, height: 20 };

	beforeEach(() => {
		ResizeObserverMock.instances = [];
		size.width = 30;
		size.height = 20;
		vi.useFakeTimers();
		(globalThis as typeof globalThis & { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
			ResizeObserverMock as unknown as typeof ResizeObserver;
		vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
			() =>
				({
					x: 0,
					y: 0,
					left: 0,
					top: 0,
					right: size.width,
					bottom: size.height,
					width: size.width,
					height: size.height,
					toJSON: () => ({}),
				}) as DOMRect,
		);
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (
			this: HTMLCanvasElement,
		) {
			return {
				canvas: this,
				font: "",
				fillStyle: "",
				strokeStyle: "",
				lineWidth: 1,
				globalAlpha: 1,
				textBaseline: "alphabetic",
				measureText: () => ({
					width: 10,
					fontBoundingBoxAscent: 8,
					fontBoundingBoxDescent: 2,
				}),
				clearRect,
				fillRect,
				fillText,
				drawImage,
				setLineDash,
				beginPath,
				moveTo,
				lineTo,
				stroke,
				quadraticCurveTo,
			} as unknown as CanvasRenderingContext2D;
		});
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		if (originalResizeObserver) {
			(
				globalThis as typeof globalThis & { ResizeObserver: typeof originalResizeObserver }
			).ResizeObserver = originalResizeObserver;
		} else {
			delete (globalThis as typeof globalThis & { ResizeObserver?: unknown }).ResizeObserver;
		}
		vi.useRealTimers();
		clearRect.mockReset();
		fillRect.mockReset();
		fillText.mockReset();
		drawImage.mockReset();
		setLineDash.mockReset();
		beginPath.mockReset();
		moveTo.mockReset();
		lineTo.mockReset();
		stroke.mockReset();
		quadraticCurveTo.mockReset();
	});

	it("redraws a bitmap preview on geometry-changing resize and accepts a later fresh snapshot", async () => {
		const onResize = vi.fn();
		const { rerender } = render(
			<CanvasTerminal
				grid={makeGrid(["abc", "def"])}
				onWrite={() => {}}
				onResize={onResize}
				onScroll={() => {}}
				paneId="pane-1"
				isFocused={false}
			/>,
		);

		clearRect.mockReset();
		fillText.mockReset();
		onResize.mockReset();

		size.height = 10;

		await act(async () => {
			ResizeObserverMock.instances[0]?.trigger();
			await vi.runAllTimersAsync();
		});

		expect(clearRect).toHaveBeenCalled();
		expect(drawImage).toHaveBeenCalled();

		rerender(
			<CanvasTerminal
				grid={makeGrid(["ghi"])}
				onWrite={() => {}}
				onResize={onResize}
				onScroll={() => {}}
				paneId="pane-1"
				isFocused={false}
			/>,
		);

		expect(fillText).toHaveBeenCalled();
	});

	it("uses the existing canvas bitmap for narrower resize preview", async () => {
		size.width = 60;

		render(
			<CanvasTerminal
				grid={makeGrid(["abcdef"])}
				onWrite={() => {}}
				onResize={() => {}}
				onScroll={() => {}}
				paneId="pane-1"
				isFocused={false}
			/>,
		);

		fillText.mockReset();
		size.width = 20;

		await act(async () => {
			ResizeObserverMock.instances[0]?.trigger();
			await vi.runAllTimersAsync();
		});

		expect(drawImage).toHaveBeenCalled();
	});

	it("anchors the frozen bitmap preview to the bottom for the live viewport", async () => {
		size.height = 30;

		render(
			<CanvasTerminal
				grid={makeGrid(["aaa", "bbb", "ccc"])}
				onWrite={() => {}}
				onResize={() => {}}
				onScroll={() => {}}
				paneId="pane-1"
				isFocused={false}
			/>,
		);

		drawImage.mockReset();
		size.height = 10;

		await act(async () => {
			ResizeObserverMock.instances[0]?.trigger();
			await vi.runAllTimersAsync();
		});

		const lastCall = drawImage.mock.calls.at(-1);
		expect(lastCall).toBeDefined();
		const [preview, sx, sy, sw, sh, dx, dy, dw, dh] = lastCall as [
			HTMLCanvasElement,
			number,
			number,
			number,
			number,
			number,
			number,
			number,
			number,
		];
		expect(sx).toBe(0);
		expect(sy).toBe(preview.height - sh);
		expect(sw).toBe(Math.min(preview.width, size.width));
		expect(dx).toBe(0);
		expect(dy).toBe(size.height - sh);
		expect(dw).toBe(Math.min(preview.width, size.width));
		expect(dh).toBe(size.height);
	});

	it("does not scale the preview when width shrinks", async () => {
		size.width = 60;

		render(
			<CanvasTerminal
				grid={makeGrid(["abcdef"])}
				onWrite={() => {}}
				onResize={() => {}}
				onScroll={() => {}}
				paneId="pane-1"
				isFocused={false}
			/>,
		);

		drawImage.mockReset();
		size.width = 20;

		await act(async () => {
			ResizeObserverMock.instances[0]?.trigger();
			await vi.runAllTimersAsync();
		});

		const lastCall = drawImage.mock.calls.at(-1);
		expect(lastCall).toBeDefined();
		const [preview, , , sw, , , , dw] = lastCall as [
			HTMLCanvasElement,
			number,
			number,
			number,
			number,
			number,
			number,
			number,
			number,
		];
		expect(sw).toBe(size.width);
		expect(dw).toBe(size.width);
		expect(preview.width).toBeGreaterThan(size.width);
	});

	it("does not issue a real terminal resize on the immediate drag tick", async () => {
		const onResize = vi.fn();

		render(
			<CanvasTerminal
				grid={makeGrid(["abc", "def"])}
				onWrite={() => {}}
				onResize={onResize}
				onScroll={() => {}}
				paneId="pane-1"
				isFocused={false}
			/>,
		);

		onResize.mockReset();
		size.width = 20;

		await act(async () => {
			ResizeObserverMock.instances[0]?.trigger();
			await vi.advanceTimersByTimeAsync(32);
		});

		expect(onResize).not.toHaveBeenCalled();
	});
});
