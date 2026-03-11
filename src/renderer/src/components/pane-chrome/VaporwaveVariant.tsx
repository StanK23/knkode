import { registerVariant } from '.'
import { FOCUS_VIS, PrBadge } from './shared'
import type { FrameProps, PaneVariant, ScrollButtonProps } from './types'

function Frame({
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
	children,
	headerProps,
	contextMenu,
}: FrameProps) {
	const glowColor = theme.glow ?? theme.accent
	const c1 = theme.accent // pink
	const c2 = '#01cdfe' // cyan
	const c3 = '#7b2fff' // purple

	const activeOpacity = isFocused ? 1 : 0.6

	return (
		<div
			className="relative flex flex-col h-full w-full bg-[#0a0015] overflow-hidden"
			style={{ padding: '8px' }}
		>
			{/* Perspective Grid Background */}
			<div
				className="absolute inset-0 pointer-events-none z-0"
				style={{
					opacity: isFocused ? 0.3 : 0.1,
					background: `linear-gradient(0deg, ${c1}33 0px, ${c1}33 1px, transparent 1px) 0 68% / 100% 1px no-repeat,
								 linear-gradient(0deg, ${c1}33 0px, ${c1}33 1px, transparent 1px) 0 78% / 100% 1px no-repeat,
								 linear-gradient(0deg, ${c1}33 0px, ${c1}33 1px, transparent 1px) 0 90% / 100% 1px no-repeat`,
					boxShadow: `inset 0 0 40px ${c3}88`,
					border: `2px solid ${c1}44`,
					borderRadius: '4px',
				}}
			/>

			{/* Vaporwave Header */}
			<div
				{...headerProps}
				className={`${headerProps.className || ''} relative z-20 flex flex-col px-3 shrink-0 select-none transition-all duration-300`}
				style={{
					...headerProps.style,
					borderBottom: '3px solid transparent',
					borderImage: isFocused
						? `linear-gradient(90deg, ${c1}, ${c2}, ${c3}) 1`
						: `linear-gradient(90deg, ${c1}44, ${c2}44, ${c3}44) 1`,
					backgroundColor: '#0a0015cc',
					backdropFilter: 'blur(4px)',
				}}
			>
				{/* Row 1: label, cwd, snippet, actions */}
				<div
					className="flex items-center gap-2 text-[11px] tracking-wider font-light pt-1"
					style={{ color: theme.foreground, opacity: activeOpacity }}
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
							style={{ color: theme.accent, textShadow: isFocused ? `0 0 8px ${c1}` : 'none' }}
						>
							{label}
						</span>
					)}

					<span
						className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap opacity-80"
						style={{
							backgroundImage: `linear-gradient(90deg, ${c1}, ${c2})`,
							WebkitBackgroundClip: 'text',
							WebkitTextFillColor: 'transparent',
						}}
					>
						{cwd}
					</span>

					<SnippetTrigger
						className={`text-[9px] tracking-wider font-medium px-2 py-0.5 rounded-full cursor-pointer border-none hover:brightness-110 transition-all ${FOCUS_VIS}`}
						style={{
							background: `linear-gradient(135deg, ${c1}44, ${c2}44)`,
							color: theme.foreground,
							boxShadow: isFocused ? `0 0 6px ${c2}44` : 'none',
						}}
					>
						{'>_'}
					</SnippetTrigger>

					<button
						type="button"
						onClick={onSplitVertical}
						title={`Split vertical (${shortcuts.splitV})`}
						aria-label="Split pane vertically"
						className={`text-[9px] tracking-wider font-medium px-2 py-0.5 rounded-full cursor-pointer border-none hover:brightness-110 transition-all ${FOCUS_VIS}`}
						style={{
							background: `linear-gradient(135deg, ${c1}44, ${c2}44)`,
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
							background: `linear-gradient(135deg, ${c1}44, ${c2}44)`,
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
								background: `linear-gradient(135deg, ${c1}44, ${c2}44)`,
								color: theme.foreground,
							}}
						>
							CLOSE ✕
						</button>
					)}
				</div>

				{/* Row 2: git branch + PR */}
				{(branch || pr) && (
					<div className="flex items-center gap-1.5 py-1" style={{ opacity: activeOpacity }}>
						{branch && (
							<output
								aria-label={`Git branch: ${branch}`}
								className="text-[10px] font-medium px-3 py-0.5 rounded-full overflow-hidden text-ellipsis whitespace-nowrap"
								title={branch}
								style={{
									background: `linear-gradient(135deg, ${c1}, ${c3})`,
									color: theme.background,
									boxShadow: isFocused ? `0 0 8px ${glowColor}44` : 'none',
								}}
							>
								{branch}
							</output>
						)}
						{pr && (
							<PrBadge
								pr={pr}
								onOpenExternal={onOpenExternal}
								className="text-[10px] font-medium px-3 py-0.5 rounded-full hover:brightness-110 transition-all"
								style={{
									background: `linear-gradient(135deg, ${c1}, ${c3})`,
									color: theme.background,
									boxShadow: isFocused ? `0 0 8px ${glowColor}44` : 'none',
								}}
							/>
						)}
					</div>
				)}
				{contextMenu}
			</div>

			{/* Terminal Area */}
			<div className="relative z-10 flex-1 w-full min-h-0 bg-black/80 backdrop-blur-md border border-[#ff71ce]/20 mt-1 rounded-b-sm">
				{children}
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
			className={`absolute bottom-4 left-1/4 right-1/4 z-30 h-9 rounded-full flex items-center justify-center text-xs tracking-wider font-medium cursor-pointer hover:brightness-110 ${FOCUS_VIS}`}
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

const VaporwaveVariant: PaneVariant = { Frame, ScrollButton }
registerVariant('Vaporwave', VaporwaveVariant)
