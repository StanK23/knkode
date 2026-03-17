import { useEffect, useRef } from "react";
import Terminal from "./components/Terminal";
import { useWorkspaceStore } from "./store/workspace";

export default function App() {
	const activePaneId = useWorkspaceStore((s) => s.activePaneId);
	const paneTerminal = useWorkspaceStore((s) =>
		activePaneId ? s.paneTerminals[activePaneId] : undefined,
	);
	const initedRef = useRef(false);

	useEffect(() => {
		if (initedRef.current) return;
		initedRef.current = true;

		const store = useWorkspaceStore.getState();
		let unsubscribe: (() => void) | undefined;

		async function init() {
			const workspaceId = store.createWorkspace();
			unsubscribe = await store.subscribeToEvents();
			await store.initWorkspace(workspaceId);
		}

		init().catch(console.error);

		return () => {
			unsubscribe?.();
		};
	}, []);

	const connected = paneTerminal?.connected ?? false;
	const error = paneTerminal?.error ?? null;

	return (
		<div className="flex h-screen w-screen flex-col bg-[#1d1f21]">
			{activePaneId && connected ? (
				<Terminal paneId={activePaneId} />
			) : (
				<div className="flex h-full items-center justify-center text-neutral-500">
					{error ?? "Terminal disconnected"}
				</div>
			)}
		</div>
	);
}
