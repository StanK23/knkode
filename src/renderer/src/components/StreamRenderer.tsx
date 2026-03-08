import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_PANE_OPACITY, type AgentType, type PaneTheme } from '../../../shared/types'
import type {
	BlockUsage,
	ContentBlock,
	StreamMessage,
	TextBlock,
	ThinkingBlock,
	ToolResultBlock,
	ToolUseBlock,
} from '../lib/agent-renderers/types'
import { formatTokens } from '../lib/format'
import { useStore } from '../store'
import { AgentStatusBar } from './AgentStatusBar'
import { resolveBackground } from '../utils/colors'

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Extract a short summary of tool input for inline display, like the TUI.
 *  e.g. Read → "src/file.ts", Bash → "git status", Grep → "pattern" */
function toolSummary(block: ToolUseBlock): string {
	if (!block.inputJson) return ''
	try {
		const input = JSON.parse(block.inputJson) as Record<string, unknown>
		const val =
			input.file_path ??
			input.command ??
			input.pattern ??
			input.query ??
			input.path ??
			input.content?.toString().slice(0, 60) ??
			input.url ??
			input.description ??
			''
		const str = String(val)
		return str.length > 120 ? `${str.slice(0, 120)}…` : str
	} catch {
		return ''
	}
}

/**
 * A tool call paired with its result (matched by toolUseId).
 * Result may be absent if the tool is still running.
 */
interface ToolPair {
	call: ToolUseBlock
	result?: ToolResultBlock
}

/** Each block becomes its own visual segment — one bubble per tool call. */
type BlockSegment =
	| { kind: 'text'; block: TextBlock }
	| { kind: 'thinking'; block: ThinkingBlock }
	| { kind: 'tool'; pair: ToolPair }

function segmentBlocks(blocks: readonly ContentBlock[]): BlockSegment[] {
	// Collect all tool_results by toolUseId for O(1) lookup
	const resultMap = new Map<string, ToolResultBlock>()
	for (const block of blocks) {
		if (block.type === 'tool_result' && block.toolUseId) {
			resultMap.set(block.toolUseId, block)
		}
	}

	const segments: BlockSegment[] = []
	for (const block of blocks) {
		switch (block.type) {
			case 'tool_use':
				segments.push({
					kind: 'tool',
					pair: { call: block, result: resultMap.get(block.id) },
				})
				break
			case 'tool_result':
				// Skip — attached to its tool_use via resultMap
				break
			case 'thinking':
				segments.push({ kind: 'thinking', block })
				break
			case 'text':
				segments.push({ kind: 'text', block })
				break
		}
	}
	return segments
}

// ── Token Badge ─────────────────────────────────────────────────────────────

function TokenBadge({ usage }: { usage?: BlockUsage }) {
	if (!usage || usage.outputTokens === 0) return null
	const n = usage.outputTokens
	return (
		<span
			className="text-[9px] text-content-muted/40 tabular-nums ml-auto shrink-0"
			title={`${n.toLocaleString()} output tokens`}
		>
			{formatTokens(n)} tok
		</span>
	)
}

// ── Block Views (TUI-style) ────────────────────────────────────────────────

function TextBubble({ block }: { block: TextBlock }) {
	if (!block.text) return null
	return (
		<div className="py-1 flex justify-start">
			<div className="max-w-[85%] rounded-lg border border-content-muted/20 bg-overlay/60 px-3 py-1.5">
				<pre className="whitespace-pre-wrap break-words m-0 text-content text-xs leading-relaxed">
					{block.text}
				</pre>
				<TokenBadge usage={block.usage} />
			</div>
		</div>
	)
}

function ThinkingBlockView({ block, streaming }: { block: ThinkingBlock; streaming: boolean }) {
	const [expanded, setExpanded] = useState(false)

	if (!block.text && !streaming) return null

	return (
		<div className="py-0.5">
			<button
				type="button"
				onClick={() => setExpanded((e) => !e)}
				aria-expanded={expanded}
				className="bg-transparent border-none cursor-pointer text-content-muted/50 text-[10px] flex items-center gap-1 p-0 hover:text-content-muted focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
			>
				{streaming && (
					<span className="inline-block w-1 h-1 rounded-full bg-content-muted/40 animate-pulse motion-reduce:animate-none shrink-0" />
				)}
				<span className="italic">
					{streaming
						? 'thinking...'
						: `thought for ${Math.max(1, Math.round((block.text?.length ?? 0) / 200))}s`}
				</span>
				{!streaming && <span className="text-[9px]">{expanded ? '\u25BE' : '\u25B8'}</span>}
				<TokenBadge usage={block.usage} />
			</button>
			{expanded && (
				<div className="ml-4 mt-1 pl-2.5 border-l border-content-muted/20">
					<pre className="whitespace-pre-wrap break-words m-0 text-content-muted/60 text-[10px] leading-relaxed max-h-[200px] overflow-y-auto">
						{block.text}
					</pre>
				</div>
			)}
		</div>
	)
}

