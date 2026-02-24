import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { DropPosition, PaneConfig, PaneTheme } from '../../../shared/types'

type ContextPanelKind = 'cwd' | 'cmd' | 'theme' | 'move'
type DropZone = DropPosition | 'center'
interface PaneDragPayload {
	paneId: string
	workspaceId: string
}
const PANE_DRAG_MIME = 'application/x-knkode-pane'
const ZONE_STYLES: Record<DropZone, React.CSSProperties> = {
	center: { inset: 0, backgroundColor: 'var(--color-accent)', opacity: 0.12 },
	left: { inset: 0, right: '50%', backgroundColor: 'var(--color-accent)', opacity: 0.18 },
	right: { inset: 0, left: '50%', backgroundColor: 'var(--color-accent)', opacity: 0.18 },
	top: { inset: 0, bottom: '50%', backgroundColor: 'var(--color-accent)', opacity: 0.18 },
	bottom: { inset: 0, top: '50%', backgroundColor: 'var(--color-accent)', opacity: 0.18 },
}

/** Determine which drop zone the cursor is in based on position within the element.
 *  Center is inner 50% on each axis. Edges are outer 25%; left/right checked
 *  first so they claim corners over top/bottom. */
function getDropZone(e: React.DragEvent, el: HTMLElement): DropZone {
	const rect = el.getBoundingClientRect()
	const x = (e.clientX - rect.left) / rect.width
	const y = (e.clientY - rect.top) / rect.height
	if (x < 0.25) return 'left'
	if (x > 0.75) return 'right'
	if (y < 0.25) return 'top'
	if (y > 0.75) return 'bottom'
	return 'center'
}
const VIEWPORT_MARGIN = 8
import { useClickOutside } from '../hooks/useClickOutside'
import { useInlineEdit } from '../hooks/useInlineEdit'
import { useStore } from '../store'
import { modKey } from '../utils/platform'
import { isValidCwd } from '../utils/validation'
import { FontPicker } from './FontPicker'
import { TerminalView } from './Terminal'

interface ThemeInputFields {
	background: string
	foreground: string
	fontSize: string
	fontFamily: string
}

function initThemeInput(override: Partial<PaneTheme> | null): ThemeInputFields {
	return {
		background: override?.background ?? '',
		foreground: override?.foreground ?? '',
		fontSize: override?.fontSize?.toString() ?? '',
		fontFamily: override?.fontFamily ?? '',
	}
}

interface SnippetDropdownProps {
	paneId: string
}

function SnippetDropdown({ paneId }: SnippetDropdownProps) {
	const [open, setOpen] = useState(false)
	const ref = useRef<HTMLDivElement>(null)
	const menuRef = useRef<HTMLDivElement>(null)
	const snippets = useStore((s) => s.snippets)
	const runSnippet = useStore((s) => s.runSnippet)
	const setFocusedPane = useStore((s) => s.setFocusedPane)

	useClickOutside(ref, () => setOpen(false), open)

	// Escape to close + arrow-key navigation for menu items
	useEffect(() => {
		if (!open) return
		const menu = menuRef.current
		if (!menu) return
		const firstItem = menu.querySelector<HTMLButtonElement>('[role="menuitem"]')
		firstItem?.focus()
		const handler = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				setOpen(false)
				return
			}
			if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
				e.preventDefault()
				const items = Array.from(menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'))
				const idx = items.indexOf(document.activeElement as HTMLButtonElement)
				const next =
					e.key === 'ArrowDown'
						? idx < items.length - 1
							? idx + 1
							: 0
						: idx > 0
							? idx - 1
							: items.length - 1
				items[next]?.focus()
			}
		}
		document.addEventListener('keydown', handler)
		return () => document.removeEventListener('keydown', handler)
	}, [open])

	if (snippets.length === 0) return null

	return (
		<div className="relative" ref={ref}>
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				title="Quick commands"
				aria-label="Quick commands"
				aria-expanded={open}
				aria-haspopup="true"
				className="bg-transparent border-none text-content-muted cursor-pointer px-0.5 text-[11px] leading-none hover:text-content focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
			>
				&gt;_
			</button>
			{open && (
				<div ref={menuRef} role="menu" className="ctx-menu right-0 top-full left-auto">
					{snippets.map((snippet) => (
						<button
							type="button"
							key={snippet.id}
							role="menuitem"
							className="ctx-item flex items-center gap-2"
							onClick={() => {
								runSnippet(snippet.id, paneId)
								setOpen(false)
								setFocusedPane(paneId)
							}}
						>
							<span className="text-accent">&gt;</span>
							<span className="truncate">{snippet.name}</span>
						</button>
					))}
				</div>
			)}
		</div>
	)
}

