import { memo, useEffect, useMemo, useState } from 'react'
import { AGENT_LABELS, type AgentType } from '../../../shared/types'
import { formatTokens } from '../lib/format'
import { useStore } from '../store'

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

	// Derive model name and cumulative tokens from messages
	const { model, inputTokens, outputTokens } = useMemo(() => {
		let latestModel: string | undefined
		let input = 0
		let output = 0
		if (messages) {
			for (const msg of messages) {
				if (msg.model) latestModel = msg.model
				if (msg.usage) {
					input += msg.usage.inputTokens
					output += msg.usage.outputTokens
				}
			}
		}
		return { model: latestModel, inputTokens: input, outputTokens: output }
	}, [messages])

	let activityLabel: string
	if (isStreaming) activityLabel = 'Working'
	else if (msgCount > 0) activityLabel = 'Idle'
	else if (isSubprocess) activityLabel = 'Starting'
	else activityLabel = 'Running'

	return (
		<output
			aria-label={`${AGENT_LABELS[agentType]} agent status`}
			className="h-7 flex items-center gap-2 px-2 text-xs bg-sunken border-b border-edge shrink-0 select-none"
		>
			<span className="font-semibold text-accent">{AGENT_LABELS[agentType]}</span>

			{model && <span className="text-content-muted/60 text-[10px]">{shortModelName(model)}</span>}

			<span className={`min-w-0 truncate ${isStreaming ? 'text-accent' : 'text-content-muted'}`}>
				{activityLabel}
			</span>

			<span className="flex-1" />

			{inputTokens + outputTokens > 0 && (
				<span
					className="text-content-muted/60 tabular-nums text-[10px]"
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
