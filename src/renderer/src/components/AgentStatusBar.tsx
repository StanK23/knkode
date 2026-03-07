import { memo, useEffect, useState } from 'react'
import { AGENT_LABELS, type AgentType } from '../../../shared/types'
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

function ElapsedTimer({ startTime }: { startTime: number }) {
	const [now, setNow] = useState(Date.now)

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
	const activityLabel = isStreaming
		? 'Working'
		: msgCount > 0
			? 'Idle'
			: isSubprocess
				? 'Starting'
				: 'Running'

	return (
		<div
			role="status"
			aria-live="polite"
			aria-label={`${AGENT_LABELS[agentType]} agent status`}
			className="h-7 flex items-center gap-2 px-2 text-xs bg-sunken border-b border-edge shrink-0 select-none"
		>
			<span className="font-semibold text-accent">{AGENT_LABELS[agentType]}</span>

			<span className={`min-w-0 truncate ${isStreaming ? 'text-accent' : 'text-content-muted'}`}>
				{activityLabel}
			</span>

			<span className="flex-1" />

			{startTime !== undefined && (
				<span className="text-content-muted">
					<ElapsedTimer startTime={startTime} />
				</span>
			)}
		</div>
	)
})
