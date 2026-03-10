import { registerVariant } from '.'
import { FOCUS_VIS } from './shared'
import type { PaneVariant, ScrollButtonProps, StatusBarProps } from './types'

function StatusBar({
	label,
	cwd,
	branch,
	isFocused,
	canClose,
	theme,
	onSplitVertical,
	onSplitHorizontal,
	onClose,
	onDoubleClickLabel,
	isEditing,
	editInputProps,
	snippetDropdown,
	shortcuts,
}: StatusBarProps) {
	return (
		<div
			className="flex items-center gap-3 px-3 text-[11px] tracking-wide shrink-0 select-none transition-colors duration-200"
			style={{
				height: 28,
				color: theme.foreground,
				borderBottom: `1px solid ${isFocused ? `${theme.accent}55` : `${theme.foreground}15`}`,
			}}
		>
			{isEditing ? (
				<input
					{...editInputProps}
					className="bg-transparent border tracking-wide text-[11px] py-px px-1 outline-none w-20"
					style={{ borderColor: theme.accent, color: theme.foreground }}
				/>
			) : (
				<span onDoubleClick={onDoubleClickLabel} className="cursor-default shrink-0">
					{label}
				</span>
			)}

			<span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap opacity-40 text-[10px]">
				{cwd}
			</span>

			{branch && (
				<output
					aria-label={`Git branch: ${branch}`}
					className="min-w-0 text-[10px] px-2 py-px rounded-sm overflow-hidden text-ellipsis whitespace-nowrap"
					title={branch}
					style={{
						backgroundColor: `${theme.accent}0d`,
						color: theme.accent,
					}}
				>
					{branch}
				</output>
			)}

			{snippetDropdown}

			<button
				type="button"
				onClick={onSplitVertical}
				title={`Split vertical (${shortcuts.splitV})`}
				aria-label="Split pane vertically"
				className={`bg-transparent border-none cursor-pointer text-[11px] px-0.5 leading-none opacity-30 hover:opacity-70 transition-opacity ${FOCUS_VIS}`}
				style={{ color: theme.foreground }}
			>
				┃
			</button>
			<button
				type="button"
				onClick={onSplitHorizontal}
				title={`Split horizontal (${shortcuts.splitH})`}
				aria-label="Split pane horizontally"
				className={`bg-transparent border-none cursor-pointer text-[11px] px-0.5 leading-none opacity-30 hover:opacity-70 transition-opacity ${FOCUS_VIS}`}
				style={{ color: theme.foreground }}
			>
				━
			</button>
			{canClose && (
				<button
					type="button"
					onClick={onClose}
					title={`Close pane (${shortcuts.close})`}
					aria-label="Close pane"
					className={`bg-transparent border-none cursor-pointer text-[11px] px-0.5 leading-none opacity-30 hover:opacity-70 transition-opacity ${FOCUS_VIS}`}
					style={{ color: theme.foreground }}
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
			className={`absolute bottom-3 left-1/3 right-1/3 z-10 h-7 flex items-center justify-center text-[10px] tracking-wide cursor-pointer opacity-60 hover:opacity-100 transition-opacity ${FOCUS_VIS}`}
			style={{
				color: theme.foreground,
				backgroundColor: 'transparent',
				border: 'none',
			}}
		>
			↓ scroll to bottom
		</button>
	)
}

const NordVariant: PaneVariant = { StatusBar, ScrollButton }
registerVariant('Nord', NordVariant)
