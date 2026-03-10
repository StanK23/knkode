import { registerVariant } from '.'
import { FOCUS_VIS, FolderIcon, PrBadge } from './shared'
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
				height: 30,
				color: theme.foreground,
				borderBottom: `1px solid ${isFocused ? theme.accent : `${theme.accent}33`}`,
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

			<span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap opacity-50 flex items-center gap-1 text-[10px]">
				<span style={{ color: theme.accent }}>
					<FolderIcon />
				</span>
				{cwd}
			</span>

			{branch && (
				<output
					aria-label={`Git branch: ${branch}`}
					className="min-w-0 text-[10px] font-medium px-2 py-px rounded-md overflow-hidden text-ellipsis whitespace-nowrap"
					title={branch}
					style={{
						backgroundColor: `${theme.accent}18`,
						color: theme.foreground,
					}}
				>
					{branch}
				</output>
			)}

			{pr && (
				<PrBadge
					pr={pr}
					onOpenExternal={onOpenExternal}
					className="text-[10px] font-medium px-2 py-px rounded-md hover:brightness-110 transition-all"
					style={{
						backgroundColor: `${theme.accent}18`,
						color: theme.foreground,
					}}
				/>
			)}

			<span className="opacity-20" style={{ color: theme.accent }}>
				│
			</span>

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
			className={`absolute bottom-3 left-1/4 right-1/4 z-10 h-8 rounded-full flex items-center justify-center text-xs cursor-pointer hover:brightness-110 ${FOCUS_VIS}`}
			style={{
				backgroundColor: `${theme.background}dd`,
				color: theme.foreground,
				border: `1px solid ${theme.accent}44`,
				boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
			}}
		>
			↓ bottom
		</button>
	)
}

const DraculaVariant: PaneVariant = { StatusBar, ScrollButton }
registerVariant('Dracula', DraculaVariant)
