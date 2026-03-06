import { useEffect, useState } from 'react'
import { AGENT_LABELS, type AgentType } from '../../../shared/types'
import type { AgentBlockType } from '../lib/agent-parsers/types'
import { useStore } from '../store'

const ACTIVITY_LABELS: Record<AgentBlockType, string> = {
	'tool-call': 'Running tool',
	'tool-result': 'Tool result',
	thinking: 'Thinking',
	diff: 'Applying diff',
	text: 'Writing',
	status: 'Working',
	permission: 'Needs approval',
	error: 'Error',
	unknown: 'Working',
}

const ACTIVITY_COLORS: Record<AgentBlockType, string> = {
	'tool-call': 'text-accent',
	'tool-result': 'text-accent',
	thinking: 'text-content-muted',
	diff: 'text-green-400',
	text: 'text-content',
	status: 'text-content-muted',
	permission: 'text-yellow-400',
	error: 'text-danger',
	unknown: 'text-content-muted',
}

function formatElapsed(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000)
	if (totalSeconds < 60) return `${totalSeconds}s`
	const minutes = Math.floor(totalSeconds / 60)
	const seconds = totalSeconds % 60
	if (minutes < 60) return `${minutes}m ${seconds}s`
	const hours = Math.floor(minutes / 60)
	const remainMinutes = minutes % 60
	return `${hours}h ${remainMinutes}m`
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

export function AgentStatusBar({ paneId, agentType }: AgentStatusBarProps) {
	const blocks = useStore((s) => s.paneAgentBlocks.get(paneId))
	const startTime = useStore((s) => s.paneAgentStartTimes.get(paneId))

	const blockCount = blocks?.length ?? 0
	const lastBlock = blocks?.[blocks.length - 1]
	const lastBlockType = lastBlock?.type ?? 'unknown'
	const isStreaming = lastBlock?.endLine === null

	const activityLabel = isStreaming
		? lastBlock?.type === 'tool-call' && lastBlock.metadata.tool
			? `${ACTIVITY_LABELS['tool-call']}: ${lastBlock.metadata.tool}`
			: ACTIVITY_LABELS[lastBlockType]
		: blockCount > 0
			? 'Idle'
			: 'Starting'
	const activityColor = isStreaming ? ACTIVITY_COLORS[lastBlockType] : 'text-content-muted'

	return (
		<div className="h-5 flex items-center gap-2 px-2 text-[10px] bg-sunken border-b border-edge shrink-0 select-none">
			<span className="font-semibold text-accent">{AGENT_LABELS[agentType]}</span>

			<span className={`truncate ${activityColor}`}>{activityLabel}</span>

			<span className="flex-1" />

			{blockCount > 0 && (
				<span className="text-content-muted">
					{blockCount} block{blockCount !== 1 ? 's' : ''}
				</span>
			)}

			{startTime && (
				<span className="text-content-muted">
					<ElapsedTimer startTime={startTime} />
				</span>
			)}
		</div>
	)
}
