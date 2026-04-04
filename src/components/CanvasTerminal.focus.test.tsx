import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CanvasTerminal } from "./CanvasTerminal";

vi.mock("@tauri-apps/plugin-clipboard-manager", () => ({
	readText: vi.fn(),
	writeText: vi.fn(),
}));

class ResizeObserverMock {
	observe() {}
	unobserve() {}
	disconnect() {}
}

const originalResizeObserver = globalThis.ResizeObserver;

function renderTerminal(focusGeneration: number, isFocused = true) {
	return render(
		<CanvasTerminal
			grid={null}
			onWrite={() => {}}
			onResize={() => {}}
			onScroll={() => {}}
			paneId="pane-1"
			isFocused={isFocused}
			focusGeneration={focusGeneration}
		/>,
	);
}

describe("CanvasTerminal focus retention", () => {
	beforeEach(() => {
		(globalThis as typeof globalThis & { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
			ResizeObserverMock as unknown as typeof ResizeObserver;
	});

	afterEach(() => {
		cleanup();
		if (originalResizeObserver) {
			(
				globalThis as typeof globalThis & { ResizeObserver: typeof originalResizeObserver }
			).ResizeObserver = originalResizeObserver;
		} else {
			delete (globalThis as typeof globalThis & { ResizeObserver?: unknown }).ResizeObserver;
		}
	});

	it("focuses the terminal when it mounts already focused", async () => {
		renderTerminal(1, true);

		const terminal = screen.getByRole("textbox", { name: "Terminal" });
		await waitFor(() => {
			expect(document.activeElement).toBe(terminal);
		});
	});

	it("re-focuses the terminal when the same pane is focused again", async () => {
		const { rerender } = renderTerminal(1, true);
		const terminal = screen.getByRole("textbox", { name: "Terminal" });
		await waitFor(() => {
			expect(document.activeElement).toBe(terminal);
		});

		const other = document.createElement("button");
		other.textContent = "other";
		document.body.appendChild(other);
		other.focus();
		expect(document.activeElement).toBe(other);

		rerender(
			<CanvasTerminal
				grid={null}
				onWrite={() => {}}
				onResize={() => {}}
				onScroll={() => {}}
				paneId="pane-1"
				isFocused
				focusGeneration={2}
			/>,
		);

		await waitFor(() => {
			expect(document.activeElement).toBe(terminal);
		});
		other.remove();
	});
});
