import { memo, useEffect, useMemo, useState } from 'react'
import { AGENT_LABELS, type AgentType } from '../../../shared/types'
import { formatTokens } from '../lib/format'
import { useStore } from '../store'

/** Default context window size for Claude models. */
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
	// Match "claude-{family}-{major}-{minor}" where minor is 1-2 digits
	// Avoids mismatching date suffixes like "claude-sonnet-4-20250514"
	const match = model.match(/^claude-([a-z]+)-(\d+)-(\d{1,2})(?:-|$)/)
	if (match) return `${match[1]} ${match[2]}.${match[3]}`
	// Fallback: strip "claude-" prefix if present
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

interface AgentStatusBarProps {
	paneId: string
	agentType: AgentType
}

export const AgentStatusBar = memo(function AgentStatusBar({
	paneId,
	agentType,
}: AgentStatusBarProps) {
	const startTime = useStore((s) => s.paneAgentStartTimes.get(paneId))
	const messages = useStore((s) => s.paneStreamMessages.get(paneId))
	const isSubprocess = useStore((s) => s.activeAgentIds.has(paneId))

	const isStreaming = messages?.some((m) => m.streaming) ?? false
	const msgCount = messages?.length ?? 0

	// Derive model name, cumulative tokens, and latest context usage from messages
	const { model, inputTokens, outputTokens, contextTokens } = useMemo(() => {
		let latestModel: string | undefined
		let input = 0
		let output = 0
		let context = 0
		if (messages) {
			for (const msg of messages) {
				if (msg.model) latestModel = msg.model
				if (msg.usage) {
					input += msg.usage.inputTokens
					output += msg.usage.outputTokens
				}
			}
			// Latest assistant message's inputTokens = current context window usage
			for (let i = messages.length - 1; i >= 0; i--) {
				if (messages[i].role === 'assistant' && messages[i].usage) {
					context = messages[i].usage!.inputTokens
					break
				}
			}
		}
		return { model: latestModel, inputTokens: input, outputTokens: output, contextTokens: context }
	}, [messages])

	let activityLabel: string
	if (isStreaming) activityLabel = 'Working'
	else if (msgCount > 0) activityLabel = 'Idle'
	else if (isSubprocess) activityLabel = 'Starting'
	else activityLabel = 'Running'

	const contextPct =
		contextTokens > 0 ? Math.min(100, Math.round((contextTokens / CONTEXT_WINDOW) * 100)) : 0

	return (
		<output
			aria-label={`${AGENT_LABELS[agentType]} agent status`}
			className="h-6 flex items-center gap-2 px-3 text-[10px] border-t border-edge shrink-0 select-none"
		>
			<span className="font-semibold text-accent">{AGENT_LABELS[agentType]}</span>

			{model && <span className="text-content-muted/60">{shortModelName(model)}</span>}

			<span className={`min-w-0 truncate ${isStreaming ? 'text-accent' : 'text-content-muted'}`}>
				{activityLabel}
			</span>

			<span className="flex-1" />

			{contextTokens > 0 && (
				<span
					className="text-content-muted/50 tabular-nums"
					title={`${contextTokens.toLocaleString()} / ${CONTEXT_WINDOW.toLocaleString()} context tokens (${contextPct}%)`}
				>
					{formatTokens(contextTokens)}/{formatTokens(CONTEXT_WINDOW)} ctx
				</span>
			)}

			{inputTokens + outputTokens > 0 && (
				<span
					className="text-content-muted/60 tabular-nums"
					title={`${inputTokens.toLocaleString()} input + ${outputTokens.toLocaleString()} output tokens`}
				>
					{formatTokens(inputTokens)}↑ {formatTokens(outputTokens)}↓
				</span>
			)}

			{startTime !== undefined && (
				<span className="text-content-muted">
					<ElapsedTimer startTime={startTime} />
				</span>
			)}
		</output>
	)
})
