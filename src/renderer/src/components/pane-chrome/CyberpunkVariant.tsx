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
	const c1 = theme.accent // neon pink
	const c2 = theme.glow || '#05d9e8' // cyan

	// If not focused, we dull the colors to simulate power-saving
	const activeC1 = isFocused ? c1 : `${c1}88`
	const activeC2 = isFocused ? c2 : `${c2}88`

	return (
		<div
			className="relative flex flex-col h-full w-full bg-[#0d0221] overflow-hidden"
			style={{ padding: '8px 12px 24px 12px' }}
		>
			{/* SVG Vector Overlays */}
			<svg
				aria-hidden="true"
				className="absolute inset-0 pointer-events-none z-0"
				width="100%"
				height="100%"
				preserveAspectRatio="none"
			>
				<defs>
					<linearGradient id={`cy-grad-${label}`} x1="0" y1="0" x2="1" y2="1">
						<stop offset="0%" stopColor={c1} stopOpacity={isFocused ? 0.15 : 0.05} />
						<stop offset="100%" stopColor={c2} stopOpacity={isFocused ? 0.08 : 0.02} />
					</linearGradient>
					<clipPath id={`cy-clip-${label}`}>
						<polygon points="12,0 100%,0 100%,calc(100% - 12px) calc(100% - 12px),100% 0,100% 0,12px" />
					</clipPath>
				</defs>
				<rect width="100%" height="100%" fill={`url(#cy-grad-${label})`} />
				{/* Diagonal accents */}
				<line
					x1="calc(100% - 60px)"
					y1="0"
					x2="100%"
					y2="60"
					stroke={c1}
					strokeOpacity={isFocused ? 0.15 : 0.05}
					strokeWidth="24"
				/>
				<line
					x1="0"
					y1="calc(100% - 50px)"
					x2="50"
					y2="100%"
					stroke={c2}
					strokeOpacity={isFocused ? 0.1 : 0.03}
					strokeWidth="16"
				/>
				{/* Outer Border with chamfered corners */}
				<path
					d="M 0 12 L 12 0 L 100% 0 L 100% calc(100% - 12px) L calc(100% - 12px) 100% L 0 100% Z"
					fill="none"
					stroke={c1}
					strokeOpacity={isFocused ? 0.3 : 0.1}
					strokeWidth="1"
				/>
			</svg>

			{/* Terminal Area (The "screen") */}
			<div
				className="relative z-10 flex-1 w-full min-h-0 bg-black/60 shadow-inner border border-white/5"
				style={{ boxShadow: isFocused ? `inset 0 0 20px ${c1}33` : 'none' }}
			>
				{children}
			</div>

			{/* Custom Cyberpunk Status Bar */}
			<div
				{...headerProps}
				className={`${headerProps.className || ''} absolute bottom-0 left-0 w-full h-7 flex items-center gap-2 px-4 text-[9px] font-mono font-bold uppercase tracking-widest shrink-0 select-none transition-all duration-300 z-20`}
				style={{
					...headerProps.style,
					color: theme.foreground,
					borderTop: `1px solid ${activeC1}88`,
					background: `linear-gradient(90deg, ${activeC1}22 0%, ${activeC2}11 100%)`,
					boxShadow: isFocused ? `0 -1px 8px ${glowColor}44` : 'none',
				}}
			>
				{isEditing ? (
					<input
						{...editInputProps}
						className="bg-transparent border font-bold uppercase tracking-wider text-[10px] py-px px-1 outline-none w-20"
						style={{ borderColor: activeC1, color: activeC1 }}
					/>
				) : (
					<span
						onDoubleClick={onDoubleClickLabel}
						className="cursor-default shrink-0"
						style={{ color: activeC1, textShadow: isFocused ? `0 0 4px ${activeC1}` : 'none' }}
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
						className="min-w-0 text-[9px] font-bold px-3 py-px overflow-hidden text-ellipsis whitespace-nowrap"
						title={branch}
						style={{
							color: theme.background,
							backgroundColor: activeC1,
							clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
							textShadow: isFocused ? `0 0 2px ${theme.background}` : 'none',
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
						style={{ color: activeC1, textShadow: isFocused ? `0 0 4px ${glowColor}88` : 'none' }}
					/>
				)}

				<SnippetTrigger
					className={`bg-transparent border-none cursor-pointer px-1 leading-none opacity-50 hover:opacity-100 transition-opacity ${FOCUS_VIS}`}
					style={{ color: activeC2 }}
				>
					{'>_'}
				</SnippetTrigger>

				<button
					type="button"
					onClick={onSplitVertical}
					title={`Split vertical (${shortcuts.splitV})`}
					aria-label="Split pane vertically"
					className={`bg-transparent border-none cursor-pointer px-1 leading-none opacity-50 hover:opacity-100 transition-opacity ${FOCUS_VIS}`}
					style={{ color: activeC2 }}
				>
					┃
				</button>
				<button
					type="button"
					onClick={onSplitHorizontal}
					title={`Split horizontal (${shortcuts.splitH})`}
					aria-label="Split pane horizontally"
					className={`bg-transparent border-none cursor-pointer px-1 leading-none opacity-50 hover:opacity-100 transition-opacity ${FOCUS_VIS}`}
					style={{ color: activeC2 }}
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
						style={{ color: activeC1 }}
					>
						✕
					</button>
				)}
				{contextMenu}
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
			className={`absolute bottom-10 left-4 right-4 z-30 h-8 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:brightness-125 ${FOCUS_VIS}`}
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

const CyberpunkVariant: PaneVariant = { Frame, ScrollButton }
registerVariant('Cyberpunk', CyberpunkVariant)
