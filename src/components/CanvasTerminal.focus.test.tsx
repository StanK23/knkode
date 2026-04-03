import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CanvasTerminal } from "./CanvasTerminal";

vi.mock("@tauri-apps/plugin-clipboard-manager", () => ({
	readText: vi.fn(),
	writeText: vi.fn(),
}));

class ResizeObserverMock {
	observe() {}
	disconnect() {}
}

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
		vi.stubGlobal("ResizeObserver", ResizeObserverMock);
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
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
