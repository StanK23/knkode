type PaneRefreshCallback = () => Promise<void> | void;

const listeners = new Map<string, PaneRefreshCallback>();

export function registerPaneRefreshListener(
	paneId: string,
	callback: PaneRefreshCallback,
): () => void {
	listeners.set(paneId, callback);
	return (): void => {
		if (listeners.get(paneId) === callback) {
			listeners.delete(paneId);
		}
	};
}

export function requestPaneRefresh(paneId: string): boolean {
	const listener = listeners.get(paneId);
	if (!listener) return false;
	Promise.resolve(listener()).catch((err) => {
		console.warn(`[pane-refresh] refresh failed for ${paneId}:`, err);
	});
	return true;
}
