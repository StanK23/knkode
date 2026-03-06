import { memo, useEffect, useRef, useState } from 'react'
import { DEFAULT_PANE_OPACITY, type PaneTheme } from '../../../shared/types'
import type {
	ContentBlock,
	StreamMessage,
	TextBlock,
	ThinkingBlock,
	ToolUseBlock,
} from '../lib/agent-renderers/types'
import { useStore } from '../store'
import { resolveBackground } from '../utils/colors'

// ── Block Views ──────────────────────────────────────────────────────────────

function TextBlockView({ block }: { block: TextBlock }) {
	if (!block.text) return null
	return (
		<pre className="whitespace-pre-wrap break-words m-0 text-content text-xs leading-relaxed">
			{block.text}
		</pre>
	)
}

function ThinkingBlockView({ block, streaming }: { block: ThinkingBlock; streaming: boolean }) {
	const [expanded, setExpanded] = useState(false)

	if (!block.text && !streaming) return null

	return (
		<div className="border-l-2 border-content-muted/30 pl-2 my-1">
			<button
				type="button"
				onClick={() => setExpanded((e) => !e)}
				aria-expanded={expanded}
				className="bg-transparent border-none cursor-pointer text-content-muted text-[11px] flex items-center gap-1 p-0 hover:text-content-secondary focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
			>
				<span className="text-[9px]">{expanded ? '\u25BE' : '\u25B8'}</span>
				<span className="italic">Thinking{streaming ? '...' : ''}</span>
			</button>
			{expanded && (
				<pre className="whitespace-pre-wrap break-words m-0 mt-1 text-content-muted text-[11px] leading-relaxed">
					{block.text}
				</pre>
			)}
		</div>
	)
}

function ToolCallBlockView({ block, streaming }: { block: ToolUseBlock; streaming: boolean }) {
	const [expanded, setExpanded] = useState(false)

	let displayJson = block.inputJson
	if (!streaming && block.inputJson) {
		try {
			// Skip pretty-printing for very large payloads to avoid UI freeze
			if (block.inputJson.length <= 100_000) {
				displayJson = JSON.stringify(JSON.parse(block.inputJson), null, 2)
			}
		} catch (err) {
			console.warn('[StreamRenderer] JSON format failed, keeping raw:', err)
		}
	}

	return (
		<div className="my-1.5 rounded-sm border border-edge overflow-hidden">
			<button
				type="button"
				onClick={() => setExpanded((e) => !e)}
				aria-expanded={expanded}
				className="w-full flex items-center gap-1.5 px-2 py-1 bg-sunken border-none cursor-pointer text-left hover:bg-overlay focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
			>
				<span className="text-[9px] text-content-muted">{expanded ? '\u25BE' : '\u25B8'}</span>
				<span className="text-accent text-[11px] font-semibold">{block.name || 'tool'}</span>
				{streaming && <span className="text-content-muted text-[10px] italic">running...</span>}
			</button>
			{expanded && displayJson && (
				<pre className="whitespace-pre-wrap break-words m-0 px-2 py-1.5 text-content-secondary text-[11px] leading-relaxed bg-canvas/50 border-t border-edge">
					{displayJson}
				</pre>
			)}
		</div>
	)
}

// ── Content Block Dispatcher ────────────────────────────────────────────────

function BlockView({ block, streaming }: { block: ContentBlock; streaming: boolean }) {
	switch (block.type) {
		case 'text':
			return <TextBlockView block={block} />
		case 'thinking':
			return <ThinkingBlockView block={block} streaming={streaming} />
		case 'tool_use':
			return <ToolCallBlockView block={block} streaming={streaming} />
		case 'tool_result':
			// TODO: implement ToolResultBlockView when tool_result blocks are produced
			return null
		default:
			console.warn('[StreamRenderer] Unknown block type:', (block as { type: string }).type)
			return null
	}
}

// ── Message Group ───────────────────────────────────────────────────────────

const MessageGroup = memo(function MessageGroup({ message }: { message: StreamMessage }) {
	return (
		<div className="py-2 px-3 border-b border-edge/50 last:border-b-0">
			<div className="flex items-center gap-2 mb-1.5 text-[11px]">
				{message.streaming && (
					<span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse motion-reduce:animate-none shrink-0" />
				)}
				<span className="font-semibold text-content-secondary">{message.role}</span>
				{message.model && <span className="text-content-muted">{message.model}</span>}
			</div>

			<div className="pl-0.5">
				{message.blocks.map((block, i) => (
					<BlockView
						key={`${block.type}-${i}`}
						block={block}
						streaming={message.streaming && i === message.blocks.length - 1}
					/>
				))}
			</div>

			{!message.streaming && (message.stopReason || message.usage) && (
				<div className="mt-1.5 text-[10px] text-content-muted flex items-center gap-2">
					{message.stopReason && <span>{message.stopReason}</span>}
					{message.usage && (
						<span>
							{message.usage.inputTokens > 0 && `${message.usage.inputTokens} in`}
							{message.usage.inputTokens > 0 && message.usage.outputTokens > 0 && ' · '}
							{message.usage.outputTokens > 0 && `${message.usage.outputTokens} out`}
						</span>
					)}
				</div>
			)}
		</div>
	)
})

// ── Stream Renderer ─────────────────────────────────────────────────────────

interface StreamRendererProps {
	paneId: string
	theme: PaneTheme
	themeOverride: Partial<PaneTheme> | null
}

export function StreamRenderer({ paneId, theme, themeOverride }: StreamRendererProps) {
	const messages = useStore((s) => s.paneStreamMessages.get(paneId))
	const scrollRef = useRef<HTMLDivElement>(null)
	const wasAtBottomRef = useRef(true)

	const opacity = themeOverride?.paneOpacity ?? theme.paneOpacity ?? DEFAULT_PANE_OPACITY
	const bg = resolveBackground(themeOverride?.background ?? theme.background, opacity)

	// Auto-scroll to bottom when new content arrives (if user was at bottom).
	// `messages` is an intentional trigger dep — it's a new array ref on every store update.
	// biome-ignore lint/correctness/useExhaustiveDependencies: messages intentionally triggers auto-scroll
	useEffect(() => {
		const el = scrollRef.current
		if (!el || !wasAtBottomRef.current) return
		el.scrollTop = el.scrollHeight
	}, [messages])

	const handleScroll = () => {
		const el = scrollRef.current
		if (!el) return
		wasAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 8
	}

	if (!messages?.length) {
		return (
			<div
				className="w-full h-full flex items-center justify-center text-content-muted text-xs"
				style={{ backgroundColor: bg }}
			>
				Waiting for agent output...
			</div>
		)
	}

	return (
		<div
			ref={scrollRef}
			role="log"
			aria-label="Agent conversation"
			className="w-full h-full overflow-y-auto p-1.5"
			style={{ backgroundColor: bg }}
			onScroll={handleScroll}
		>
			{messages.map((msg) => (
				<MessageGroup key={msg.id} message={msg} />
			))}
		</div>
	)
}
