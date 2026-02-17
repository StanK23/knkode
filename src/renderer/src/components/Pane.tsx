import { useCallback, useEffect, useRef, useState } from 'react'
import type { PaneConfig, PaneTheme } from '../../../shared/types'
import { useClickOutside } from '../hooks/useClickOutside'
import { useInlineEdit } from '../hooks/useInlineEdit'
import { contextItemStyle, contextMenuStyle, contextSeparatorStyle } from '../styles/shared'
import { modKey } from '../utils/platform'
import { TerminalView } from './Terminal'

interface PaneProps {
	paneId: string
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
	const [contextPanel, setContextPanel] = useState<'cwd' | 'cmd' | 'theme' | null>(null)
	const contextRef = useRef<HTMLDivElement>(null)
	const [cwdInput, setCwdInput] = useState(config.cwd)
	const [cmdInput, setCmdInput] = useState(config.startupCommand ?? '')
	const [themeInput, setThemeInput] = useState({
		background: config.themeOverride?.background ?? '',
		foreground: config.themeOverride?.foreground ?? '',
		fontSize: config.themeOverride?.fontSize?.toString() ?? '',
	})

	// Spawn PTY on mount only — cwd/startupCommand captured at creation time
	const initialCwdRef = useRef(config.cwd)
	const initialCmdRef = useRef(config.startupCommand)
	useEffect(() => {
		window.api
			.createPty(paneId, initialCwdRef.current, initialCmdRef.current)
			.catch((err) => console.error(`[pane] Failed to create PTY ${paneId}:`, err))
		return () => {
			window.api.killPty(paneId).catch(() => {})
		}
	}, [paneId])

	const { isEditing, inputProps, startEditing } = useInlineEdit(config.label, (label) =>
		onUpdateConfig(paneId, { label }),
	)

	const handleContextMenu = useCallback((e: React.MouseEvent) => {
		e.preventDefault()
		setShowContext(true)
	}, [])

	const closeContext = useCallback(() => {
		setShowContext(false)
		setContextPanel(null)
	}, [])

	useClickOutside(contextRef, closeContext, showContext)

	const shortCwd = config.cwd.replace(/^\/Users\/[^/]+/, '~')

	const handleFocus = useCallback(() => onFocus(paneId), [paneId, onFocus])