/** A single tool call — header + result inside */
function ToolBlock({
	pair,
	streaming,
}: {
	pair: ToolPair
	streaming: boolean
}) {
	const [inputExpanded, setInputExpanded] = useState(false)
	const [resultExpanded, setResultExpanded] = useState(false)
	const { call, result } = pair
	const summary = !streaming ? toolSummary(call) : ''

	let displayJson = ''
	if (inputExpanded && call.inputJson) {
		try {
			if (call.inputJson.length <= 100_000) {
				displayJson = JSON.stringify(JSON.parse(call.inputJson), null, 2)
			} else {
				displayJson = call.inputJson
			}
		} catch {
			displayJson = call.inputJson
		}
	}

	const hasResult = result?.content
	const isShortResult = hasResult && result.content.length < 200
	const isLongResult = hasResult && !isShortResult

	return (
		<div className="py-1 flex justify-start">
			<div className="max-w-[90%] rounded-lg border border-accent/15 bg-accent/5 px-2.5 py-1.5">
				{/* Tool call header */}
				<button
					type="button"
					onClick={() => setInputExpanded((e) => !e)}
					aria-expanded={inputExpanded}
					className="bg-transparent border-none cursor-pointer text-left p-0 flex items-baseline gap-1.5 hover:opacity-80 focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none max-w-full"
				>
					<span className="text-[9px] text-content-muted shrink-0 translate-y-px">
						{inputExpanded ? '\u25BE' : '\u25B8'}
					</span>
					<span className="text-accent text-[11px] font-semibold shrink-0">
						{call.name || 'tool'}
					</span>
					{streaming && (
						<span className="text-content-muted text-[10px] italic shrink-0">running...</span>
					)}
					{summary && (
						<span className="text-content-secondary text-[11px] truncate">{summary}</span>
					)}
					<TokenBadge usage={call.usage} />
				</button>

				{/* Expanded tool input JSON */}
				{inputExpanded && displayJson && (
					<pre className="whitespace-pre-wrap break-words m-0 ml-3 mt-0.5 mb-1 text-content-muted text-[10px] leading-relaxed max-h-[200px] overflow-y-auto">
						{displayJson}
					</pre>
				)}

				{/* Result content — inline for short, collapsible for long */}
				{isShortResult && (
					<pre
						className={`whitespace-pre-wrap break-words m-0 ml-3 mt-0.5 text-[10px] leading-relaxed ${
							result.isError ? 'text-red-400' : 'text-content-muted/70'
						}`}
					>
						{result.content}
					</pre>
				)}
				{isLongResult && (
					<div className="ml-3 mt-0.5">
						<button
							type="button"
							onClick={() => setResultExpanded((e) => !e)}
							aria-expanded={resultExpanded}
							className="bg-transparent border-none cursor-pointer p-0 flex items-center gap-1 hover:opacity-80 focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
						>
							<span className="text-[9px] text-content-muted">
								{resultExpanded ? '\u25BE' : '\u25B8'}
							</span>
							<span
								className={`text-[10px] ${result.isError ? 'text-red-400' : 'text-content-muted/70'}`}
							>
								{result.content.length} chars{result.isError ? ' (error)' : ''}
							</span>
						</button>
						{resultExpanded && (
							<pre
								className={`whitespace-pre-wrap break-words m-0 mt-0.5 text-[10px] leading-relaxed max-h-[300px] overflow-y-auto ${
									result.isError ? 'text-red-400' : 'text-content-muted'
								}`}
							>
								{result.content}
							</pre>
						)}
					</div>
				)}
			</div>
		</div>
	)
}

// ── Message View ────────────────────────────────────────────────────────────

const UserMessage = memo(function UserMessage({ message }: { message: StreamMessage }) {
	const text = message.blocks
		.filter((b): b is TextBlock => b.type === 'text')
		.map((b) => b.text)
		.join('\n')
	if (!text) return null
	return (
		<div className="py-1 px-3 flex justify-end">
			<div className="max-w-[80%] rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5">
				<pre className="whitespace-pre-wrap break-words m-0 text-content text-xs leading-relaxed">
					{text}
				</pre>
			</div>
		</div>
	)
})

const AssistantMessage = memo(function AssistantMessage({ message }: { message: StreamMessage }) {
	const segments = segmentBlocks(message.blocks)

	return (
		<div className="py-1 px-3 [content-visibility:auto] [contain-intrinsic-height:auto_40px]">
			{message.streaming && segments.length === 0 && (
				<span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse motion-reduce:animate-none" />
			)}
			{segments.map((seg, i) => {
				const isLast = i === segments.length - 1
				const key = seg.kind === 'tool' ? seg.pair.call.id || `tool-${i}` : `${seg.kind}-${i}`
				switch (seg.kind) {
					case 'text':
						return <TextBubble key={key} block={seg.block} />
					case 'thinking':
						return (
							<ThinkingBlockView
								key={key}
								block={seg.block}
								streaming={message.streaming && isLast}
							/>
						)
					case 'tool':
						return (
							<ToolBlock
								key={key}
								pair={seg.pair}
								streaming={message.streaming && isLast && !seg.pair.result}
							/>
						)
				}
			})}
		</div>
	)
})

