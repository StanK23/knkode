import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_PANE_OPACITY, type PaneTheme } from '../../../shared/types'
import { BLOCK_TYPE_COLORS, type AgentBlock } from '../lib/agent-parsers/types'
import { useStore } from '../store'
import { resolveBackground } from '../utils/colors'

// ── Block Components ────────────────────────────────────────────────────────

const ToolBlock = memo(function ToolBlock({ block }: { block: AgentBlock }) {
	const [expanded, setExpanded] = useState(false)
	const isStreaming = block.endLine === null
	const toolName = block.metadata.tool ?? 'unknown'
	const hasContent = !!block.content?.trim()

	return (
		<div className="my-0.5">
			<button
				type="button"
				onClick={() => hasContent && setExpanded((e) => !e)}
				className={`inline-flex items-center gap-1 px-0 py-0 bg-transparent border-none text-left font-mono text-[11px] leading-relaxed ${hasContent ? 'cursor-pointer hover:underline' : 'cursor-default'} ${BLOCK_TYPE_COLORS[block.type]}`}
			>
				{isStreaming && (
					<span className="w-1 h-1 rounded-full bg-accent animate-pulse motion-reduce:animate-none shrink-0 inline-block" />
				)}
				<span className="opacity-50">{expanded ? '▾' : '▸'}</span>
				<span>{toolName}</span>
				{isStreaming && <span className="opacity-40 italic ml-1">running...</span>}
			</button>
			{expanded && hasContent && (
				<pre className="whitespace-pre-wrap break-words m-0 pl-4 text-content-muted text-[11px] leading-relaxed max-h-60 overflow-y-auto opacity-70">
					{block.content}
				</pre>
			)}
		</div>
	)
})

const TextBlock = memo(function TextBlock({ block }: { block: AgentBlock }) {
	const content = block.content?.trim()
	if (!content) return null

	return (
		<div className="my-1">
			<pre className="whitespace-pre-wrap break-words m-0 text-content text-xs leading-relaxed font-mono">
				{content}
			</pre>
		</div>
	)
})

const ThinkingBlock = memo(function ThinkingBlock({ block }: { block: AgentBlock }) {
	const isStreaming = block.endLine === null
	const duration = block.metadata.duration

	return (
		<div className="my-0.5 text-content-muted text-[11px] font-mono italic flex items-center gap-1.5">
			{isStreaming && (
				<span className="w-1 h-1 rounded-full bg-content-muted animate-pulse motion-reduce:animate-none shrink-0 inline-block" />
			)}
			<span>{isStreaming ? 'thinking...' : `thought${duration ? ` ${duration}` : ''}`}</span>
		</div>
	)
})

const ErrorBlock = memo(function ErrorBlock({ block }: { block: AgentBlock }) {
	return (
		<div className="my-1">
			<pre className="whitespace-pre-wrap break-words m-0 text-danger text-xs leading-relaxed font-mono">
				{block.content || 'Error'}
			</pre>
		</div>
	)
})

const PermissionBlock = memo(function PermissionBlock({ block }: { block: AgentBlock }) {
	return (
		<div className="my-1 px-2 py-1 border-l-2 border-yellow-400/50">
			<pre className="whitespace-pre-wrap break-words m-0 text-yellow-400 text-xs leading-relaxed font-mono">
				{block.content || 'Permission required'}
			</pre>
		</div>
	)
})

const DiffBlock = memo(function DiffBlock({ block }: { block: AgentBlock }) {
	const [expanded, setExpanded] = useState(false)
	const hasContent = !!block.content?.trim()

	return (
		<div className="my-0.5">
			<button
				type="button"
				onClick={() => hasContent && setExpanded((e) => !e)}
				className={`inline-flex items-center gap-1 px-0 py-0 bg-transparent border-none text-left font-mono text-[11px] leading-relaxed ${hasContent ? 'cursor-pointer hover:underline' : 'cursor-default'} text-green-400`}
			>
				<span className="opacity-50">{expanded ? '▾' : '▸'}</span>
				<span>diff</span>
			</button>
			{expanded && hasContent && (
				<pre className="whitespace-pre-wrap break-words m-0 pl-4 text-content-muted text-[11px] leading-relaxed max-h-60 overflow-y-auto">
					{block.content}
				</pre>
			)}
		</div>
	)
})