	return (
		<div style={isFocused ? focusedContainerStyle : paneContainerStyle}>
			<div onContextMenu={handleContextMenu} onMouseDown={handleFocus} style={paneHeaderStyle}>
				{isEditing ? (
					<input {...inputProps} style={editInputStyle} />
				) : (
					<span
						onDoubleClick={startEditing}
						style={{ color: 'var(--text-primary)', fontWeight: 500, cursor: 'default' }}
					>
						{config.label}
					</span>
				)}

				<span style={cwdStyle}>{shortCwd}</span>

				<button
					type="button"
					onClick={() => onSplitVertical(paneId)}
					title={`Split vertical (${modKey}+D)`}
					style={headerBtnStyle}
				>
					┃
				</button>
				<button
					type="button"
					onClick={() => onSplitHorizontal(paneId)}
					title={`Split horizontal (${modKey}+Shift+D)`}
					style={headerBtnStyle}
				>
					━
				</button>
				{canClose && (
					<button
						type="button"
						onClick={() => onClose(paneId)}
						title={`Close pane (${modKey}+W)`}
						style={{ ...headerBtnStyle, color: 'var(--danger)' }}
					>
						✕
					</button>
				)}

				{showContext && (
					<div
						ref={contextRef}
						style={{ ...contextMenuStyle, top: 'var(--pane-header-height)', right: 4 }}
					>
						<button
							type="button"
							style={contextItemStyle}
							onClick={() => {
								onSplitVertical(paneId)
								closeContext()
							}}
						>
							Split Vertical
						</button>
						<button
							type="button"
							style={contextItemStyle}
							onClick={() => {
								onSplitHorizontal(paneId)
								closeContext()
							}}
						>
							Split Horizontal
						</button>
						<div style={contextSeparatorStyle} />
						<button
							type="button"
							style={contextItemStyle}
							onClick={() => {
								startEditing()
								closeContext()
							}}
						>
							Rename
						</button>
						<button
							type="button"
							style={contextItemStyle}
							onClick={() => {
								setCwdInput(config.cwd)
								setContextPanel(contextPanel === 'cwd' ? null : 'cwd')
							}}
						>
							Change Directory
						</button>
						{contextPanel === 'cwd' && (
							<form
								style={contextFormStyle}
								onSubmit={(e) => {
									e.preventDefault()
									if (cwdInput.trim()) {
										onUpdateConfig(paneId, { cwd: cwdInput.trim() })
									}
									closeContext()
								}}
							>
								<input
									type="text"
									value={cwdInput}
									onChange={(e) => setCwdInput(e.target.value)}
									placeholder="/path/to/directory"
									style={contextInputStyle}
									ref={(el) => el?.focus()}
								/>
								<button type="submit" style={contextSubmitStyle}>
									Set
								</button>
							</form>
						)}
						<button
							type="button"
							style={contextItemStyle}
							onClick={() => {
								setCmdInput(config.startupCommand ?? '')
								setContextPanel(contextPanel === 'cmd' ? null : 'cmd')
							}}
						>
							Set Startup Command
						</button>
						{contextPanel === 'cmd' && (
							<form
								style={contextFormStyle}
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
									style={contextInputStyle}
									ref={(el) => el?.focus()}
								/>
								<button type="submit" style={contextSubmitStyle}>
									Set
								</button>
							</form>
						)}
						<button
							type="button"
							style={contextItemStyle}
							onClick={() => {
								setThemeInput({
									background: config.themeOverride?.background ?? '',
									foreground: config.themeOverride?.foreground ?? '',
									fontSize: config.themeOverride?.fontSize?.toString() ?? '',
								})
								setContextPanel(contextPanel === 'theme' ? null : 'theme')
							}}
						>
							Theme Override
						</button>
						{contextPanel === 'theme' && (
							<div style={themeFormStyle}>
								<label style={themeLabelStyle}>
									<span>Background</span>
									<input
										type="text"
										value={themeInput.background}
										onChange={(e) => setThemeInput((t) => ({ ...t, background: e.target.value }))}
										placeholder={workspaceTheme.background}
										style={contextInputStyle}
									/>
								</label>
								<label style={themeLabelStyle}>
									<span>Foreground</span>
									<input
										type="text"
										value={themeInput.foreground}
										onChange={(e) => setThemeInput((t) => ({ ...t, foreground: e.target.value }))}
										placeholder={workspaceTheme.foreground}
										style={contextInputStyle}
									/>
								</label>
								<label style={themeLabelStyle}>
									<span>Font size</span>
									<input
										type="number"
										value={themeInput.fontSize}
										onChange={(e) => setThemeInput((t) => ({ ...t, fontSize: e.target.value }))}
										placeholder={String(workspaceTheme.fontSize)}
										style={{ ...contextInputStyle, width: 60 }}
										min={8}
										max={32}
									/>
								</label>
								<div style={{ display: 'flex', gap: 4 }}>
									<button
										type="button"
										style={contextSubmitStyle}
										onClick={() => {
											const override: Partial<PaneTheme> = {}
											if (themeInput.background) override.background = themeInput.background
											if (themeInput.foreground) override.foreground = themeInput.foreground
											if (themeInput.fontSize) override.fontSize = Number(themeInput.fontSize)
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
										style={{ ...contextSubmitStyle, color: 'var(--text-dim)' }}
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
						<div style={contextSeparatorStyle} />
						{canClose && (
							<button
								type="button"
								style={{ ...contextItemStyle, color: 'var(--danger)' }}
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

			<div style={{ flex: 1, overflow: 'hidden' }}>
				<TerminalView
					paneId={paneId}
					theme={workspaceTheme}
					themeOverride={config.themeOverride}
					focusGeneration={focusGeneration}
					isFocused={isFocused}
					onFocus={handleFocus}
				/>
			</div>
		</div>
	)
}

const paneContainerStyle: React.CSSProperties = {
	display: 'flex',
	flexDirection: 'column',
	height: '100%',
	width: '100%',
}

const focusedContainerStyle: React.CSSProperties = {
	...paneContainerStyle,
	boxShadow: 'inset 0 2px 0 var(--accent)',
}

const paneHeaderStyle: React.CSSProperties = {
	height: 'var(--pane-header-height)',
	display: 'flex',
	alignItems: 'center',
	gap: 8,
	padding: '0 8px',
	background: 'var(--bg-tertiary)',
	borderBottom: '1px solid var(--border)',
	fontSize: 11,
	flexShrink: 0,
	position: 'relative',
	userSelect: 'none',
}

const editInputStyle: React.CSSProperties = {
	background: 'var(--bg-secondary)',
	border: '1px solid var(--accent)',
	borderRadius: 'var(--radius-sm)',
	color: 'var(--text-primary)',
	fontSize: 11,
	padding: '1px 4px',
	outline: 'none',
	width: 80,
}

const cwdStyle: React.CSSProperties = {
	color: 'var(--text-dim)',
	flex: 1,
	overflow: 'hidden',
	textOverflow: 'ellipsis',
	whiteSpace: 'nowrap',
}

const headerBtnStyle: React.CSSProperties = {
	background: 'none',
	border: 'none',
	color: 'var(--text-dim)',
	cursor: 'pointer',
	padding: '0 3px',
	fontSize: 11,
	lineHeight: 1,
}

const contextFormStyle: React.CSSProperties = {
	display: 'flex',
	gap: 4,
	padding: '4px 12px 8px',
}

const contextInputStyle: React.CSSProperties = {
	background: 'var(--bg-primary)',
	border: '1px solid var(--border)',
	borderRadius: 'var(--radius-sm)',
	color: 'var(--text-primary)',
	fontSize: 11,
	padding: '3px 6px',
	outline: 'none',
	flex: 1,
	minWidth: 0,
}

const contextSubmitStyle: React.CSSProperties = {
	background: 'var(--bg-tertiary)',
	border: '1px solid var(--border)',
	borderRadius: 'var(--radius-sm)',
	color: 'var(--text-primary)',
	fontSize: 11,
	padding: '3px 8px',
	cursor: 'pointer',
	flexShrink: 0,
}

const themeFormStyle: React.CSSProperties = {
	display: 'flex',
	flexDirection: 'column',
	gap: 6,
	padding: '4px 12px 8px',
}

const themeLabelStyle: React.CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'space-between',
	gap: 8,
	fontSize: 11,
	color: 'var(--text-dim)',
}
