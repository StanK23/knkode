import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import { shellQuotePaths } from "../lib/shell-quote";

/** Payload from Tauri's built-in drag-drop events (physical pixel coords). */
interface DragDropPayload {
	paths?: string[];
	position: { x: number; y: number };
}

interface UseFileDropOptions {
	/** Ref to the pane's outer DOM element for hit testing. */
	containerRef: React.RefObject<HTMLElement | null>;
	/** Write data to the PTY. */
	onWrite: (data: string) => void;
}

/** Hook that listens for native file drag-and-drop events from Tauri and
 *  writes shell-quoted file paths to the terminal when dropped on this pane.
 *  Returns `isDropTarget` — true while files are hovering over this pane. */
export function useFileDrop({ containerRef, onWrite }: UseFileDropOptions): {
	isDropTarget: boolean;
} {
	const [isDropTarget, setIsDropTarget] = useState(false);
	// Track whether files are being dragged at all (enter/leave are window-level)
	const draggingRef = useRef(false);

	const isOverPane = useCallback(
		(position: { x: number; y: number }): boolean => {
			const el = containerRef.current;
			if (!el) return false;
			const rect = el.getBoundingClientRect();
			const scale = window.devicePixelRatio || 1;
			// Tauri sends physical pixels; getBoundingClientRect returns logical
			const x = position.x / scale;
			const y = position.y / scale;
			return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
		},
		[containerRef],
	);

	useEffect(() => {
		const unlisteners: UnlistenFn[] = [];
		let disposed = false;

		async function setup() {
			const enterUn = await listen<DragDropPayload>("tauri://drag-enter", (e) => {
				if (disposed) return;
				draggingRef.current = true;
				setIsDropTarget(isOverPane(e.payload.position));
			});

			const overUn = await listen<DragDropPayload>("tauri://drag-over", (e) => {
				if (disposed) return;
				setIsDropTarget(isOverPane(e.payload.position));
			});

			const dropUn = await listen<DragDropPayload>("tauri://drag-drop", (e) => {
				if (disposed) return;
				draggingRef.current = false;
				setIsDropTarget(false);
				const { paths, position } = e.payload;
				if (paths && paths.length > 0 && isOverPane(position)) {
					onWrite(shellQuotePaths(paths));
				}
			});

			const leaveUn = await listen("tauri://drag-leave", () => {
				if (disposed) return;
				draggingRef.current = false;
				setIsDropTarget(false);
			});

			if (disposed) {
				enterUn();
				overUn();
				dropUn();
				leaveUn();
			} else {
				unlisteners.push(enterUn, overUn, dropUn, leaveUn);
			}
		}

		setup().catch((err) => console.error("[useFileDrop] Failed to set up listeners:", err));

		return () => {
			disposed = true;
			for (const un of unlisteners) un();
		};
	}, [isOverPane, onWrite]);

	return { isDropTarget };
}
