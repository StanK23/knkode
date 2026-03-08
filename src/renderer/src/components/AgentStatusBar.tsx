import { memo, useEffect, useMemo, useState } from 'react'
import { AGENT_LABELS, type AgentType } from '../../../shared/types'
import { formatTokens } from '../lib/format'
import type { StreamMessage } from '../lib/agent-renderers/types'
import { useStore } from '../store'

/** Maximum context window size assumed for Claude models (tokens).
 *  Hardcoded for current Claude models — may need a model-to-context map in the future. */
const CONTEXT_WINDOW = 200_000

function formatElapsed(ms: number): string {
	const totalSeconds = Math.floor(Math.max(0, ms) / 1000)
	if (totalSeconds < 60) return `${totalSeconds}s`
	const minutes = Math.floor(totalSeconds / 60)
	const seconds = totalSeconds % 60
	if (minutes < 60) return `${minutes}m ${String(seconds).padStart(2, '0')}s`
	const hours = Math.floor(minutes / 60)
	const remainMinutes = minutes % 60
	return `${hours}h ${String(remainMinutes).padStart(2, '0')}m`
}

/** Extract a short model label from a model ID string.
 *  e.g. "claude-sonnet-4-6-20260301" → "sonnet 4.6" */
export function shortModelName(model: string): string {
	const match = model.match(/^claude-([a-z]+)-(\d+)-(\d{1,2})(?:-|$)/)
	if (match) return `${match[1]} ${match[2]}.${match[3]}`
	return model.replace(/^claude-/, '')
}

function ElapsedTimer({ startTime }: { startTime: number }) {
	const [now, setNow] = useState(() => Date.now())

	useEffect(() => {
		const interval = setInterval(() => setNow(Date.now()), 1000)
		return () => clearInterval(interval)
	}, [])

	return <span className="tabular-nums">{formatElapsed(now - startTime)}</span>
}

/** Derive model, context tokens, and per-response tokens from messages. */
function useMessageStats(messages: readonly StreamMessage[] | undefined) {
	return useMemo(() => {
		let latestModel: string | undefined
		let contextTokens = 0
		let responseInput = 0
		let responseOutput = 0

		if (messages) {
			for (const msg of messages) {
				if (msg.model) latestModel = msg.model
				// Track latest assistant message usage as context gauge
				if (msg.role === 'assistant' && msg.usage) {
					contextTokens = msg.usage.inputTokens
					responseInput = msg.usage.inputTokens
					responseOutput = msg.usage.outputTokens
				}
			}
		}

		const contextPct =
			contextTokens > 0 ? Math.min(100, Math.round((contextTokens / CONTEXT_WINDOW) * 100)) : 0

		return { model: latestModel, contextTokens, contextPct, responseInput, responseOutput }
	}, [messages])
}

// ── Static Status Bar (always visible) ──────────────────────────────────────

interface AgentStatusBarProps {
	paneId: string
	agentType: AgentType
}

/** Persistent bar above input — shows model name and context window gauge. */
export const AgentStatusBar = memo(function AgentStatusBar({
	paneId,
	agentType,
}: AgentStatusBarProps) {
	const messages = useStore((s) => s.paneStreamMessages.get(paneId))
	const { model, contextTokens, contextPct } = useMessageStats(messages)

	return (
		<output
			aria-label={`${AGENT_LABELS[agentType]} agent status`}
			className="h-6 flex items-center gap-2 px-3 text-[10px] border-t border-edge shrink-0 select-none"
		>
			<span className="font-semibold text-accent">{AGENT_LABELS[agentType]}</span>

			{model && <span className="text-content-muted/60">{shortModelName(model)}</span>}

			<span className="flex-1" />

			{contextTokens > 0 && (
				<span
					className="text-content-muted/50 tabular-nums"
					title={`${contextTokens.toLocaleString()} / ${CONTEXT_WINDOW.toLocaleString()} context tokens (${contextPct}%)`}
				>
					{formatTokens(contextTokens)}/{formatTokens(CONTEXT_WINDOW)} ctx
				</span>
			)}
		</output>
	)
})

// ── Dynamic Streaming Bar (visible while agent is responding) ───────────────

interface StreamingBarProps {
	paneId: string
	onStop: () => void
}

/** Bar visible while the agent is responding — shows per-response tokens, timer, stop button. */
export const StreamingBar = memo(function StreamingBar({ paneId, onStop }: StreamingBarProps) {
	const startTime = useStore((s) => s.paneAgentStartTimes.get(paneId))
	const messages = useStore((s) => s.paneStreamMessages.get(paneId))
	const { responseInput, responseOutput } = useMessageStats(messages)

	return (
		<div className="h-6 flex items-center gap-2 px-3 text-[10px] border-t border-edge shrink-0 select-none">
			<span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse motion-reduce:animate-none shrink-0" />

			<span className="flex-1" />

			{responseInput + responseOutput > 0 && (
				<span
					className="text-content-muted/60 tabular-nums"
					title={`${responseInput.toLocaleString()} input + ${responseOutput.toLocaleString()} output tokens`}
				>
					{formatTokens(responseInput)}↑ {formatTokens(responseOutput)}↓
				</span>
			)}

			{startTime !== undefined && (
				<span className="text-content-muted tabular-nums">
					<ElapsedTimer startTime={startTime} />
				</span>
			)}

			<button
				type="button"
				onClick={onStop}
				className="text-[10px] px-1.5 py-0.5 rounded-sm cursor-pointer border border-edge bg-overlay hover:bg-overlay-active text-content-secondary focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
			>
				Stop
			</button>
		</div>
	)
})
