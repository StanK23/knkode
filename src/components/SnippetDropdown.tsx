import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useClickOutside } from "../hooks/useClickOutside";
import { getPortalRoot, VIEWPORT_MARGIN } from "../lib/ui-constants";
import type { PaneTheme, Snippet } from "../shared/types";
import { useStore } from "../store";

const EMPTY_SNIPPETS: readonly Snippet[] = [];

interface SnippetDropdownProps {
	paneId: string;
	workspaceId: string;
	statusBarPosition: NonNullable<PaneTheme["statusBarPosition"]>;
	className?: string | undefined;
	style?: React.CSSProperties | undefined;
	children?: React.ReactNode;
}

export function SnippetDropdown({
	paneId,
	workspaceId,
	statusBarPosition,
	className,
	style,
	children,
}: SnippetDropdownProps) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const [menuPos, setMenuPos] = useState<{ right: number; top: number } | null>(null);
	const globalSnippets = useStore((s) => s.snippets);
	const wsSnippets = useStore(
		(s) => s.workspaces.find((w) => w.id === workspaceId)?.snippets ?? EMPTY_SNIPPETS,
	);
	const wsName = useStore(
		(s) => s.workspaces.find((w) => w.id === workspaceId)?.name ?? "Workspace",
	);
	const runSnippet = useStore((s) => s.runSnippet);
	const runWorkspaceSnippet = useStore((s) => s.runWorkspaceSnippet);
	const setFocusedPane = useStore((s) => s.setFocusedPane);

	const hasAny = globalSnippets.length > 0 || wsSnippets.length > 0;

	// Build unified menu items: global first, then workspace, with group metadata
	const menuItems = useMemo(() => {
		const items: Array<{
			id: string;
			key: string;
			name: string;
			group: string;
			onRun: () => void;
		}> = [];

		for (const s of globalSnippets) {
			items.push({
				id: s.id,
				key: `global-${s.id}`,
				name: s.name,
				group: "Global",
				onRun: () => runSnippet(s.id, paneId),
			});
		}
		for (const s of wsSnippets) {
			items.push({
				id: s.id,
				key: `ws-${s.id}`,
				name: s.name,
				group: wsName,
				onRun: () => runWorkspaceSnippet(workspaceId, s.id, paneId),
			});
		}
		return items;
	}, [globalSnippets, wsSnippets, wsName, runSnippet, runWorkspaceSnippet, paneId, workspaceId]);

	useClickOutside(ref, () => setOpen(false), open, menuRef);

	// Position portal menu relative to trigger, clamped to viewport
	useLayoutEffect(() => {
		if (!open || !ref.current) return;
		const position = () => {
			const trigger = ref.current;
			if (!trigger) return;
			const rect = trigger.getBoundingClientRect();
			const menuHeight = menuRef.current?.getBoundingClientRect().height ?? 0;
			const right = Math.max(VIEWPORT_MARGIN, window.innerWidth - rect.right);
			const top =
				statusBarPosition === "bottom"
					? Math.max(VIEWPORT_MARGIN, rect.top - menuHeight)
					: Math.min(rect.bottom, window.innerHeight - menuHeight - VIEWPORT_MARGIN);
			setMenuPos({ right, top });
		};
		position();
		window.addEventListener("resize", position);
		return () => window.removeEventListener("resize", position);
	}, [open, statusBarPosition]);

	// Escape to close + arrow-key navigation for menu items
	useEffect(() => {
		if (!open) return;
		const menu = menuRef.current;
		if (!menu) return;
		const firstItem = menu.querySelector<HTMLButtonElement>('[role="menuitem"]');
		firstItem?.focus();
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setOpen(false);
				return;
			}
			if (e.key === "ArrowDown" || e.key === "ArrowUp") {
				e.preventDefault();
				const items = Array.from(menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
				const idx = items.indexOf(document.activeElement as HTMLButtonElement);
				let next: number;
				if (e.key === "ArrowDown") {
					next = idx < items.length - 1 ? idx + 1 : 0;
				} else {
					next = idx > 0 ? idx - 1 : items.length - 1;
				}
				items[next]?.focus();
			}
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [open]);

	if (!hasAny) return null;

	return (
		<div ref={ref}>
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				title="Quick commands"
				aria-label="Quick commands"
				aria-expanded={open}
				aria-haspopup="true"
				className={className}
				style={style}
			>
				{children ?? ">_"}
			</button>
			{open &&
				createPortal(
					<div
						ref={menuRef}
						role="menu"
						aria-label="Quick commands"
						className="ctx-menu"
						style={{
							position: "fixed",
							right: menuPos?.right ?? 0,
							top: menuPos?.top ?? 0,
							visibility: menuPos ? "visible" : "hidden",
						}}
					>
						{menuItems.map((item, i) => {
							const prevGroup = i > 0 ? menuItems[i - 1]?.group ?? null : null;
							const isNewGroup = item.group !== prevGroup;
							return (
								<Fragment key={item.key}>
									{isNewGroup && prevGroup !== null && (
										<div className="ctx-separator" role="separator" />
									)}
									{isNewGroup && (
										<div className="text-[10px] text-content-muted px-2 py-1" role="presentation">
											{item.group}
										</div>
									)}
									<button
										type="button"
										role="menuitem"
										className="ctx-item flex items-center gap-2"
										onClick={() => {
											item.onRun();
											setOpen(false);
											setFocusedPane(paneId);
										}}
									>
										<span className="text-accent">&gt;</span>
										<span className="truncate">{item.name}</span>
									</button>
								</Fragment>
							);
						})}
					</div>,
					getPortalRoot(),
				)}
		</div>
	);
}
