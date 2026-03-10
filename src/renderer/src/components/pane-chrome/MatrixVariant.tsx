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
	const fg = isFocused ? theme.accent : theme.foreground
	return (
		<div
			className="flex items-center gap-0 px-2 text-[10px] font-mono uppercase shrink-0 select-none transition-colors duration-200"
			style={{
				height: 24,
				color: fg,
				borderBottom: `1px solid ${theme.accent}66`,
				textShadow: isFocused ? `0 0 6px ${theme.glow ?? theme.accent}44` : 'none',
			}}
		>
			{isEditing ? (
				<input
					{...editInputProps}
					className="bg-transparent border font-mono uppercase text-[10px] py-px px-1 outline-none w-20"
					style={{ borderColor: theme.accent, color: fg }}
				/>
			) : (
				<span onDoubleClick={onDoubleClickLabel} className="cursor-default shrink-0">
					{label}
				</span>
			)}

			<span className="mx-1 opacity-40">|</span>

			<span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap opacity-70">
				{'> '}
				{cwd}
			</span>

			{branch && (
				<output
					aria-label={`Git branch: ${branch}`}
					className="shrink-0 max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap opacity-80"
					title={branch}
				>
					<span className="mx-1 opacity-40">|</span>[{branch}]
				</output>
			)}

			<span className="mx-1 opacity-40">|</span>

			{snippetDropdown}

			<button
				type="button"
				onClick={onSplitVertical}
				title="Split vertical"
				aria-label="Split pane vertically"
				className={`bg-transparent border-none cursor-pointer px-0.5 leading-none opacity-60 hover:opacity-100 ${FOCUS_VIS}`}
				style={{ color: fg }}
			>
				┃
			</button>
			<button
				type="button"
				onClick={onSplitHorizontal}
				title="Split horizontal"
				aria-label="Split pane horizontally"
				className={`bg-transparent border-none cursor-pointer px-0.5 leading-none opacity-60 hover:opacity-100 ${FOCUS_VIS}`}
				style={{ color: fg }}
			>
				━
			</button>
			{canClose && (
				<button
					type="button"
					onClick={onClose}
					title="Close pane"
					aria-label="Close pane"
					className={`bg-transparent border-none cursor-pointer px-0.5 leading-none opacity-60 hover:opacity-100 ${FOCUS_VIS}`}
					style={{ color: fg }}
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
			className={`absolute bottom-2 left-2 right-2 z-10 h-7 flex items-center justify-center text-[10px] font-mono uppercase cursor-pointer tracking-widest hover:brightness-125 ${FOCUS_VIS}`}
			style={{
				backgroundColor: `${theme.background}dd`,
				color: theme.accent,
				border: `1px solid ${theme.accent}44`,
				textShadow: `0 0 8px ${theme.glow ?? theme.accent}66`,
			}}
		>
			[▼ SCROLL TO BOTTOM]
		</button>
	)
}

const MatrixVariant: PaneVariant = { StatusBar, ScrollButton }
registerVariant('Matrix', MatrixVariant)
export { MatrixVariant }
