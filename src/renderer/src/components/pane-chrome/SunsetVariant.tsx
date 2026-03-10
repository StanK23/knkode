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
}: StatusBarProps) {
	const glowColor = theme.glow ?? theme.accent
	return (
		<div
			className="flex items-center gap-2 px-3 text-[11px] font-medium shrink-0 select-none transition-all duration-200"
			style={{
				height: 30,
				color: theme.foreground,
				backgroundImage: isFocused
					? `linear-gradient(180deg, ${glowColor}11 0%, transparent 100%)`
					: 'none',
				boxShadow: isFocused ? `inset 0 1px 0 ${glowColor}33` : 'none',
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

			<span className="opacity-20" style={{ color: theme.accent }}>
				│
			</span>

			<span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap opacity-60">
				<span style={{ color: theme.accent }}>☀</span> {cwd}
			</span>

			{branch && (
				<output
					aria-label={`Git branch: ${branch}`}
					className="shrink-0 max-w-[140px] text-[10px] font-medium px-2 py-px rounded-md overflow-hidden text-ellipsis whitespace-nowrap"
					title={branch}
					style={{
						backgroundColor: `${theme.accent}22`,
						color: theme.accent,
					}}
				>
					{branch}
				</output>
			)}

			<span className="opacity-20" style={{ color: theme.accent }}>
				│
			</span>

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
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label="Scroll to bottom"
			className={`absolute bottom-3 left-1/4 right-1/4 z-10 h-8 rounded-full flex items-center justify-center text-xs cursor-pointer hover:brightness-110 ${FOCUS_VIS}`}
			style={{
				backgroundColor: `${theme.background}dd`,
				color: theme.accent,
				border: `1px solid ${theme.accent}44`,
				boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
			}}
		>
			↓
		</button>
	)
}

const SunsetVariant: PaneVariant = { StatusBar, ScrollButton }
registerVariant('Sunset', SunsetVariant)
export { SunsetVariant }
