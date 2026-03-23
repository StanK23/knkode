import { getVersion } from "@tauri-apps/api/app";
import { useEffect, useState } from "react";
import type { UpdateActions, UpdateState } from "../hooks/useUpdateChecker";

const GITHUB_URL = "https://github.com/knkenko/knkode";

const BTN =
	"h-7 text-xs font-medium rounded bg-transparent border border-edge text-content-secondary cursor-pointer hover:text-content hover:bg-overlay focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none transition-all duration-150 px-3";
const BTN_PRIMARY =
	"h-7 text-xs font-medium rounded bg-accent text-white border-none cursor-pointer hover:brightness-110 focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none transition-all duration-150 px-3";

interface AboutTabPanelProps {
	updateState: UpdateState;
	updateActions: UpdateActions;
	hidden?: boolean;
}

export function AboutTabPanel({ updateState, updateActions, hidden }: AboutTabPanelProps) {
	const [appVersion, setAppVersion] = useState<string | null>(null);

	useEffect(() => {
		getVersion().then(setAppVersion).catch(() => setAppVersion("unknown"));
	}, []);

	const handleGitHubStar = () => {
		window.api.openExternal(GITHUB_URL).catch((err: unknown) => {
			console.error("[about] Failed to open GitHub URL:", err);
		});
	};

	return (
		<div
			id="settings-tabpanel-About"
			role="tabpanel"
			aria-labelledby="settings-tab-About"
			hidden={hidden}
			className="flex-1 min-h-0 px-6 py-6 overflow-y-auto overflow-x-hidden flex flex-col gap-8"
		>
			{/* App info */}
			<div className="flex flex-col gap-3">
				<div className="flex items-baseline gap-2">
					<span className="text-sm font-semibold text-content">knkode</span>
					{appVersion && (
						<span className="text-xs text-content-muted">v{appVersion}</span>
					)}
				</div>
				<p className="text-xs text-content-muted m-0">
					Terminal workspace manager
				</p>
			</div>

			{/* Update section */}
			<div className="flex flex-col gap-3">
				<span className="section-label">Updates</span>
				<UpdateFlow state={updateState} actions={updateActions} />
			</div>

			{/* Links */}
			<div className="flex flex-col gap-3">
				<span className="section-label">Links</span>
				<div className="flex gap-2">
					<button type="button" onClick={handleGitHubStar} className={BTN}>
						<span className="flex items-center gap-1.5">
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								aria-hidden="true"
							>
								<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
							</svg>
							Star on GitHub
						</span>
					</button>
				</div>
			</div>
		</div>
	);
}

function UpdateFlow({ state, actions }: { state: UpdateState; actions: UpdateActions }) {
	const { status } = state;

	if (status === "idle") {
		return (
			<button type="button" onClick={actions.checkForUpdate} className={BTN}>
				Check for Updates
			</button>
		);
	}

	if (status === "checking") {
		return (
			<button type="button" disabled className={`${BTN} opacity-60 cursor-wait`}>
				Checking...
			</button>
		);
	}

	if (status === "up_to_date") {
		return <span className="text-xs text-content-muted">You're up to date.</span>;
	}

	if (status === "available") {
		return (
			<div className="flex items-center gap-2">
				<span className="text-xs text-content">
					New version available: <span className="text-accent font-medium">v{state.version}</span>
				</span>
				<button type="button" onClick={actions.installUpdate} className={BTN_PRIMARY}>
					Install
				</button>
			</div>
		);
	}

	if (status === "downloading") {
		return (
			<div className="flex flex-col gap-1.5">
				<span className="text-xs text-content-muted">Downloading v{state.version}...</span>
				<div className="h-1.5 rounded-full bg-surface overflow-hidden w-full max-w-[200px]">
					<div
						className="h-full rounded-full bg-accent transition-all duration-300"
						style={{ width: `${Math.round(state.progress * 100)}%` }}
					/>
				</div>
			</div>
		);
	}

	if (status === "ready") {
		return (
			<div className="flex items-center gap-2">
				<span className="text-xs text-content">Update installed.</span>
				<button type="button" onClick={actions.restartApp} className={BTN_PRIMARY}>
					Restart Now
				</button>
			</div>
		);
	}

	if (status === "error") {
		return (
			<div className="flex items-center gap-2">
				<span className="text-xs text-danger">{state.error ?? "Update check failed"}</span>
				<button type="button" onClick={actions.checkForUpdate} className={BTN}>
					Retry
				</button>
			</div>
		);
	}

	return null;
}
