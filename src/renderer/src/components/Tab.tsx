import { useCallback, useRef, useState } from 'react'
import type { Workspace } from '../../../shared/types'
import { useClickOutside } from '../hooks/useClickOutside'
import { useInlineEdit } from '../hooks/useInlineEdit'
import {
	colorDotStyle,
	contextItemStyle,
	contextMenuStyle,
	contextSeparatorStyle,
} from '../styles/shared'

interface TabProps {
	workspace: Workspace
	isActive: boolean
	index: number
	onActivate: (id: string) => void
	onClose: (id: string) => void
	onRename: (id: string, name: string) => void
	onDragStart: (index: number) => void
	onDragOver: (e: React.DragEvent, index: number) => void
	onDrop: (index: number) => void
	onDragEnd: () => void
	isDragOver: boolean
	isDragging: boolean
}

export function Tab({
	workspace,
	isActive,
	index,
	onActivate,
	onClose,
	onRename,
	onDragStart,
	onDragOver,
	onDrop,
	onDragEnd,
	isDragOver,
	isDragging,
}: TabProps) {
	const [showContext, setShowContext] = useState(false)
	const contextRef = useRef<HTMLDivElement>(null)

	const { isEditing, inputProps, startEditing } = useInlineEdit(workspace.name, (name) =>
		onRename(workspace.id, name),
	)

	const handleContextMenu = useCallback((e: React.MouseEvent) => {
		e.preventDefault()
		setShowContext(true)
	}, [])

	useClickOutside(contextRef, () => setShowContext(false), showContext)

	return (
		<div
			role="tab"
			tabIndex={0}
			aria-selected={isActive}
			aria-roledescription="draggable tab"
			draggable={!isEditing}
			onClick={() => onActivate(workspace.id)}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault()
					onActivate(workspace.id)
				}
			}}
			onContextMenu={handleContextMenu}
			onDragStart={(e) => {
				e.dataTransfer.effectAllowed = 'move'
				e.dataTransfer.setData('text/plain', workspace.id)
				onDragStart(index)
			}}
			onDragOver={(e) => onDragOver(e, index)}
			onDrop={() => onDrop(index)}
			onDragEnd={onDragEnd}
			style={{
				...tabStyle,
				background: isActive ? 'var(--bg-tab-active)' : 'var(--bg-tab)',
				borderBottom: isActive ? `2px solid ${workspace.color}` : '2px solid transparent',
				boxShadow: isDragOver ? 'inset 2px 0 0 var(--accent)' : 'none',
				opacity: isDragging ? 0.4 : 1,
			}}
			onMouseEnter={(e) => {
				if (!isActive) e.currentTarget.style.background = 'var(--bg-tab-hover)'
			}}
			onMouseLeave={(e) => {
				if (!isActive) e.currentTarget.style.background = 'var(--bg-tab)'
			}}
		>
			<span aria-hidden="true" style={{ ...colorDotStyle, background: workspace.color }} />

			{isEditing ? (
				<input {...inputProps} onClick={(e) => e.stopPropagation()} style={editInputStyle} />
			) : (
				<span style={nameStyle}>{workspace.name}</span>
			)}

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

			{showContext && (
				<div ref={contextRef} style={{ ...contextMenuStyle, top: 'var(--tab-height)', left: 0 }}>
					<button
						type="button"
						style={contextItemStyle}
						onClick={(e) => {
							e.stopPropagation()
							startEditing()
							setShowContext(false)
						}}
					>
						Rename
					</button>
					<div style={contextSeparatorStyle} />
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

const editInputStyle: React.CSSProperties = {
	background: 'var(--bg-secondary)',
	border: '1px solid var(--accent)',
	borderRadius: 'var(--radius-sm)',
	color: 'var(--text-primary)',
	fontSize: 12,
	padding: '1px 4px',
	outline: 'none',
	width: 80,
}

const nameStyle: React.CSSProperties = {
	color: 'var(--text-primary)',
	fontSize: 12,
	whiteSpace: 'nowrap',
	overflow: 'hidden',
	textOverflow: 'ellipsis',
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
