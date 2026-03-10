import type { PaneVariant, ScrollButtonProps, StatusBarProps } from './types'

const GIT_ICON = (
	<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="w-2.5 h-2.5 shrink-0">
		<path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.5 2.5 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Z" />
	</svg>
)

const FOCUS_VIS = 'focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none'

function StatusBar({
	label,
	cwd,
	branch,
	isFocused,
	canClose,
	onSplitVertical,
	onSplitHorizontal,
	onClose,
	onDoubleClickLabel,
	isEditing,
	editInputProps,
	snippetDropdown,
}: StatusBarProps) {
	return (
		<div
			className={`flex items-center gap-2 px-2 text-[11px] shrink-0 select-none transition-colors duration-200 ${
				isFocused ? 'bg-elevated border-b border-accent' : 'bg-sunken border-b border-edge'
			}`}
			style={{ height: 30 }}
		>
			{isEditing ? (
				<input
					{...editInputProps}
					className="bg-elevated border border-accent rounded-sm text-content text-[11px] py-px px-1 outline-none w-20"
				/>
			) : (
				<span
					onDoubleClick={onDoubleClickLabel}
					className="text-content font-medium cursor-default"
				>
					{label}
				</span>
			)}

			<span className="text-content-muted text-[10px]">·</span>

			<span className="text-content-muted flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[10px]">
				📁 {cwd}
			</span>

			{branch && (
				<output
					aria-label={`Git branch: ${branch}`}
					className="flex items-center gap-1 text-accent text-[10px] font-medium shrink-0 max-w-[140px]"
					title={branch}
				>
					{GIT_ICON}
					<span className="overflow-hidden text-ellipsis whitespace-nowrap">{branch}</span>
				</output>
			)}

			{snippetDropdown}

			<span className="text-content-muted text-[10px]">·</span>

			<button
				type="button"
				onClick={onSplitVertical}
				title="Split vertical"
				aria-label="Split pane vertically"
				className={`bg-transparent border-none text-content-muted cursor-pointer px-0.5 text-[11px] leading-none hover:text-content ${FOCUS_VIS}`}
			>
				┃
			</button>
			<button
				type="button"
				onClick={onSplitHorizontal}
				title="Split horizontal"
				aria-label="Split pane horizontally"
				className={`bg-transparent border-none text-content-muted cursor-pointer px-0.5 text-[11px] leading-none hover:text-content ${FOCUS_VIS}`}
			>
				━
			</button>
			{canClose && (
				<button
					type="button"
					onClick={onClose}
					title="Close pane"
					aria-label="Close pane"
					className={`bg-transparent border-none text-danger cursor-pointer px-0.5 text-[11px] leading-none hover:brightness-125 ${FOCUS_VIS}`}
				>
					✕
				</button>
			)}
		</div>
	)
}

function ScrollButton({ onClick, theme }: ScrollButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label="Scroll to bottom"
			className={`absolute bottom-3 left-3 right-3 z-10 h-9 rounded-md flex items-center justify-center gap-1.5 text-xs cursor-pointer whitespace-nowrap overflow-hidden hover:brightness-110 ${FOCUS_VIS}`}
			style={{
				backgroundColor: `${theme.background}e6`,
				color: theme.foreground,
				border: `1px solid ${theme.foreground}22`,
				boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
			}}
		>
			↓ Scroll to bottom
		</button>
	)
}

export const DefaultVariant: PaneVariant = { StatusBar, ScrollButton }
