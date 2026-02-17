import { useCallback, useEffect, useRef, useState } from 'react'
import type { PaneConfig, PaneTheme } from '../../../shared/types'
import { useClickOutside } from '../hooks/useClickOutside'
import { useInlineEdit } from '../hooks/useInlineEdit'
import { contextItemStyle, contextMenuStyle, contextSeparatorStyle } from '../styles/shared'
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
}: PaneProps) {
	const [showContext, setShowContext] = useState(false)
	const contextRef = useRef<HTMLDivElement>(null)

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

	useClickOutside(contextRef, () => setShowContext(false), showContext)

	const shortCwd = config.cwd.replace(/^\/Users\/[^/]+/, '~')

	return (
		<div style={paneContainerStyle}>
			<div onContextMenu={handleContextMenu} style={paneHeaderStyle}>
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
					title="Split vertical"
					style={headerBtnStyle}
				>
					┃
				</button>
				<button
					type="button"
					onClick={() => onSplitHorizontal(paneId)}
					title="Split horizontal"
					style={headerBtnStyle}
				>
					━
				</button>
				{canClose && (
					<button
						type="button"
						onClick={() => onClose(paneId)}
						title="Close pane"
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
								setShowContext(false)
							}}
						>
							Split Vertical
						</button>
						<button
							type="button"
							style={contextItemStyle}
							onClick={() => {
								onSplitHorizontal(paneId)
								setShowContext(false)
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
								setShowContext(false)
							}}
						>
							Rename
						</button>
						{canClose && (
							<button
								type="button"
								style={{ ...contextItemStyle, color: 'var(--danger)' }}
								onClick={() => {
									onClose(paneId)
									setShowContext(false)
								}}
							>
								Close Pane
							</button>
						)}
					</div>
				)}
			</div>

			<div style={{ flex: 1, overflow: 'hidden' }}>
				<TerminalView paneId={paneId} theme={workspaceTheme} themeOverride={config.themeOverride} />
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
