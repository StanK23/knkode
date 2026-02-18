import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PaneConfig, PaneTheme } from '../../../shared/types'
import { useClickOutside } from '../hooks/useClickOutside'
import { useInlineEdit } from '../hooks/useInlineEdit'
import { useStore } from '../store'
import { modKey } from '../utils/platform'
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

interface PaneProps {
	paneId: string
	paneIndex: number
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
	const [contextPanel, setContextPanel] = useState<'cwd' | 'cmd' | 'theme' | null>(null)
	const contextRef = useRef<HTMLDivElement>(null)
	const [cwdInput, setCwdInput] = useState(config.cwd)
	const [cmdInput, setCmdInput] = useState(config.startupCommand ?? '')
	const [themeInput, setThemeInput] = useState(() => initThemeInput(config.themeOverride))

	// Ensure PTY exists for this pane. Uses store's activePtyIds to avoid
	// double-creation on Allotment remounts (e.g. when splitting panes).
	// PTY kill is handled by store actions and layout-change helpers.
	const ensurePty = useStore((s) => s.ensurePty)
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
		setShowContext(true)
	}, [])

	const closeContext = useCallback(() => {
		setShowContext(false)
		setContextPanel(null)
	}, [])

	useClickOutside(contextRef, closeContext, showContext)

	// Clamp context menu to viewport edges after measuring its dimensions.
	// Runs before paint so the user never sees the unclamped position.
	useLayoutEffect(() => {
		const el = contextRef.current
		if (!showContext || !el) return
		const { width, height } = el.getBoundingClientRect()
		const margin = 8
		el.style.left = `${Math.max(margin, Math.min(contextPos.x, window.innerWidth - width - margin))}px`
		el.style.top = `${Math.max(margin, Math.min(contextPos.y, window.innerHeight - height - margin))}px`
	}, [showContext, contextPos.x, contextPos.y])

	const shortCwd = config.cwd.replace(/^\/Users\/[^/]+/, '~')

	const handleFocus = useCallback(() => onFocus(paneId), [paneId, onFocus])

	return (
		<div className="flex flex-col h-full w-full">
			<div
				onContextMenu={handleContextMenu}
				onMouseDown={handleFocus}
				className={`h-header flex items-center gap-2 px-2 text-[11px] shrink-0 relative select-none ${
					isFocused ? 'bg-elevated border-b border-accent' : 'bg-sunken border-b border-edge'
				}`}
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
						   and dynamic cursor coordinates cannot be expressed as Tailwind classes. */
						style={{ position: 'fixed', left: contextPos.x, top: contextPos.y }}
						onKeyDown={(e) => {
							if (e.key === 'Escape') closeContext()
						}}
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
									const path = cwdInput.trim()
									if (path && (path.startsWith('/') || path.startsWith('~'))) {
										onUpdateConfig(paneId, { cwd: path })
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
						{canClose && (
							<>
								<div className="ctx-separator" />
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
							</>
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
		</div>
	)
}
