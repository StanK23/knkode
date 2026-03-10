import { registerVariant } from '.'
import { FOCUS_VIS } from './shared'
import type { PaneVariant, ScrollButtonProps, StatusBarProps } from './types'

function StatusBar({
	label,
	cwd,
	branch,
	pr,
	onOpenExternal,
	isFocused,
	canClose,
	theme,
	onSplitVertical,
	onSplitHorizontal,
	onClose,
	onDoubleClickLabel,
	isEditing,
	editInputProps,
	SnippetTrigger,
	shortcuts,
}: StatusBarProps) {
	return (
		<div
			className="flex items-center gap-2 px-3 text-[11px] font-medium shrink-0 select-none transition-colors duration-200"
			style={{
				height: 28,
				color: theme.foreground,
				borderBottom: `1px solid ${isFocused ? theme.accent : `${theme.accent}33`}`,
			}}
		>
			{isEditing ? (
				<input
					{...editInputProps}
					className="bg-transparent border text-[11px] py-px px-1 outline-none w-20"
					style={{ borderColor: theme.accent, color: theme.foreground, borderRadius: 2 }}
				/>
			) : (
				<span onDoubleClick={onDoubleClickLabel} className="cursor-default shrink-0 font-semibold">
					{label}
				</span>
			)}

			<span className="opacity-30">—</span>

			<span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap opacity-50 text-[10px]">
				<span style={{ color: theme.accent }}>▸</span> {cwd}
			</span>

			{branch && (
				<output
					aria-label={`Git branch: ${branch}`}
					className="min-w-0 text-[10px] font-medium px-2 py-px overflow-hidden text-ellipsis whitespace-nowrap"
					title={branch}
					style={{
						backgroundColor: `${theme.accent}18`,
						color: theme.foreground,
						borderRadius: 2,
					}}
				>
					{branch}
				</output>
			)}

			{pr && (
				<button
					type="button"
					onClick={() => onOpenExternal(pr.url)}
					title={pr.title}
					aria-label={`Open PR #${pr.number}`}
					className={`text-[10px] font-medium px-2 py-px cursor-pointer border-none hover:brightness-110 transition-opacity ${FOCUS_VIS}`}
					style={{
						backgroundColor: `${theme.accent}18`,
						color: theme.foreground,
						borderRadius: 2,
					}}
				>
					#{pr.number}
				</button>
			)}

			<span className="opacity-30">—</span>

			<SnippetTrigger
				className={`bg-transparent border-none cursor-pointer text-[11px] px-0.5 leading-none opacity-50 hover:opacity-100 transition-opacity ${FOCUS_VIS}`}
				style={{ color: theme.accent }}
			>
				{'>_'}
			</SnippetTrigger>

			<button
				type="button"
				onClick={onSplitVertical}
				title={`Split vertical (${shortcuts.splitV})`}
				aria-label="Split pane vertically"
				className={`bg-transparent border-none cursor-pointer text-[11px] px-0.5 leading-none opacity-50 hover:opacity-100 transition-opacity ${FOCUS_VIS}`}
				style={{ color: theme.accent }}
			>
				┃
			</button>
			<button
				type="button"
				onClick={onSplitHorizontal}
				title={`Split horizontal (${shortcuts.splitH})`}
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
					title={`Close pane (${shortcuts.close})`}
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
			className={`absolute bottom-3 left-3 right-3 z-10 h-7 flex items-center justify-center text-[11px] cursor-pointer hover:brightness-110 ${FOCUS_VIS}`}
			style={{
				backgroundColor: `${theme.background}dd`,
				color: theme.foreground,
				border: `1px solid ${theme.accent}33`,
				borderRadius: 2,
				borderLeft: `3px solid ${theme.accent}`,
			}}
		>
			↓ bottom
		</button>
	)
}

const GruvboxVariant: PaneVariant = { StatusBar, ScrollButton }
registerVariant('Gruvbox', GruvboxVariant)