interface PaneProps {
	paneId: string
	paneIndex: number
	workspaceId: string
	config: PaneConfig
	workspaceTheme: PaneTheme
	onUpdateConfig: (paneId: string, updates: Partial<PaneConfig>) => void
	onSplitHorizontal: (paneId: string) => void
	onSplitVertical: (paneId: string) => void
	onClose: (paneId: string) => void
	canClose: boolean
	isFocused: boolean
	focusGeneration: number
	onFocus: (paneId: string) => void
}

export function Pane({
	paneId,
	paneIndex,
	workspaceId,
	config,
	workspaceTheme,
	onUpdateConfig,
	onSplitHorizontal,
	onSplitVertical,
	onClose,
	canClose,
	isFocused,
	focusGeneration,
	onFocus,
}: PaneProps) {
	const [showContext, setShowContext] = useState(false)
	const [contextPos, setContextPos] = useState({ x: 0, y: 0 })
	const [clampedPos, setClampedPos] = useState<{ x: number; y: number } | null>(null)
	const [contextPanel, setContextPanel] = useState<ContextPanelKind | null>(null)
	const contextRef = useRef<HTMLDivElement>(null)
	const [cwdInput, setCwdInput] = useState(config.cwd)
	const [cmdInput, setCmdInput] = useState(config.startupCommand ?? '')
	const [themeInput, setThemeInput] = useState(() => initThemeInput(config.themeOverride))
	const [isDragging, setIsDragging] = useState(false)
	const [dropZone, setDropZone] = useState<DropZone | null>(null)
	const dragCounterRef = useRef(0)
	const dropZoneRef = useRef<DropZone | null>(null)
	const outerRef = useRef<HTMLDivElement>(null)

	const movePaneToWorkspace = useStore((s) => s.movePaneToWorkspace)
	const swapPanes = useStore((s) => s.swapPanes)
	const movePaneToPosition = useStore((s) => s.movePaneToPosition)
	const workspaces = useStore((s) => s.workspaces)
	const openWorkspaceIds = useStore((s) => s.appState.openWorkspaceIds)
	// Only show workspaces that are currently open as tabs (not all workspaces)
	const otherOpenWorkspaces = useMemo(
		() => workspaces.filter((w) => openWorkspaceIds.includes(w.id) && w.id !== workspaceId),
		[workspaces, openWorkspaceIds, workspaceId],
	)

	// Ensure PTY exists for this pane. Uses store's activePtyIds to avoid
	// double-creation on Allotment remounts (e.g. when splitting panes).
	// PTY kill is handled by store actions and layout-change helpers.
	const ensurePty = useStore((s) => s.ensurePty)
	const killPtys = useStore((s) => s.killPtys)
	// Capture initial values so config updates don't re-trigger PTY creation
	const initialCwdRef = useRef(config.cwd)
	const initialCmdRef = useRef(config.startupCommand)
	useEffect(() => {
		ensurePty(paneId, initialCwdRef.current, initialCmdRef.current)
	}, [paneId, ensurePty])

	const { isEditing, inputProps, startEditing } = useInlineEdit(config.label, (label) =>
		onUpdateConfig(paneId, { label }),
	)

	const handleContextMenu = useCallback((e: React.MouseEvent) => {
		e.preventDefault()
		setContextPos({ x: e.clientX, y: e.clientY })
		setClampedPos(null)
		setShowContext(true)
	}, [])

	const closeContext = useCallback(() => {
		setShowContext(false)
		setContextPanel(null)
	}, [])

	const stopPropagation = useCallback((e: React.MouseEvent) => e.stopPropagation(), [])

	useClickOutside(contextRef, closeContext, showContext)

	// Close context menu on Escape — uses global listener so the menu
	// doesn't need tabIndex/focus (which would add a visible outline on open).
	useEffect(() => {
		if (!showContext) return
		const handler = (e: KeyboardEvent) => {
			if (e.key === 'Escape') closeContext()
		}
		document.addEventListener('keydown', handler)
		return () => document.removeEventListener('keydown', handler)
	}, [showContext, closeContext])

	// Clamp context menu to viewport edges after measuring its rendered size.
	// Stores clamped coordinates in state so React owns the style prop (no
	// imperative DOM mutation). Runs before paint via useLayoutEffect so the
	// user never sees the unclamped position. Re-runs when contextPanel
	// changes because sub-panel expansion alters menu height.
	// Also listens for window resize to re-clamp while the menu is open.
	// biome-ignore lint/correctness/useExhaustiveDependencies: contextPanel intentionally triggers re-clamp on sub-panel toggle
	useLayoutEffect(() => {
		const el = contextRef.current
		if (!showContext || !el) return
		const clamp = () => {
			const { width, height } = el.getBoundingClientRect()
			setClampedPos({
				x: Math.max(
					VIEWPORT_MARGIN,
					Math.min(contextPos.x, window.innerWidth - width - VIEWPORT_MARGIN),
				),
				y: Math.max(
					VIEWPORT_MARGIN,
					Math.min(contextPos.y, window.innerHeight - height - VIEWPORT_MARGIN),
				),
			})
		}
		clamp()
		window.addEventListener('resize', clamp)
		return () => window.removeEventListener('resize', clamp)
	}, [showContext, contextPos.x, contextPos.y, contextPanel])

	const shortCwd = config.cwd.replace(/^\/Users\/[^/]+/, '~')

	const handleFocus = useCallback(() => onFocus(paneId), [paneId, onFocus])

	const handleDragStart = useCallback(
		(e: React.DragEvent) => {
			e.dataTransfer.effectAllowed = 'move'
			e.dataTransfer.setData(
				PANE_DRAG_MIME,
				JSON.stringify({ paneId, workspaceId } satisfies PaneDragPayload),
			)
			setIsDragging(true)
		},
		[paneId, workspaceId],
	)
	const handleDragEnd = useCallback(() => {
		setIsDragging(false)
		dragCounterRef.current = 0
	}, [])
	const handlePaneDragOver = useCallback((e: React.DragEvent) => {
		if (!e.dataTransfer.types.includes(PANE_DRAG_MIME)) return
		e.preventDefault()
		e.dataTransfer.dropEffect = 'move'
		const el = outerRef.current
		if (el) {
			const zone = getDropZone(e, el)
			if (zone !== dropZoneRef.current) {
				dropZoneRef.current = zone
				setDropZone(zone)
			}
		}
	}, [])
	const handlePaneDragEnter = useCallback((e: React.DragEvent) => {
		if (e.dataTransfer.types.includes(PANE_DRAG_MIME)) {
			dragCounterRef.current++
		}
	}, [])
	const handlePaneDragLeave = useCallback((e: React.DragEvent) => {
		if (!e.dataTransfer.types.includes(PANE_DRAG_MIME)) return
		dragCounterRef.current--
		if (dragCounterRef.current === 0) {
			dropZoneRef.current = null
			setDropZone(null)
		}
	}, [])
	const handlePaneDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault()
			dragCounterRef.current = 0
			dropZoneRef.current = null
			setDropZone(null)
			const el = outerRef.current
			const zone = el ? getDropZone(e, el) : null
			const raw = e.dataTransfer.getData(PANE_DRAG_MIME)
			if (!raw) return
			let data: PaneDragPayload
			try {
				data = JSON.parse(raw)
			} catch (err) {
				console.warn('[pane] Failed to parse drag payload:', raw, err)
				return
			}
			if (typeof data.paneId !== 'string' || typeof data.workspaceId !== 'string') return
			if (data.workspaceId !== workspaceId || data.paneId === paneId) return
			if (zone === 'center' || !zone) {
				swapPanes(workspaceId, data.paneId, paneId)
			} else {
				movePaneToPosition(workspaceId, data.paneId, paneId, zone)
			}
		},
		[paneId, workspaceId, swapPanes, movePaneToPosition],
	)

	return (
		<div
			ref={outerRef}
			className="flex flex-col h-full w-full relative"
			onDragOver={handlePaneDragOver}
			onDragEnter={handlePaneDragEnter}
			onDragLeave={handlePaneDragLeave}
			onDrop={handlePaneDrop}
		>
			<div
				draggable={!isEditing}
				aria-roledescription="draggable pane"
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
				onContextMenu={handleContextMenu}
				onMouseDown={handleFocus}
				className={`h-header flex items-center gap-2 px-2 text-[11px] shrink-0 relative select-none transition-colors duration-200 ${
					isFocused ? 'bg-elevated border-b border-accent' : 'bg-sunken border-b border-edge'
				} ${isDragging ? 'opacity-40' : ''}`}
			>
				<span className="text-content-muted text-[10px] font-semibold min-w-3 text-center shrink-0">
					{paneIndex}
				</span>
				{isEditing ? (
					<input
						{...inputProps}
						className="bg-elevated border border-accent rounded-sm text-content text-[11px] py-px px-1 outline-none w-20"
					/>
				) : (
					<span onDoubleClick={startEditing} className="text-content font-medium cursor-default">
						{config.label}
					</span>
				)}

				<span className="text-content-muted flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
					{shortCwd}
				</span>

				<SnippetDropdown paneId={paneId} />
				<button
					type="button"
					onClick={() => onSplitVertical(paneId)}
					title={`Split vertical (${modKey}+D)`}
					aria-label="Split pane vertically"
					className="bg-transparent border-none text-content-muted cursor-pointer px-0.5 text-[11px] leading-none hover:text-content focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
				>
					┃
				</button>
				<button
					type="button"
					onClick={() => onSplitHorizontal(paneId)}
					title={`Split horizontal (${modKey}+Shift+D)`}
					aria-label="Split pane horizontally"
					className="bg-transparent border-none text-content-muted cursor-pointer px-0.5 text-[11px] leading-none hover:text-content focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
				>
					━
				</button>
				{canClose && (
					<button
						type="button"
						onClick={() => onClose(paneId)}
						title={`Close pane (${modKey}+W)`}
						aria-label="Close pane"
						className="bg-transparent border-none text-danger cursor-pointer px-0.5 text-[11px] leading-none hover:brightness-125 focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
					>
						✕
					</button>
				)}

				{showContext && (
					<div
						ref={contextRef}
						className="ctx-menu"
						/* Inline style required: position fixed escapes allotment's overflow:hidden,
						   and dynamic cursor coordinates cannot be expressed as Tailwind classes.
						   Overrides the `absolute` from .ctx-menu (Tab/TabBar still use absolute). */
						style={{
							position: 'fixed',
							left: clampedPos?.x ?? 0,
							top: clampedPos?.y ?? 0,
							visibility: clampedPos ? 'visible' : 'hidden',
						}}
						/* Prevent header's onMouseDown (handleFocus) from firing — without this,
						   the zustand store update triggers a synchronous re-render that disrupts
						   click events on menu buttons (the "stuck dismiss" bug). */
						onMouseDown={stopPropagation}
					>
						<button
							type="button"
							className="ctx-item"
							onClick={() => {
								onSplitVertical(paneId)
								closeContext()
							}}
						>
							Split Vertical
						</button>
						<button
							type="button"
							className="ctx-item"
							onClick={() => {
								onSplitHorizontal(paneId)
								closeContext()
							}}
						>
							Split Horizontal
						</button>
						{/* canClose ensures the source workspace keeps at least one pane after the move */}
						{canClose && otherOpenWorkspaces.length > 0 && (
							<>
								<div className="ctx-separator" />
								<button
									type="button"
									className="ctx-item"
									onClick={() => setContextPanel(contextPanel === 'move' ? null : 'move')}
								>
									Move to Workspace
								</button>
								{contextPanel === 'move' && (
									<div className="flex flex-col gap-0.5 px-1 py-1">
										{otherOpenWorkspaces.map((ws) => (
											<button
												type="button"
												key={ws.id}
												className="ctx-item flex items-center gap-2"
												onClick={() => {
													movePaneToWorkspace(workspaceId, paneId, ws.id)
													closeContext()
												}}
											>
												<span
													className="w-2 h-2 rounded-full shrink-0"
													aria-hidden="true"
													style={{ background: ws.color }}
												/>
												<span className="truncate">{ws.name}</span>
											</button>
										))}
									</div>
								)}
							</>
						)}
						<div className="ctx-separator" />
						<button
							type="button"
							className="ctx-item"
							onClick={() => {
								startEditing()
								closeContext()
							}}
						>
							Rename
						</button>
						<button
							type="button"
							className="ctx-item"
							onClick={() => {
								setCwdInput(config.cwd)
								setContextPanel(contextPanel === 'cwd' ? null : 'cwd')
							}}
						>
							Change Directory
						</button>
						{contextPanel === 'cwd' && (
							<form
								className="flex gap-1 px-3 py-1 pb-2"
								onSubmit={(e) => {
									e.preventDefault()
									const cwd = cwdInput.trim()
									if (cwd && isValidCwd(cwd)) {
										onUpdateConfig(paneId, { cwd })
									}
									closeContext()
								}}
							>
								<input
									type="text"
									value={cwdInput}
									onChange={(e) => setCwdInput(e.target.value)}
									placeholder="/path/to/directory"
									className="ctx-input flex-1 min-w-0"
									ref={(el) => el?.focus()}
								/>
								<button type="submit" className="ctx-submit">
									Set
								</button>
							</form>
						)}
						<button
							type="button"
							className="ctx-item"
							onClick={() => {
								setCmdInput(config.startupCommand ?? '')
								setContextPanel(contextPanel === 'cmd' ? null : 'cmd')
							}}
						>
							Set Startup Command
						</button>
						{contextPanel === 'cmd' && (
							<form
								className="flex gap-1 px-3 py-1 pb-2"
								onSubmit={(e) => {
									e.preventDefault()
									onUpdateConfig(paneId, {
										startupCommand: cmdInput.trim() || null,
									})
									closeContext()
								}}
							>
								<input
									type="text"
									value={cmdInput}
									onChange={(e) => setCmdInput(e.target.value)}
									placeholder="npm run dev"
									className="ctx-input flex-1 min-w-0"
									ref={(el) => el?.focus()}
								/>
								<button type="submit" className="ctx-submit">
									Set
								</button>
							</form>
						)}
						<button
							type="button"
							className="ctx-item"
							onClick={() => {
								setThemeInput(initThemeInput(config.themeOverride))
								setContextPanel(contextPanel === 'theme' ? null : 'theme')
							}}
						>
							Theme Override
						</button>
						{contextPanel === 'theme' && (
							<div className="flex flex-col gap-1.5 px-3 py-1 pb-2">
								<label className="flex items-center justify-between gap-2 text-[11px] text-content-muted">
									<span>Background</span>
									<input
										type="text"
										value={themeInput.background}
										onChange={(e) => setThemeInput((t) => ({ ...t, background: e.target.value }))}
										placeholder={workspaceTheme.background}
										className="ctx-input flex-1 min-w-0"
									/>
								</label>
								<label className="flex items-center justify-between gap-2 text-[11px] text-content-muted">
									<span>Foreground</span>
									<input
										type="text"
										value={themeInput.foreground}
										onChange={(e) => setThemeInput((t) => ({ ...t, foreground: e.target.value }))}
										placeholder={workspaceTheme.foreground}
										className="ctx-input flex-1 min-w-0"
									/>
								</label>
								<span className="text-[11px] text-content-muted">Font</span>
								<FontPicker
									value={themeInput.fontFamily}
									onChange={(font) => setThemeInput((t) => ({ ...t, fontFamily: font }))}
									size="sm"
								/>
								<div className="flex items-center justify-between gap-2 text-[11px] text-content-muted">
									<span>Font size</span>
									<div className="flex items-center gap-1">
										<button
											type="button"
											onClick={() =>
												setThemeInput((t) => {
													const cur = Number(t.fontSize) || workspaceTheme.fontSize
													return { ...t, fontSize: String(Math.max(8, cur - 1)) }
												})
											}
											aria-label="Decrease font size"
											className="bg-canvas border border-edge rounded-sm text-content cursor-pointer w-5 h-5 flex items-center justify-center text-[10px] hover:bg-overlay"
										>
											-
										</button>
										<span className="tabular-nums w-4 text-center">
											{themeInput.fontSize || workspaceTheme.fontSize}
										</span>
										<button
											type="button"
											onClick={() =>
												setThemeInput((t) => {
													const cur = Number(t.fontSize) || workspaceTheme.fontSize
													return { ...t, fontSize: String(Math.min(32, cur + 1)) }
												})
											}
											aria-label="Increase font size"
											className="bg-canvas border border-edge rounded-sm text-content cursor-pointer w-5 h-5 flex items-center justify-center text-[10px] hover:bg-overlay"
										>
											+
										</button>
									</div>
								</div>
								<div className="flex gap-1">
									<button
										type="button"
										className="ctx-submit"
										onClick={() => {
											const override: Partial<PaneTheme> = {}
											if (themeInput.background) override.background = themeInput.background
											if (themeInput.foreground) override.foreground = themeInput.foreground
											if (themeInput.fontSize) {
												const fs = Number(themeInput.fontSize)
												if (Number.isFinite(fs) && fs >= 8 && fs <= 32) override.fontSize = fs
											}
											if (themeInput.fontFamily) override.fontFamily = themeInput.fontFamily
											onUpdateConfig(paneId, {
												themeOverride: Object.keys(override).length > 0 ? override : null,
											})
											closeContext()
										}}
									>
										Apply
									</button>
									<button
										type="button"
										className="ctx-submit text-content-muted"
										onClick={() => {
											onUpdateConfig(paneId, { themeOverride: null })
											closeContext()
										}}
									>
										Reset
									</button>
								</div>
							</div>
						)}
						<div className="ctx-separator" />
						<button
							type="button"
							className="ctx-item"
							onClick={() => {
								killPtys([paneId])
								ensurePty(paneId, config.cwd, config.startupCommand)
								closeContext()
								onFocus(paneId)
							}}
						>
							Restart Pane
						</button>
						{canClose && (
							<button
								type="button"
								className="ctx-item text-danger"
								onClick={() => {
									onClose(paneId)
									closeContext()
								}}
							>
								Close Pane
							</button>
						)}
					</div>
				)}
			</div>

			{/* Dim overlay scoped to terminal area only (not the header).
			    Always rendered to enable CSS transition; opacity toggled via class.
			    Inline style required: Tailwind cannot express dynamic runtime opacity. */}
			<div className="flex-1 overflow-hidden p-px relative">
				<TerminalView
					paneId={paneId}
					theme={workspaceTheme}
					themeOverride={config.themeOverride}
					focusGeneration={focusGeneration}
					isFocused={isFocused}
					onFocus={handleFocus}
				/>
				<div
					className={`absolute inset-0 bg-black pointer-events-none transition-opacity duration-150 ${
						!isFocused && workspaceTheme.unfocusedDim > 0 ? '' : 'opacity-0'
					}`}
					style={
						!isFocused && workspaceTheme.unfocusedDim > 0
							? { opacity: Math.max(0, Math.min(0.7, workspaceTheme.unfocusedDim)) }
							: undefined
					}
				/>
			</div>

			{/* Drop zone overlay — shows where the dragged pane will land
			    (swap for center, split for edges) */}
			{dropZone && (
				<div className="absolute pointer-events-none z-20" style={ZONE_STYLES[dropZone]} />
			)}
		</div>
	)
}
