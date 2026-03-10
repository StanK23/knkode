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
	const glowColor = theme.glow ?? theme.accent
	return (
		<div
			className="flex flex-col px-3 shrink-0 select-none transition-all duration-300"
			style={{
				borderBottom: '3px solid transparent',
				borderImage: isFocused
					? `linear-gradient(90deg, ${theme.accent}, ${glowColor}, ${theme.accent}) 1`
					: `linear-gradient(90deg, ${theme.accent}44, ${glowColor}44, ${theme.accent}44) 1`,
			}}
		>
			{/* Row 1: label, cwd */}
			<div
				className="flex items-center gap-2 text-[11px] tracking-wider font-light pt-1"
				style={{ color: theme.foreground }}
			>
				{isEditing ? (
					<input
						{...editInputProps}
						className="bg-transparent border rounded-sm tracking-wider font-light text-[11px] py-px px-1 outline-none w-20"
						style={{ borderColor: theme.accent, color: theme.accent }}
					/>
				) : (
					<span
						onDoubleClick={onDoubleClickLabel}
						className="cursor-default shrink-0 font-medium"
						style={{ color: theme.accent }}
					>
						{label}
					</span>
				)}

				<span
					className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap opacity-60"
					style={{
						backgroundImage: `linear-gradient(90deg, ${theme.accent}, ${glowColor})`,
						WebkitBackgroundClip: 'text',
						WebkitTextFillColor: 'transparent',
					}}
				>
					{cwd}
				</span>
			</div>

			{/* Row 2: action buttons + snippet + git branch */}
			<div className="flex items-center gap-1.5 py-1">
				<button
					type="button"
					onClick={onSplitVertical}
					title={`Split vertical (${shortcuts.splitV})`}
					aria-label="Split pane vertically"
					className={`text-[9px] tracking-wider font-medium px-2 py-0.5 rounded-full cursor-pointer border-none hover:brightness-110 transition-all ${FOCUS_VIS}`}
					style={{
						background: `linear-gradient(135deg, ${theme.accent}44, ${glowColor}44)`,
						color: theme.foreground,
					}}
				>
					SPLIT ┃
				</button>
				<button
					type="button"
					onClick={onSplitHorizontal}
					title={`Split horizontal (${shortcuts.splitH})`}
					aria-label="Split pane horizontally"
					className={`text-[9px] tracking-wider font-medium px-2 py-0.5 rounded-full cursor-pointer border-none hover:brightness-110 transition-all ${FOCUS_VIS}`}
					style={{
						background: `linear-gradient(135deg, ${theme.accent}44, ${glowColor}44)`,
						color: theme.foreground,
					}}
				>
					SPLIT ━
				</button>
				{canClose && (
					<button
						type="button"
						onClick={onClose}
						title={`Close pane (${shortcuts.close})`}
						aria-label="Close pane"
						className={`text-[9px] tracking-wider font-medium px-2 py-0.5 rounded-full cursor-pointer border-none hover:brightness-110 transition-all ${FOCUS_VIS}`}
						style={{
							background: `linear-gradient(135deg, ${theme.accent}44, ${glowColor}44)`,
							color: theme.foreground,
						}}
					>
						CLOSE ✕
					</button>
				)}

				{snippetDropdown}

				<span className="flex-1" />

				{branch && (
					<output
						aria-label={`Git branch: ${branch}`}
						className="shrink-0 max-w-[200px] text-[10px] font-medium px-3 py-0.5 rounded-full overflow-hidden text-ellipsis whitespace-nowrap"
						title={branch}
						style={{
							background: `linear-gradient(135deg, ${theme.accent}, ${glowColor})`,
							color: theme.background,
							boxShadow: isFocused ? `0 0 8px ${glowColor}44` : 'none',
						}}
					>
						{branch}
					</output>
				)}
			</div>
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
			className={`absolute bottom-4 left-1/4 right-1/4 z-10 h-9 rounded-full flex items-center justify-center text-xs tracking-wider font-medium cursor-pointer hover:brightness-110 ${FOCUS_VIS}`}
			style={{
				background: `linear-gradient(135deg, ${theme.accent}cc, ${glowColor}cc)`,
				color: theme.background,
				boxShadow: `0 4px 16px ${glowColor}44`,
			}}
		>
			↓
		</button>
	)
}

const VaporwaveVariant: PaneVariant = { StatusBar, ScrollButton }
registerVariant('Vaporwave', VaporwaveVariant)
