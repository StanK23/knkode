import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_PANE_OPACITY, type PaneTheme } from '../../../shared/types'
import { stripAnsi } from '../lib/ansi'
import { BLOCK_TYPE_COLORS, type AgentBlock, type AgentBlockType } from '../lib/agent-parsers/types'
import { useStore } from '../store'
import { resolveBackground } from '../utils/colors'
import { getTerminal } from './Terminal'

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Box-drawing characters used by Claude's TUI borders. */
const BOX_CHARS_RE = /[╭╮╰╯│─┬┴┤├┼]/g

const BLOCK_LABELS: Record<AgentBlockType, string> = {
	'tool-call': 'Tool',
	'tool-result': 'Result',
	thinking: 'Thinking',
	diff: 'Diff',
	text: 'Output',
	status: 'Status',
	permission: 'Permission',
	error: 'Error',
	unknown: 'Output',
}

/** Read and clean the content lines for a block from the xterm buffer. */
function extractContent(paneId: string, block: AgentBlock): string {
	const term = getTerminal(paneId)
	if (!term) return ''
	const buffer = term.buffer.active
	const end = Math.min(block.endLine ?? buffer.length - 1, buffer.length - 1)
	const lines: string[] = []
	// Skip startLine (header — already shown as block label)
	for (let i = block.startLine + 1; i <= end; i++) {
		const raw = buffer.getLine(i)?.translateToString(true) ?? ''
		const cleaned = stripAnsi(raw).replace(BOX_CHARS_RE, '').trim()
		if (cleaned) lines.push(cleaned)
	}
	return lines.join('\n')
}

// ── Block Item ──────────────────────────────────────────────────────────────

interface BlockItemProps {
	block: AgentBlock
	paneId: string
}

const BlockItem = memo(function BlockItem({ block, paneId }: BlockItemProps) {
	const isStreaming = block.endLine === null
	const label = BLOCK_LABELS[block.type]
	const toolName = block.metadata.tool
	const colorClass = BLOCK_TYPE_COLORS[block.type]

	const [expanded, setExpanded] = useState(() => block.type !== 'thinking')

	const content = useMemo(() => extractContent(paneId, block), [paneId, block])

	return (
		<div className="border-b border-edge/50 last:border-b-0">
			<button
				type="button"
				onClick={() => setExpanded((e) => !e)}
				className="w-full flex items-center gap-1.5 px-3 py-1.5 bg-transparent border-none cursor-pointer text-left hover:bg-overlay/30 focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
			>
				{isStreaming && (
					<span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse motion-reduce:animate-none shrink-0" />
				)}
				<span className="text-[9px] text-content-muted">{expanded ? '\u25BE' : '\u25B8'}</span>
				<span className={`text-[11px] font-semibold ${colorClass}`}>
					{label}
					{toolName ? `: ${toolName}` : ''}
				</span>
				{isStreaming && <span className="text-content-muted text-[10px] italic">streaming...</span>}
			</button>
			{expanded && content && (
				<pre className="whitespace-pre-wrap break-words m-0 px-3 pb-2 text-content-secondary text-[11px] leading-relaxed max-h-80 overflow-y-auto">
					{content}
				</pre>
			)}
		</div>
	)
})

// ── Message Input ───────────────────────────────────────────────────────────