// ── Block Router ────────────────────────────────────────────────────────────

const BlockItem = memo(function BlockItem({ block }: { block: AgentBlock }) {
	switch (block.type) {
		case 'tool-call':
		case 'tool-result':
			return <ToolBlock block={block} />
		case 'text':
			return <TextBlock block={block} />
		case 'thinking':
			return <ThinkingBlock block={block} />
		case 'error':
			return <ErrorBlock block={block} />
		case 'permission':
			return <PermissionBlock block={block} />
		case 'diff':
			return <DiffBlock block={block} />
		case 'status':
			return null
		case 'unknown': {
			// Show unknown blocks as text if they have content, otherwise hide
			const content = block.content?.trim()
			if (!content) return null
			return <TextBlock block={block} />
		}
		default:
			return null
	}
})

// ── Message Input ───────────────────────────────────────────────────────────

function MessageInput({ paneId }: { paneId: string }) {
	const [input, setInput] = useState('')
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const sendAgentMessage = useStore((s) => s.sendAgentMessage)

	const isStreaming = useStore(
		(s) => s.paneAgentBlocks.get(paneId)?.at(-1)?.endLine === null,
	)

	const handleSubmit = useCallback(() => {
		const trimmed = input.trim()
		if (!trimmed) return
		sendAgentMessage(paneId, trimmed)
		setInput('')
	}, [paneId, input, sendAgentMessage])

	const handleStop = useCallback(() => {
		window.api.writePty(paneId, '\x1b').catch((err) => {
			console.error('[BufferRenderedView] writePty Esc failed:', err)
		})
	}, [paneId])

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault()
				handleSubmit()
			}
			if (e.key === 'Escape') {
				if (isStreaming) {
					handleStop()
				} else {
					setInput('')
					textareaRef.current?.blur()
				}
			}
		},
		[handleSubmit, handleStop, isStreaming],
	)

	// Auto-resize textarea
	// biome-ignore lint/correctness/useExhaustiveDependencies: input change triggers resize
	useEffect(() => {
		const el = textareaRef.current
		if (!el) return
		el.style.height = '0'
		el.style.height = `${Math.min(el.scrollHeight, 120)}px`
	}, [input])

	return (
		<div className="border-t border-edge/30 px-3 py-2 shrink-0">
			{isStreaming ? (
				<button
					type="button"
					onClick={handleStop}
					className="w-full text-left px-2 py-1.5 rounded-sm cursor-pointer border border-edge/30 bg-transparent hover:bg-overlay/30 text-content-muted text-[11px] font-mono focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none flex items-center gap-2"
				>
					<span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse motion-reduce:animate-none shrink-0" />
					<span className="opacity-60">esc to interrupt</span>
				</button>
			) : (
				<div className="flex gap-2 items-end">
					<span className="text-accent font-mono text-xs shrink-0 py-1.5">{'>'}</span>
					<textarea
						ref={textareaRef}
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="message..."
						rows={1}
						className="flex-1 resize-none bg-transparent border-none px-0 py-1.5 text-content text-xs leading-relaxed font-mono placeholder:text-content-muted/30 focus:outline-none"
					/>
				</div>
			)}
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

	// Auto-scroll when new blocks appear or content changes
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
				<div ref={scrollRef} role="log" aria-label="Agent conversation" className="flex-1 overflow-y-auto px-3 py-2" onScroll={handleScroll}>
					{blocks.map((block) => (
						<BlockItem key={block.id} block={block} />
					))}
				</div>
			) : (
				<div className="flex-1 flex items-center justify-center text-content-muted text-xs font-mono">
					waiting for agent output...
				</div>
			)}
			<MessageInput paneId={paneId} />
		</div>
	)
}
