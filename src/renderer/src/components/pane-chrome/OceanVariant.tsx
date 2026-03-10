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
			className="flex items-center gap-2 px-3 text-[11px] font-light shrink-0 select-none transition-all duration-300"
			style={{
				height: 28,
				color: theme.foreground,
				boxShadow: isFocused ? `0 2px 8px ${glowColor}22` : '0 1px 3px rgba(0,0,0,0.2)',
			}}
		>
			{isEditing ? (
				<input
					{...editInputProps}
					className="bg-transparent border rounded-sm font-light text-[11px] py-px px-1 outline-none w-20"
					style={{ borderColor: theme.accent, color: theme.foreground }}
				/>
			) : (
				<span onDoubleClick={onDoubleClickLabel} className="cursor-default shrink-0 font-medium">
					{label}
				</span>
			)}

			<span
				className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap opacity-50"
				style={{
					maskImage: 'linear-gradient(90deg, black 80%, transparent)',
					WebkitMaskImage: 'linear-gradient(90deg, black 80%, transparent)',
				}}
			>
				~ {cwd}
			</span>

			{branch && (
				<output
					aria-label={`Git branch: ${branch}`}
					className="shrink-0 max-w-[200px] text-[10px] px-2 py-px rounded-md overflow-hidden text-ellipsis whitespace-nowrap"
					title={branch}
					style={{
						backgroundColor: `${theme.accent}22`,
						color: theme.foreground,
					}}
				>
					{branch}
				</output>
			)}

			{snippetDropdown}

			<div className="flex items-center gap-0.5 opacity-0 hover:opacity-70 focus-within:opacity-70 transition-opacity duration-200">
				<button
					type="button"
					onClick={onSplitVertical}
					title={`Split vertical (${shortcuts.splitV})`}
					aria-label="Split pane vertically"
					className={`bg-transparent border-none cursor-pointer text-[11px] px-0.5 leading-none ${FOCUS_VIS}`}
					style={{ color: theme.accent }}
				>
					┃
				</button>
				<button
					type="button"
					onClick={onSplitHorizontal}
					title={`Split horizontal (${shortcuts.splitH})`}
					aria-label="Split pane horizontally"
					className={`bg-transparent border-none cursor-pointer text-[11px] px-0.5 leading-none ${FOCUS_VIS}`}
					style={{ color: theme.accent }}
				>
					━
				</button>
				{canClose && (
					<button
						type="button"
						onClick={onClose}
						title={`Close pane (${shortcuts.close})`}
						aria-label="Close pane"
						className={`bg-transparent border-none cursor-pointer text-[11px] px-0.5 leading-none ${FOCUS_VIS}`}
						style={{ color: theme.accent }}
					>
						✕
					</button>
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
			className={`absolute bottom-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center text-sm cursor-pointer hover:brightness-110 ${FOCUS_VIS}`}
			style={{
				backgroundColor: `${theme.accent}22`,
				color: theme.accent,
				boxShadow: `0 0 12px ${glowColor}33`,
				backdropFilter: 'blur(4px)',
			}}
		>
			↓
		</button>
	)
}

const OceanVariant: PaneVariant = { StatusBar, ScrollButton }
registerVariant('Ocean', OceanVariant)
export { OceanVariant }
