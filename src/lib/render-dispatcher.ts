import type { GridSnapshot } from "../shared/types";

type RenderCallback = (snapshot: GridSnapshot) => void;

/** Per-pane render callbacks — O(1) lookup replaces N×N broadcast. */
const listeners = new Map<string, RenderCallback>();

/** Register a pane's render callback. Returns an unregister function. */
export function registerRenderListener(paneId: string, cb: RenderCallback): () => void {
	listeners.set(paneId, cb);
	return () => {
		listeners.delete(paneId);
	};
}

/** Dispatch a render event to the matching pane. Called from a single global listener. */
export function dispatchRender(id: string, snapshot: GridSnapshot): void {
	listeners.get(id)?.(snapshot);
}
