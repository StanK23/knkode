import { memo, useCallback, useEffect, useRef, useState } from 'react'
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

// ── Message Input ───────────────────────────────────────────────────────────

function MessageInput({ paneId, isStreaming }: { paneId: string; isStreaming: boolean }) {
	const [input, setInput] = useState('')
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	const handleSubmit = useCallback(() => {
		const trimmed = input.trim()
		if (!trimmed) return
		window.api.writePty(paneId, `${trimmed}\n`)
		setInput('')
	}, [paneId, input])

	const handleStop = useCallback(() => {
		window.api.writePty(paneId, '\x03')
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

	// biome-ignore lint/correctness/useExhaustiveDependencies: input change triggers resize
	useEffect(() => {
		const el = textareaRef.current
		if (!el) return
		el.style.height = '0'
		el.style.height = `${Math.min(el.scrollHeight, 120)}px`
	}, [input])

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
					placeholder="Send a message... (Enter to send, Shift+Enter for newline)"
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

// ── Raw Text View ───────────────────────────────────────────────────────────

/** Fallback rendered view: shows ANSI-stripped PTY output as clean text. */
function RawTextView({
	text,
	scrollRef,
	onScroll,
}: { text: string; scrollRef: React.RefObject<HTMLDivElement | null>; onScroll: () => void }) {
	return (
		<div
			ref={scrollRef}
			role="log"
			aria-label="Agent conversation"
			className="flex-1 overflow-y-auto p-3"
			onScroll={onScroll}
		>
			<pre className="whitespace-pre-wrap break-words m-0 text-content text-xs leading-relaxed">
				{text}
			</pre>
		</div>
	)
}

// ── Structured Message View ─────────────────────────────────────────────────

/** Structured view: shows parsed NDJSON messages (when --output-format stream-json is active). */
function StructuredView({
	messages,
	scrollRef,
	onScroll,
}: {
	messages: readonly StreamMessage[]
	scrollRef: React.RefObject<HTMLDivElement | null>
	onScroll: () => void
}) {
	return (
		<div
			ref={scrollRef}
			role="log"
			aria-label="Agent conversation"
			className="flex-1 overflow-y-auto p-1.5"
			onScroll={onScroll}
		>
			{messages.map((msg) => (
				<MessageGroup key={msg.id} message={msg} />
			))}
		</div>
	)
}

// ── Stream Renderer ─────────────────────────────────────────────────────────

interface StreamRendererProps {
	paneId: string
	theme: PaneTheme
	themeOverride: Partial<PaneTheme> | null
}

export function StreamRenderer({ paneId, theme, themeOverride }: StreamRendererProps) {
	const messages = useStore((s) => s.paneStreamMessages.get(paneId))
	const streamText = useStore((s) => s.paneStreamText.get(paneId))
	const scrollRef = useRef<HTMLDivElement>(null)
	const wasAtBottomRef = useRef(true)

	const opacity = themeOverride?.paneOpacity ?? theme.paneOpacity ?? DEFAULT_PANE_OPACITY
	const bg = resolveBackground(themeOverride?.background ?? theme.background, opacity)

	const hasStructured = (messages?.length ?? 0) > 0
	const hasText = (streamText?.length ?? 0) > 0
	const isStreaming = messages?.some((m) => m.streaming) ?? false

	// biome-ignore lint/correctness/useExhaustiveDependencies: messages/streamText intentionally triggers auto-scroll
	useEffect(() => {
		const el = scrollRef.current
		if (!el || !wasAtBottomRef.current) return
		el.scrollTop = el.scrollHeight
	}, [messages, streamText])

	const handleScroll = () => {
		const el = scrollRef.current
		if (!el) return
		wasAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 8
	}

	return (
		<div className="w-full h-full flex flex-col" style={{ backgroundColor: bg }}>
			{hasStructured && messages ? (
				<StructuredView messages={messages} scrollRef={scrollRef} onScroll={handleScroll} />
			) : hasText && streamText ? (
				<RawTextView text={streamText} scrollRef={scrollRef} onScroll={handleScroll} />
			) : (
				<div className="flex-1 flex items-center justify-center text-content-muted text-xs">
					Waiting for agent output...
				</div>
			)}
			<MessageInput paneId={paneId} isStreaming={isStreaming} />
		</div>
	)
}
