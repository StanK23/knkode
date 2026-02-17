import { useCallback, useEffect, useRef, useState } from 'react'
import type { PaneConfig, PaneTheme } from '../../../shared/types'
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
	const [isEditing, setIsEditing] = useState(false)
	const [editValue, setEditValue] = useState(config.label)
	const [showContext, setShowContext] = useState(false)
	const contextRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)

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

	const handleLabelSubmit = useCallback(() => {
		const trimmed = editValue.trim()
		if (trimmed && trimmed !== config.label) {
			onUpdateConfig(paneId, { label: trimmed })
		}
		setIsEditing(false)
	}, [editValue, config.label, paneId, onUpdateConfig])

	const handleContextMenu = useCallback((e: React.MouseEvent) => {
		e.preventDefault()
		setShowContext(true)
	}, [])

	// Close context menu on click outside
	useEffect(() => {
		if (!showContext) return
		const handler = (e: MouseEvent) => {
			if (contextRef.current && !contextRef.current.contains(e.target as Node)) {
				setShowContext(false)
			}
		}
		document.addEventListener('mousedown', handler)
		return () => document.removeEventListener('mousedown', handler)
	}, [showContext])

	// Focus input when editing
	useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus()
			inputRef.current.select()
		}
	}, [isEditing])

	const shortCwd = config.cwd.replace(/^\/Users\/[^/]+/, '~')

	return (
		<div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
			{/* Pane header */}
			<div
				onContextMenu={handleContextMenu}
				style={{
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
				}}
			>
				{/* Label */}
				{isEditing ? (
					<input
						ref={inputRef}
						value={editValue}
						onChange={(e) => setEditValue(e.target.value)}
						onBlur={handleLabelSubmit}
						onKeyDown={(e) => {
							if (e.key === 'Enter') handleLabelSubmit()
							if (e.key === 'Escape') setIsEditing(false)
						}}
						style={{
							background: 'var(--bg-secondary)',
							border: '1px solid var(--accent)',
							borderRadius: 'var(--radius-sm)',
							color: 'var(--text-primary)',
							fontSize: 11,
							padding: '1px 4px',
							outline: 'none',
							width: 80,
						}}
					/>
				) : (
					<span
						onDoubleClick={() => {
							setEditValue(config.label)
							setIsEditing(true)
						}}
						style={{ color: 'var(--text-primary)', fontWeight: 500, cursor: 'default' }}
					>
						{config.label}
					</span>
				)}

				{/* CWD */}
				<span
					style={{
						color: 'var(--text-dim)',
						flex: 1,
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
					}}
				>
					{shortCwd}
				</span>

				{/* Split buttons */}
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

				{/* Context menu */}
				{showContext && (
					<div ref={contextRef} style={contextMenuStyle}>
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
						<div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
						<button
							type="button"
							style={contextItemStyle}
							onClick={() => {
								setEditValue(config.label)
								setIsEditing(true)
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

			{/* Terminal */}
			<div style={{ flex: 1, overflow: 'hidden' }}>
				<TerminalView paneId={paneId} theme={workspaceTheme} themeOverride={config.themeOverride} />
			</div>
		</div>
	)
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

const contextMenuStyle: React.CSSProperties = {
	position: 'absolute',
	top: 'var(--pane-header-height)',
	right: 4,
	background: 'var(--bg-secondary)',
	border: '1px solid var(--border)',
	borderRadius: 'var(--radius)',
	padding: 4,
	zIndex: 100,
	minWidth: 160,
	boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
}

const contextItemStyle: React.CSSProperties = {
	display: 'block',
	width: '100%',
	textAlign: 'left',
	background: 'none',
	border: 'none',
	color: 'var(--text-primary)',
	padding: '6px 12px',
	fontSize: 12,
	cursor: 'pointer',
	borderRadius: 'var(--radius-sm)',
}
