import { useCallback, useRef, useState } from 'react'
import type { Workspace } from '../../../shared/types'
import { useClickOutside } from '../hooks/useClickOutside'
import { useInlineEdit } from '../hooks/useInlineEdit'

interface TabProps {
	workspace: Workspace
	isActive: boolean
	index: number
	onActivate: (id: string) => void
	onClose: (id: string) => void
	onRename: (id: string, name: string) => void
	onChangeColor: (id: string, color: string) => void
	onDuplicate: (id: string) => void
	onDragStart: (index: number) => void
	onDragOver: (e: React.DragEvent, index: number) => void
	onDrop: (index: number) => void
	onDragEnd: () => void
	isDragOver: boolean
	isDragging: boolean
	colors: readonly string[]
}

export function Tab({
	workspace,
	isActive,
	index,
	onActivate,
	onClose,
	onRename,
	onChangeColor,
	onDuplicate,
	onDragStart,
	onDragOver,
	onDrop,
	onDragEnd,
	isDragOver,
	isDragging,
	colors,
}: TabProps) {
	const [showContext, setShowContext] = useState(false)
	const [showColorPicker, setShowColorPicker] = useState(false)
	const contextRef = useRef<HTMLDivElement>(null)

	const { isEditing, inputProps, startEditing } = useInlineEdit(workspace.name, (name) =>
		onRename(workspace.id, name),
	)

	const handleContextMenu = useCallback((e: React.MouseEvent) => {
		e.preventDefault()
		setShowContext(true)
	}, [])

	const closeContext = useCallback(() => {
		setShowContext(false)
		setShowColorPicker(false)
	}, [])

	useClickOutside(contextRef, closeContext, showContext)

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
			className={`flex items-center gap-1.5 px-3 h-tab cursor-pointer rounded-t-md select-none relative min-w-20 max-w-[180px] transition-colors duration-300 ${
				isActive ? 'bg-overlay-active' : 'bg-overlay hover:bg-overlay-hover'
			} ${isDragOver ? 'shadow-[inset_2px_0_0_var(--color-accent)]' : ''} ${
				isDragging ? 'opacity-40' : ''
			}`}
			style={{
				borderBottom: isActive ? `2px solid ${workspace.color}` : '2px solid transparent',
			}}
		>
			<span
				aria-hidden="true"
				className="w-2 h-2 rounded-full shrink-0"
				style={{ background: workspace.color }}
			/>

			{isEditing ? (
				<input
					{...inputProps}
					onClick={(e) => e.stopPropagation()}
					className="bg-elevated border border-accent rounded-sm text-content text-xs py-px px-1 outline-none w-20"
				/>
			) : (
				<span className="text-content text-xs whitespace-nowrap overflow-hidden text-ellipsis">
					{workspace.name}
				</span>
			)}

			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation()
					onClose(workspace.id)
				}}
				aria-label={`Close ${workspace.name}`}
				className="bg-transparent border-none text-content-muted cursor-pointer px-0.5 text-[10px] leading-none ml-auto shrink-0 hover:text-content focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
			>
				✕
			</button>

			{showContext && (
				<div
					ref={contextRef}
					className="ctx-menu top-tab left-0"
					onKeyDown={(e) => {
						if (e.key === 'Escape') closeContext()
					}}
				>
					<button
						type="button"
						className="ctx-item"
						onClick={(e) => {
							e.stopPropagation()
							startEditing()
							closeContext()
						}}
					>
						Rename
					</button>
					<button
						type="button"
						className="ctx-item"
						onClick={(e) => {
							e.stopPropagation()
							setShowColorPicker((v) => !v)
						}}
					>
						Change Color
					</button>
					{showColorPicker && (
						<div className="flex flex-wrap gap-1 px-3 py-1 pb-2">
							{colors.map((c) => (
								<button
									type="button"
									key={c}
									aria-label={`Color ${c}`}
									className={`size-4.5 rounded-full border-none cursor-pointer p-0 ${
										c === workspace.color ? 'outline-2 outline-content outline-offset-1' : ''
									}`}
									style={{ background: c }}
									onClick={(e) => {
										e.stopPropagation()
										onChangeColor(workspace.id, c)
										closeContext()
									}}
								/>
							))}
						</div>
					)}
					<button
						type="button"
						className="ctx-item"
						onClick={(e) => {
							e.stopPropagation()
							onDuplicate(workspace.id)
							closeContext()
						}}
					>
						Duplicate
					</button>
					<div className="ctx-separator" />
					<button
						type="button"
						className="ctx-item text-danger"
						onClick={(e) => {
							e.stopPropagation()
							onClose(workspace.id)
							closeContext()
						}}
					>
						Close Tab
					</button>
				</div>
			)}
		</div>
	)
}
