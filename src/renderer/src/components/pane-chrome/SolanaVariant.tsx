import { registerVariant } from '.'
import type { PaneVariant, ScrollButtonProps, StatusBarProps } from './types'

const FOCUS_VIS = 'focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none'

const FOLDER_ICON = (
	<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="w-3 h-3 shrink-0">
		<path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2c-.33-.44-.85-.7-1.4-.7Z" />
	</svg>
)

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
	const glowColor = theme.glow ?? theme.accent
	return (
		<div
			className="flex items-center gap-2 px-3 text-[11px] font-medium shrink-0 select-none transition-all duration-200"
			style={{
				height: 30,
				color: theme.foreground,
				borderBottom: '2px solid transparent',
				borderImage: isFocused
					? `linear-gradient(90deg, ${theme.accent}, ${glowColor}) 1`
					: `linear-gradient(90deg, ${theme.accent}33, ${glowColor}33) 1`,
			}}
		>
			{isEditing ? (
				<input
					{...editInputProps}
					className="bg-transparent border rounded-sm text-[11px] py-px px-1 outline-none w-20"
					style={{ borderColor: theme.accent, color: theme.foreground }}
				/>
			) : (
				<span onDoubleClick={onDoubleClickLabel} className="cursor-default shrink-0 font-semibold">
					{label}
				</span>
			)}

			<span className="opacity-30">·</span>

			<span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap opacity-60 flex items-center gap-1">
				<span style={{ color: theme.accent }}>{FOLDER_ICON}</span>
				{cwd}
			</span>

			{branch && (
				<output
					aria-label={`Git branch: ${branch}`}
					className="shrink-0 max-w-[140px] text-[10px] font-medium px-2 py-px rounded-full overflow-hidden text-ellipsis whitespace-nowrap"
					title={branch}
					style={{
						background: `linear-gradient(135deg, ${theme.accent}33, ${glowColor}33)`,
						color: theme.foreground,
						border: `1px solid ${theme.accent}44`,
					}}
				>
					{branch}
				</output>
			)}

			<span className="opacity-30">·</span>

			{snippetDropdown}

			<button
				type="button"
				onClick={onSplitVertical}
				title="Split vertical"
				aria-label="Split pane vertically"
				className={`bg-transparent border-none cursor-pointer text-[11px] px-0.5 leading-none opacity-50 hover:opacity-100 transition-opacity ${FOCUS_VIS}`}
				style={{ color: theme.accent }}
			>
				┃
			</button>
			<button
				type="button"
				onClick={onSplitHorizontal}
				title="Split horizontal"
				aria-label="Split pane horizontally"
				className={`bg-transparent border-none cursor-pointer text-[11px] px-0.5 leading-none opacity-50 hover:opacity-100 transition-opacity ${FOCUS_VIS}`}
				style={{ color: theme.accent }}
			>
				━
			</button>
			{canClose && (
				<button
					type="button"
					onClick={onClose}
					title="Close pane"
					aria-label="Close pane"
					className={`bg-transparent border-none cursor-pointer text-[11px] px-0.5 leading-none opacity-50 hover:opacity-100 transition-opacity ${FOCUS_VIS}`}
					style={{ color: theme.accent }}
				>
					✕
				</button>
			)}
		</div>
	)
}

function ScrollButton({ onClick, theme }: ScrollButtonProps) {
	const glowColor = theme.glow ?? theme.accent
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label="Scroll to bottom"
			className={`absolute bottom-3 left-1/4 right-1/4 z-10 h-8 rounded-full flex items-center justify-center text-xs cursor-pointer hover:brightness-110 ${FOCUS_VIS}`}
			style={{
				backgroundColor: `${theme.background}dd`,
				color: theme.foreground,
				border: `1px solid ${theme.accent}66`,
				background: `linear-gradient(135deg, ${theme.accent}11, ${glowColor}11), ${theme.background}dd`,
				boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
			}}
		>
			↓ Scroll to bottom
		</button>
	)
}

const SolanaVariant: PaneVariant = { StatusBar, ScrollButton }
registerVariant('Solana', SolanaVariant)
export { SolanaVariant }
