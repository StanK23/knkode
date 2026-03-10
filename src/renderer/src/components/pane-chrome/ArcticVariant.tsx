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
			className="flex items-center gap-2 px-3 text-[10px] tracking-wider font-light shrink-0 select-none transition-colors duration-200"
			style={{
				height: 28,
				color: theme.foreground,
				borderBottom: `1px solid ${isFocused ? theme.accent : `${theme.accent}44`}`,
			}}
		>
			{isEditing ? (
				<input
					{...editInputProps}
					className="bg-transparent border tracking-wider font-light text-[10px] py-px px-1 outline-none w-20"
					style={{ borderColor: theme.accent, color: theme.foreground }}
				/>
			) : (
				<span onDoubleClick={onDoubleClickLabel} className="cursor-default shrink-0 font-medium">
					{label}
				</span>
			)}

			<span className="opacity-20" style={{ color: theme.accent }}>
				│
			</span>

			<span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap opacity-50">
				<span style={{ color: theme.accent }}>◆</span> {cwd}
			</span>

			{branch && (
				<output
					aria-label={`Git branch: ${branch}`}
					className="min-w-0 text-[10px] tracking-wider font-light px-2 py-px overflow-hidden text-ellipsis whitespace-nowrap"
					title={branch}
					style={{
						border: `1px solid ${theme.accent}44`,
						color: theme.foreground,
						borderRadius: 0,
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
				title={`Split vertical (${shortcuts.splitV})`}
				aria-label="Split pane vertically"
				className={`bg-transparent border-none cursor-pointer px-0.5 leading-none opacity-40 hover:opacity-100 transition-opacity ${FOCUS_VIS}`}
				style={{ color: theme.accent }}
			>
				┃
			</button>
			<button
				type="button"
				onClick={onSplitHorizontal}
				title={`Split horizontal (${shortcuts.splitH})`}
				aria-label="Split pane horizontally"
				className={`bg-transparent border-none cursor-pointer px-0.5 leading-none opacity-40 hover:opacity-100 transition-opacity ${FOCUS_VIS}`}
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
					className={`bg-transparent border-none cursor-pointer px-0.5 leading-none opacity-40 hover:opacity-100 transition-opacity ${FOCUS_VIS}`}
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
			className={`absolute bottom-3 left-3 right-3 z-10 h-7 flex items-center justify-center text-[10px] tracking-widest font-light uppercase cursor-pointer hover:brightness-110 ${FOCUS_VIS}`}
			style={{
				backgroundColor: `${theme.background}dd`,
				color: theme.accent,
				border: `1px solid ${theme.accent}44`,
				borderRadius: 0,
			}}
		>
			↓ BOTTOM
		</button>
	)
}

const ArcticVariant: PaneVariant = { StatusBar, ScrollButton }
registerVariant('Arctic', ArcticVariant)
