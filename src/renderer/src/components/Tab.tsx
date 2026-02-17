import { useCallback, useEffect, useRef, useState } from 'react'
import type { Workspace } from '../../../shared/types'

interface TabProps {
	workspace: Workspace
	isActive: boolean
	onActivate: (id: string) => void
	onClose: (id: string) => void
	onRename: (id: string, name: string) => void
}

export function Tab({
	workspace,
	isActive,
	onActivate,
	onClose,
	onRename,
}: TabProps) {
	const [isEditing, setIsEditing] = useState(false)
	const [editValue, setEditValue] = useState(workspace.name)
	const [showContext, setShowContext] = useState(false)
	const inputRef = useRef<HTMLInputElement>(null)
	const contextRef = useRef<HTMLDivElement>(null)

	const handleSubmit = useCallback(() => {
		const trimmed = editValue.trim()
		if (trimmed && trimmed !== workspace.name) {
			onRename(workspace.id, trimmed)
		}
		setIsEditing(false)
	}, [editValue, workspace.id, workspace.name, onRename])

	const handleContextMenu = useCallback((e: React.MouseEvent) => {
		e.preventDefault()
		setShowContext(true)
	}, [])

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

	useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus()
			inputRef.current.select()
		}
	}, [isEditing])

	return (
		<div
			role="tab"
			tabIndex={0}
			aria-selected={isActive}
			onClick={() => onActivate(workspace.id)}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault()
					onActivate(workspace.id)
				}
			}}
			onContextMenu={handleContextMenu}
			style={{
				...tabStyle,
				background: isActive ? 'var(--bg-tab-active)' : 'var(--bg-tab)',
				borderBottom: isActive ? `2px solid ${workspace.color}` : '2px solid transparent',
			}}
			onMouseEnter={(e) => {
				if (!isActive) e.currentTarget.style.background = 'var(--bg-tab-hover)'
			}}
			onMouseLeave={(e) => {
				if (!isActive) e.currentTarget.style.background = 'var(--bg-tab)'
			}}
		>
			{/* Color dot */}
			<span
				style={{
					width: 8,
					height: 8,
					borderRadius: '50%',
					background: workspace.color,
					flexShrink: 0,
				}}
			/>

			{/* Name */}
			{isEditing ? (
				<input
					ref={inputRef}
					value={editValue}
					onChange={(e) => setEditValue(e.target.value)}
					onBlur={handleSubmit}
					onKeyDown={(e) => {
						if (e.key === 'Enter') handleSubmit()
						if (e.key === 'Escape') setIsEditing(false)
					}}
					onClick={(e) => e.stopPropagation()}
					style={{
						background: 'var(--bg-secondary)',
						border: '1px solid var(--accent)',
						borderRadius: 'var(--radius-sm)',
						color: 'var(--text-primary)',
						fontSize: 12,
						padding: '1px 4px',
						outline: 'none',
						width: 80,
					}}
				/>
			) : (
				<span
					style={{
						color: 'var(--text-primary)',
						fontSize: 12,
						whiteSpace: 'nowrap',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
					}}
				>
					{workspace.name}
				</span>
			)}

			{/* Close button */}
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation()
					onClose(workspace.id)
				}}
				style={closeBtnStyle}
			>
				✕
			</button>

			{/* Context menu */}
			{showContext && (
				<div ref={contextRef} style={contextMenuStyle}>
					<button
						type="button"
						style={contextItemStyle}
						onClick={(e) => {
							e.stopPropagation()
							setEditValue(workspace.name)
							setIsEditing(true)
							setShowContext(false)
						}}
					>
						Rename
					</button>
					<div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
					<button
						type="button"
						style={{ ...contextItemStyle, color: 'var(--danger)' }}
						onClick={(e) => {
							e.stopPropagation()
							onClose(workspace.id)
							setShowContext(false)
						}}
					>
						Close Tab
					</button>
				</div>
			)}
		</div>
	)
}

const tabStyle: React.CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	gap: 6,
	padding: '0 12px',
	height: 'var(--tab-height)',
	cursor: 'pointer',
	borderRadius: 'var(--radius) var(--radius) 0 0',
	userSelect: 'none',
	position: 'relative',
	minWidth: 80,
	maxWidth: 180,
}

const closeBtnStyle: React.CSSProperties = {
	background: 'none',
	border: 'none',
	color: 'var(--text-dim)',
	cursor: 'pointer',
	padding: '0 2px',
	fontSize: 10,
	lineHeight: 1,
	marginLeft: 'auto',
	flexShrink: 0,
}

const contextMenuStyle: React.CSSProperties = {
	position: 'absolute',
	top: 'var(--tab-height)',
	left: 0,
	background: 'var(--bg-secondary)',
	border: '1px solid var(--border)',
	borderRadius: 'var(--radius)',
	padding: 4,
	zIndex: 100,
	minWidth: 140,
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