function MessageInput({ paneId }: { paneId: string }) {
	const [input, setInput] = useState('')
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	const handleSubmit = useCallback(() => {
		const trimmed = input.trim()
		if (!trimmed) return
		window.api.writePty(paneId, `${trimmed}\r`).catch((err) => {
			console.error('[BufferRenderedView] writePty failed:', err)
		})
		setInput('')
	}, [paneId, input])

	const handleStop = useCallback(() => {
		window.api.writePty(paneId, '\x03').catch((err) => {
			console.error('[BufferRenderedView] writePty Ctrl+C failed:', err)
		})
	}, [paneId])

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault()
				handleSubmit()
			}
			if (e.key === 'Escape') {
				setInput('')
				textareaRef.current?.blur()
			}
		},
		[handleSubmit],
	)

	// Auto-resize textarea
	// biome-ignore lint/correctness/useExhaustiveDependencies: input change triggers resize
	useEffect(() => {
		const el = textareaRef.current
		if (!el) return
		el.style.height = '0'
		el.style.height = `${Math.min(el.scrollHeight, 120)}px`
	}, [input])

	const isStreaming = useStore(
		(s) => s.paneAgentBlocks.get(paneId)?.at(-1)?.endLine === null,
	)

	return (
		<div className="border-t border-edge px-3 py-2 shrink-0">
			{isStreaming && (
				<div className="flex items-center gap-2 mb-2">
					<span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse motion-reduce:animate-none shrink-0" />
					<span className="text-content-muted text-[11px]">Agent is responding...</span>
					<button
						type="button"
						onClick={handleStop}
						className="ml-auto text-[10px] px-1.5 py-0.5 rounded-sm cursor-pointer border border-edge bg-overlay hover:bg-overlay-active text-content-secondary focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
					>
						Stop
					</button>
				</div>
			)}
			<div className="flex gap-2 items-end">
				<textarea
					ref={textareaRef}
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="Send a message... (Enter to send)"
					rows={1}
					className="flex-1 resize-none bg-sunken border border-edge rounded-sm px-2 py-1.5 text-content text-xs leading-relaxed placeholder:text-content-muted/50 focus:outline-none focus:ring-1 focus:ring-accent"
				/>
				<button
					type="button"
					onClick={handleSubmit}
					disabled={!input.trim()}
					className="px-2 py-1.5 text-[11px] font-semibold rounded-sm cursor-pointer border-none bg-accent text-canvas hover:brightness-110 disabled:opacity-40 disabled:cursor-default focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
				>
					Send
				</button>
			</div>
			<div className="mt-1 text-[10px] text-content-muted/40">
				Enter to send · Shift+Enter for newline · Esc to clear
			</div>
		</div>
	)
}

// ── Buffer Rendered View ────────────────────────────────────────────────────

interface BufferRenderedViewProps {
	paneId: string
	theme: PaneTheme
	themeOverride: Partial<PaneTheme> | null
}

export function BufferRenderedView({ paneId, theme, themeOverride }: BufferRenderedViewProps) {
	const blocks = useStore((s) => s.paneAgentBlocks.get(paneId))
	const scrollRef = useRef<HTMLDivElement>(null)
	const wasAtBottomRef = useRef(true)

	const opacity = themeOverride?.paneOpacity ?? theme.paneOpacity ?? DEFAULT_PANE_OPACITY
	const bg = resolveBackground(themeOverride?.background ?? theme.background, opacity)

	const hasBlocks = (blocks?.length ?? 0) > 0

	// Auto-scroll when new blocks appear
	// biome-ignore lint/correctness/useExhaustiveDependencies: blocks intentionally triggers auto-scroll
	useEffect(() => {
		const el = scrollRef.current
		if (!el || !wasAtBottomRef.current) return
		el.scrollTop = el.scrollHeight
	}, [blocks])

	const handleScroll = useCallback(() => {
		const el = scrollRef.current
		if (!el) return
		wasAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 8
	}, [])

	return (
		<div className="w-full h-full flex flex-col" style={{ backgroundColor: bg }}>
			{hasBlocks && blocks ? (
				<div ref={scrollRef} className="flex-1 overflow-y-auto" onScroll={handleScroll}>
					{blocks.map((block) => (
						<BlockItem key={block.id} block={block} paneId={paneId} />
					))}
				</div>
			) : (
				<div
					ref={scrollRef}
					className="flex-1 flex items-center justify-center text-content-muted text-xs"
				>
					Waiting for agent output...
				</div>
			)}
			<MessageInput paneId={paneId} />
		</div>
	)
}