const MessageGroup = memo(function MessageGroup({ message }: { message: StreamMessage }) {
	if (message.role === 'user') return <UserMessage message={message} />
	return <AssistantMessage message={message} />
})

// ── Message Input ───────────────────────────────────────────────────────────

function MessageInput({ paneId, isStreaming }: { paneId: string; isStreaming: boolean }) {
	const [input, setInput] = useState('')
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const sendAgentMessage = useStore((s) => s.sendAgentMessage)
	const killAgents = useStore((s) => s.killAgents)
	const isSubprocess = useStore((s) => s.activeAgentIds.has(paneId))

	const handleSubmit = useCallback(() => {
		const trimmed = input.trim()
		if (!trimmed) return
		sendAgentMessage(paneId, trimmed)
		setInput('')
	}, [paneId, input, sendAgentMessage])

	const handleStop = useCallback(() => {
		if (isSubprocess) {
			killAgents([paneId])
		} else {
			window.api.writePty(paneId, '\x03').catch((err) => {
				console.warn('[StreamRenderer] writePty stop failed:', err)
			})
		}
	}, [paneId, isSubprocess, killAgents])

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

	useEffect(() => {
		textareaRef.current?.focus()
	}, [])

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
					aria-label="Message to agent"
					placeholder="Send a message... (Enter to send, Shift+Enter for newline)"
					rows={1}
					className="flex-1 resize-none bg-sunken border border-edge rounded-sm px-2 py-1.5 text-content text-xs leading-relaxed placeholder:text-content-muted/50 focus:outline-none focus:ring-1 focus:ring-accent"
				/>
				<button
					type="button"
					onClick={handleSubmit}
					disabled={!input.trim() || isStreaming}
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

// ── Structured Message View ─────────────────────────────────────────────────

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
	agentType: AgentType
	theme: PaneTheme
	themeOverride: Partial<PaneTheme> | null
}

export function StreamRenderer({ paneId, agentType, theme, themeOverride }: StreamRendererProps) {
	const messages = useStore((s) => s.paneStreamMessages.get(paneId))
	const rawText = useStore((s) => s.paneStreamText.get(paneId))
	const scrollRef = useRef<HTMLDivElement>(null)
	const wasAtBottomRef = useRef(true)
	const rafRef = useRef(0)

	const opacity = themeOverride?.paneOpacity ?? theme.paneOpacity ?? DEFAULT_PANE_OPACITY
	const bg = resolveBackground(themeOverride?.background ?? theme.background, opacity)

	const allMessages = messages ?? []

	const hasStructured = allMessages.length > 0
	const isStreaming = allMessages.some((m) => m.streaming)
	const hasRawOnly = !hasStructured && !!rawText && rawText.length > 0

	// Auto-scroll with rAF to avoid layout thrashing
	// biome-ignore lint/correctness/useExhaustiveDependencies: messages/rawText intentionally trigger auto-scroll
	useEffect(() => {
		const el = scrollRef.current
		if (!el || !wasAtBottomRef.current) return
		cancelAnimationFrame(rafRef.current)
		rafRef.current = requestAnimationFrame(() => {
			el.scrollTop = el.scrollHeight
		})
	}, [messages, rawText])

	const handleScroll = useCallback(() => {
		const el = scrollRef.current
		if (!el) return
		wasAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 8
	}, [])

	return (
		<div className="w-full h-full flex flex-col" style={{ backgroundColor: bg }}>
			{hasStructured ? (
				<StructuredView messages={allMessages} scrollRef={scrollRef} onScroll={handleScroll} />
			) : hasRawOnly ? (
				<div ref={scrollRef} className="flex-1 overflow-y-auto p-3" onScroll={handleScroll}>
					<div className="text-[11px] text-content-muted mb-2">
						Raw output (no JSON stream detected — the agent may have startup errors):
					</div>
					<pre className="whitespace-pre-wrap break-words m-0 text-content-secondary text-xs leading-relaxed">
						{rawText}
					</pre>
				</div>
			) : (
				<div
					ref={scrollRef}
					className="flex-1 flex items-center justify-center text-content-muted text-xs"
				>
					Type a message below to start
				</div>
			)}
			<AgentStatusBar paneId={paneId} agentType={agentType} />
			<MessageInput paneId={paneId} isStreaming={isStreaming} />
		</div>
	)
}
