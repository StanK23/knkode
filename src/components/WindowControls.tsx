import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useEffect, useState } from "react";

/** Custom minimize / maximize / close buttons for Windows (no native title bar). */
export function WindowControls() {
	const [maximized, setMaximized] = useState(false);

	useEffect(() => {
		const win = getCurrentWindow();
		win.isMaximized().then(setMaximized).catch(() => {});
		const unlisten = win.onResized(() => {
			win.isMaximized().then(setMaximized).catch(() => {});
		});
		return () => {
			unlisten.then((fn) => fn());
		};
	}, []);

	const minimize = useCallback(() => {
		getCurrentWindow().minimize().catch(() => {});
	}, []);

	const toggleMaximize = useCallback(() => {
		getCurrentWindow().toggleMaximize().catch(() => {});
	}, []);

	const close = useCallback(() => {
		getCurrentWindow().close().catch(() => {});
	}, []);

	const btnClass =
		"flex items-center justify-center w-[46px] h-8 bg-transparent border-none text-content-muted cursor-pointer hover:bg-white/10 transition-colors duration-100";

	return (
		<div className="flex shrink-0 no-drag" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
			<button type="button" onClick={minimize} aria-label="Minimize" className={btnClass}>
				<svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor" aria-hidden="true">
					<rect width="10" height="1" />
				</svg>
			</button>
			<button type="button" onClick={toggleMaximize} aria-label={maximized ? "Restore" : "Maximize"} className={btnClass}>
				{maximized ? (
					<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
						<rect x="2" y="0" width="8" height="8" rx="0.5" />
						<rect x="0" y="2" width="8" height="8" rx="0.5" />
					</svg>
				) : (
					<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
						<rect x="0.5" y="0.5" width="9" height="9" rx="0.5" />
					</svg>
				)}
			</button>
			<button
				type="button"
				onClick={close}
				aria-label="Close"
				className={`${btnClass} hover:!bg-red-600 hover:!text-white`}
			>
				<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" aria-hidden="true">
					<path d="M1 1L9 9M9 1L1 9" />
				</svg>
			</button>
		</div>
	);
}
