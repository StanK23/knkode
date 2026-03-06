import { memo, useEffect, useState } from 'react'
import { AGENT_LABELS, type AgentType } from '../../../shared/types'
import {
	BLOCK_TYPE_COLORS,
	type AgentBlock,
	type AgentBlockType,
} from '../lib/agent-parsers/types'
import { useStore } from '../store'

const ACTIVITY_LABELS: Record<AgentBlockType, string> = {
	'tool-call': 'Running tool',
	'tool-result': 'Tool result',
	thinking: 'Thinking',
	diff: 'Applying diff',
	text: 'Writing',
	// Both map to 'Working' intentionally — colors differ between status/unknown
	status: 'Working',
	permission: 'Needs approval',
	error: 'Error',
	unknown: 'Working',
}

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

function getActivityLabel(
	isStreaming: boolean,
	lastBlock: AgentBlock | undefined,
	lastBlockType: AgentBlockType,
	blockCount: number,
): string {
	if (!isStreaming) {
		return blockCount > 0 ? 'Idle' : 'Starting'
	}
	if (lastBlock?.type === 'tool-call' && lastBlock.metadata.tool) {
		return `${ACTIVITY_LABELS['tool-call']}: ${lastBlock.metadata.tool}`
	}
	return ACTIVITY_LABELS[lastBlockType]
}

function ElapsedTimer({ startTime }: { startTime: number }) {
	// Lazy initializer — Date.now is called once on mount, not on every render
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
	const blocks = useStore((s) => s.paneAgentBlocks.get(paneId))
	const startTime = useStore((s) => s.paneAgentStartTimes.get(paneId))

	const blockCount = blocks?.length ?? 0
	const lastBlock = blocks?.at(-1)
	const lastBlockType = lastBlock?.type ?? 'unknown'
	const isStreaming = lastBlock?.endLine === null

	const activityLabel = getActivityLabel(isStreaming, lastBlock, lastBlockType, blockCount)
	const activityColor = isStreaming ? BLOCK_TYPE_COLORS[lastBlockType] : 'text-content-muted'

	return (
		<div
			role="status"
			aria-label={`${AGENT_LABELS[agentType]} agent status`}
			className="h-7 flex items-center gap-2 px-2 text-xs bg-sunken border-b border-edge shrink-0 select-none"
		>
			<span className="font-semibold text-accent">{AGENT_LABELS[agentType]}</span>

			<span className={`min-w-0 truncate ${activityColor}`}>{activityLabel}</span>

			<span className="flex-1" />

			{blockCount > 0 && (
				<span className="text-content-muted">
					{blockCount} block{blockCount !== 1 ? 's' : ''}
				</span>
			)}

			{startTime !== undefined && (
				<span className="text-content-muted">
					<ElapsedTimer startTime={startTime} />
				</span>
			)}
		</div>
	)
})
