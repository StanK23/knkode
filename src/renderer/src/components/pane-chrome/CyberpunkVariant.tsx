import { registerVariant } from '.'
import { FOCUS_VIS, PrBadge } from './shared'
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
	const glowColor = theme.glow ?? theme.accent
	return (
		<div
			className="flex items-center gap-2 px-3 text-[10px] font-bold uppercase tracking-widest shrink-0 select-none transition-all duration-300"
			style={{
				height: 32,
				color: theme.foreground,
				borderBottom: `1px solid ${theme.accent}88`,
				boxShadow: isFocused ? `0 1px 8px ${glowColor}44, inset 0 -1px 4px ${glowColor}22` : 'none',
			}}
		>
			{isEditing ? (
				<input
					{...editInputProps}
					className="bg-transparent border font-bold uppercase tracking-wider text-[10px] py-px px-1 outline-none w-20"
					style={{ borderColor: theme.accent, color: theme.accent }}
				/>
			) : (
				<span
					onDoubleClick={onDoubleClickLabel}
					className="cursor-default shrink-0"
					style={{ color: theme.accent }}
				>
					{label}
				</span>
			)}

			<span className="opacity-30">/</span>

			<span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap opacity-60 text-[9px]">
				{'// '}
				{cwd}
			</span>

			{branch && (
				<output
					aria-label={`Git branch: ${branch}`}
					className="min-w-0 text-[9px] font-bold px-2 py-px overflow-hidden text-ellipsis whitespace-nowrap transition-all duration-200 hover:brightness-125"
					title={branch}
					style={{
						color: theme.background,
						backgroundColor: theme.accent,
						clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
						paddingLeft: 14,
						paddingRight: 14,
						textShadow: `0 0 4px ${glowColor}88`,
					}}
				>
					{branch}
				</output>
			)}

			{pr && (
				<PrBadge
					pr={pr}
					onOpenExternal={onOpenExternal}
					className="bg-transparent text-[9px] font-bold uppercase tracking-widest px-1 leading-none opacity-50 hover:opacity-100 transition-opacity"
					style={{ color: theme.accent, textShadow: `0 0 4px ${glowColor}88` }}
				/>
			)}

			<SnippetTrigger
				className={`bg-transparent border-none cursor-pointer px-1 leading-none opacity-50 hover:opacity-100 transition-opacity ${FOCUS_VIS}`}
				style={{ color: theme.accent }}
			>
				{'>_'}
			</SnippetTrigger>

			<button
				type="button"
				onClick={onSplitVertical}
				title={`Split vertical (${shortcuts.splitV})`}
				aria-label="Split pane vertically"
				className={`bg-transparent border-none cursor-pointer px-1 leading-none opacity-50 hover:opacity-100 transition-opacity ${FOCUS_VIS}`}
				style={{ color: theme.accent }}
			>
				┃
			</button>
			<button
				type="button"
				onClick={onSplitHorizontal}
				title={`Split horizontal (${shortcuts.splitH})`}
				aria-label="Split pane horizontally"
				className={`bg-transparent border-none cursor-pointer px-1 leading-none opacity-50 hover:opacity-100 transition-opacity ${FOCUS_VIS}`}
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
					className={`bg-transparent border-none cursor-pointer px-1 leading-none opacity-50 hover:opacity-100 transition-opacity ${FOCUS_VIS}`}
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
			className={`absolute bottom-3 left-3 right-3 z-10 h-8 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:brightness-125 ${FOCUS_VIS}`}
			style={{
				backgroundColor: `${theme.background}dd`,
				color: theme.accent,
				border: `1px solid ${theme.accent}66`,
				clipPath: 'polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)',
				boxShadow: `0 0 12px ${glowColor}44`,
				textShadow: `0 0 6px ${glowColor}66`,
			}}
		>
			↓ BOTTOM
		</button>
	)
}

const CyberpunkVariant: PaneVariant = { StatusBar, ScrollButton }
registerVariant('Cyberpunk', CyberpunkVariant)
