import { registerVariant } from '.'
import type { PaneVariant, ScrollButtonProps, StatusBarProps } from './types'

const FOCUS_VIS = 'focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none'

const FOLDER_ICON = (
	<svg
		viewBox="0 0 16 16"
		fill="currentColor"
		aria-hidden="true"
		className="w-3 h-3 shrink-0 opacity-50"
	>
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
	return (
		<div
			className="flex items-center gap-2 px-3 text-[11px] shrink-0 select-none transition-colors duration-200"
			style={{
				height: 30,
				color: theme.foreground,
				borderBottom: `1px solid ${isFocused ? theme.accent : `${theme.foreground}22`}`,
			}}
		>
			{isEditing ? (
				<input
					{...editInputProps}
					className="bg-transparent border rounded-sm text-[11px] py-px px-1 outline-none w-20"
					style={{ borderColor: theme.accent, color: theme.foreground }}
				/>
			) : (
				<span onDoubleClick={onDoubleClickLabel} className="cursor-default shrink-0 font-medium">
					{label}
				</span>
			)}

			<span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap opacity-50 flex items-center gap-1 text-[10px]">
				{FOLDER_ICON}
				{cwd}
			</span>

			{branch && (
				<output
					aria-label={`Git branch: ${branch}`}
					className="shrink-0 max-w-[140px] text-[10px] font-medium px-2 py-px rounded-sm overflow-hidden text-ellipsis whitespace-nowrap"
					title={branch}
					style={{
						backgroundColor: `${theme.accent}18`,
						color: theme.accent,
					}}
				>
					{branch}
				</output>
			)}

			<span className="opacity-20" style={{ color: theme.foreground }}>
				│
			</span>

			{snippetDropdown}

			<button
				type="button"
				onClick={onSplitVertical}
				title="Split vertical"
				aria-label="Split pane vertically"
				className={`bg-transparent border-none cursor-pointer text-[11px] px-0.5 leading-none opacity-40 hover:opacity-80 transition-opacity ${FOCUS_VIS}`}
				style={{ color: theme.foreground }}
			>
				┃
			</button>
			<button
				type="button"
				onClick={onSplitHorizontal}
				title="Split horizontal"
				aria-label="Split pane horizontally"
				className={`bg-transparent border-none cursor-pointer text-[11px] px-0.5 leading-none opacity-40 hover:opacity-80 transition-opacity ${FOCUS_VIS}`}
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
					className={`bg-transparent border-none cursor-pointer text-[11px] px-0.5 leading-none opacity-40 hover:opacity-80 transition-opacity ${FOCUS_VIS}`}
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
			className={`absolute bottom-3 left-1/4 right-1/4 z-10 h-8 rounded-md flex items-center justify-center text-xs cursor-pointer hover:brightness-110 ${FOCUS_VIS}`}
			style={{
				backgroundColor: `${theme.background}ee`,
				color: theme.foreground,
				border: `1px solid ${theme.accent}44`,
				boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
			}}
		>
			↓ bottom
		</button>
	)
}

const SolarizedVariant: PaneVariant = { StatusBar, ScrollButton }
registerVariant('Solarized Light', SolarizedVariant)
export { SolarizedVariant }
