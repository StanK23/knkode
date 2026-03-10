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
	SnippetTrigger,
	shortcuts,
}: StatusBarProps) {
	const fg = isFocused ? theme.accent : theme.foreground
	return (
		<div
			className="flex items-center gap-0 px-2 text-[10px] font-mono uppercase shrink-0 select-none transition-colors duration-200"
			style={{
				height: 24,
				color: fg,
				borderBottom: `1px dotted ${theme.accent}66`,
				textShadow: isFocused ? `0 0 4px ${theme.accent}44` : 'none',
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

			<span className="mx-1 opacity-40">│</span>

			<span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap opacity-70">
				CWD: {cwd.toUpperCase()}
			</span>

			{branch && (
				<output
					aria-label={`Git branch: ${branch}`}
					className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap opacity-80"
					title={branch}
				>
					<span className="mx-1 opacity-40">│</span>
					BR: {branch.toUpperCase()}
				</output>
			)}

			<span className="mx-1 opacity-40">│</span>

			<SnippetTrigger
				className={`bg-transparent border-none cursor-pointer px-0.5 leading-none opacity-60 hover:opacity-100 ${FOCUS_VIS}`}
				style={{ color: fg }}
			>
				[CMD]
			</SnippetTrigger>

			<button
				type="button"
				onClick={onSplitVertical}
				title={`Split vertical (${shortcuts.splitV})`}
				aria-label="Split pane vertically"
				className={`bg-transparent border-none cursor-pointer px-0.5 leading-none opacity-60 hover:opacity-100 ${FOCUS_VIS}`}
				style={{ color: fg }}
			>
				[SPLIT-V]
			</button>
			<button
				type="button"
				onClick={onSplitHorizontal}
				title={`Split horizontal (${shortcuts.splitH})`}
				aria-label="Split pane horizontally"
				className={`bg-transparent border-none cursor-pointer px-0.5 leading-none opacity-60 hover:opacity-100 ${FOCUS_VIS}`}
				style={{ color: fg }}
			>
				[SPLIT-H]
			</button>
			{canClose && (
				<button
					type="button"
					onClick={onClose}
					title={`Close pane (${shortcuts.close})`}
					aria-label="Close pane"
					className={`bg-transparent border-none cursor-pointer px-0.5 leading-none opacity-60 hover:opacity-100 ${FOCUS_VIS}`}
					style={{ color: fg }}
				>
					[CLOSE]
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
			className={`absolute bottom-2 left-2 right-2 z-10 h-7 flex items-center justify-center text-[10px] font-mono uppercase tracking-widest cursor-pointer hover:brightness-125 ${FOCUS_VIS}`}
			style={{
				backgroundColor: `${theme.background}dd`,
				color: theme.accent,
				border: `1px dotted ${theme.accent}44`,
				textShadow: `0 0 6px ${theme.accent}44`,
			}}
		>
			{'>>> SCROLL DOWN <<<'}
		</button>
	)
}

const AmberVariant: PaneVariant = { StatusBar, ScrollButton }
registerVariant('Amber', AmberVariant)
