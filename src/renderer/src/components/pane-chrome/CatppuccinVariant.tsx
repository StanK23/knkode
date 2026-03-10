import { registerVariant } from '.'
import { FOCUS_VIS, FolderIcon } from './shared'
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
			className="flex items-center gap-2 px-3 text-[11px] shrink-0 select-none transition-colors duration-200"
			style={{
				height: 30,
				color: theme.foreground,
				borderBottom: `1px solid ${isFocused ? theme.accent : `${theme.accent}33`}`,
			}}
		>
			{isEditing ? (
				<input
					{...editInputProps}
					className="bg-transparent border rounded-md text-[11px] py-px px-1 outline-none w-20"
					style={{ borderColor: theme.accent, color: theme.foreground }}
				/>
			) : (
				<span onDoubleClick={onDoubleClickLabel} className="cursor-default shrink-0">
					{label}
				</span>
			)}

			<span className="opacity-25">·</span>

			<span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap opacity-50 flex items-center gap-1 text-[10px]">
				<span style={{ color: theme.accent }}>
					<FolderIcon className="opacity-60" />
				</span>
				{cwd}
			</span>

			{branch && (
				<output
					aria-label={`Git branch: ${branch}`}
					className="min-w-0 text-[10px] px-2 py-px rounded-md overflow-hidden text-ellipsis whitespace-nowrap"
					title={branch}
					style={{
						backgroundColor: `${theme.accent}14`,
						color: theme.foreground,
					}}
				>
					{branch}
				</output>
			)}

			<span className="opacity-25">·</span>

			{snippetDropdown}

			<button
				type="button"
				onClick={onSplitVertical}
				title={`Split vertical (${shortcuts.splitV})`}
				aria-label="Split pane vertically"
				className={`bg-transparent border-none cursor-pointer text-[11px] px-0.5 leading-none opacity-40 hover:opacity-80 transition-opacity rounded-md ${FOCUS_VIS}`}
				style={{ color: theme.foreground }}
			>
				┃
			</button>
			<button
				type="button"
				onClick={onSplitHorizontal}
				title={`Split horizontal (${shortcuts.splitH})`}
				aria-label="Split pane horizontally"
				className={`bg-transparent border-none cursor-pointer text-[11px] px-0.5 leading-none opacity-40 hover:opacity-80 transition-opacity rounded-md ${FOCUS_VIS}`}
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
					className={`bg-transparent border-none cursor-pointer text-[11px] px-0.5 leading-none opacity-40 hover:opacity-80 transition-opacity rounded-md ${FOCUS_VIS}`}
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
			className={`absolute bottom-3 left-1/4 right-1/4 z-10 h-8 rounded-xl flex items-center justify-center text-xs cursor-pointer hover:brightness-110 ${FOCUS_VIS}`}
			style={{
				backgroundColor: `${theme.accent}22`,
				color: theme.foreground,
				boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
			}}
		>
			↓ bottom
		</button>
	)
}

const CatppuccinVariant: PaneVariant = { StatusBar, ScrollButton }
registerVariant('Catppuccin', CatppuccinVariant)
