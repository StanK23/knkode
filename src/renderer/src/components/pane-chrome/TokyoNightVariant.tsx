import { registerVariant } from '.'
import type { PaneVariant, ScrollButtonProps, StatusBarProps } from './types'

const FOCUS_VIS = 'focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none'

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
}: StatusBarProps) {
	return (
		<div
			className="flex items-center gap-2 px-3 text-[10px] font-light shrink-0 select-none transition-all duration-300"
			style={{
				height: 26,
				color: theme.foreground,
				borderBottom: `1px solid ${isFocused ? `${theme.accent}66` : `${theme.foreground}11`}`,
			}}
		>
			{isEditing ? (
				<input
					{...editInputProps}
					className="bg-transparent border font-light text-[10px] py-px px-1 outline-none w-20"
					style={{ borderColor: theme.accent, color: theme.foreground }}
				/>
			) : (
				<span onDoubleClick={onDoubleClickLabel} className="cursor-default shrink-0 font-medium">
					{label}
				</span>
			)}

			<span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap opacity-35 text-[10px]">
				{cwd}
			</span>

			{branch && (
				<output
					aria-label={`Git branch: ${branch}`}
					className="shrink-0 max-w-[140px] text-[10px] font-light overflow-hidden text-ellipsis whitespace-nowrap"
					title={branch}
					style={{ color: theme.accent }}
				>
					{branch}
				</output>
			)}

			{snippetDropdown}

			{/* Actions appear on hover only */}
			<div className="flex items-center gap-0.5 opacity-0 hover:opacity-60 transition-opacity duration-300">
				<button
					type="button"
					onClick={onSplitVertical}
					title="Split vertical"
					aria-label="Split pane vertically"
					className={`bg-transparent border-none cursor-pointer text-[10px] px-0.5 leading-none ${FOCUS_VIS}`}
					style={{ color: theme.foreground }}
				>
					┃
				</button>
				<button
					type="button"
					onClick={onSplitHorizontal}
					title="Split horizontal"
					aria-label="Split pane horizontally"
					className={`bg-transparent border-none cursor-pointer text-[10px] px-0.5 leading-none ${FOCUS_VIS}`}
					style={{ color: theme.foreground }}
				>
					━
				</button>
				{canClose && (
					<button
						type="button"
						onClick={onClose}
						title="Close pane"
						aria-label="Close pane"
						className={`bg-transparent border-none cursor-pointer text-[10px] px-0.5 leading-none ${FOCUS_VIS}`}
						style={{ color: theme.foreground }}
					>
						✕
					</button>
				)}
			</div>
		</div>
	)
}

function ScrollButton({ onClick, theme }: ScrollButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label="Scroll to bottom"
			className={`absolute bottom-3 right-3 z-10 w-6 h-6 flex items-center justify-center text-sm cursor-pointer hover:brightness-125 ${FOCUS_VIS}`}
			style={{
				color: theme.accent,
				backgroundColor: 'transparent',
				border: 'none',
			}}
		>
			↓
		</button>
	)
}

const TokyoNightVariant: PaneVariant = { StatusBar, ScrollButton }
registerVariant('Tokyo Night', TokyoNightVariant)
export { TokyoNightVariant }
