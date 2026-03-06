import type { AgentBlockType } from '../lib/agent-parsers/types'

const TYPE_ICONS: Record<AgentBlockType, string> = {
	'tool-call': '\u25B6',
	'tool-result': '\u25C0',
	thinking: '\u2026',
	diff: '\u0394',
	text: '\u00B6',
	status: '\u25CF',
	permission: '\u26A0',
	error: '\u2717',
	unknown: '\u2500',
}

const TYPE_COLORS: Record<AgentBlockType, string> = {
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

interface AgentBlockSummaryProps {
	type: AgentBlockType
	metadata: Readonly<Record<string, string>>
	lineCount: number
}

export function AgentBlockSummary({ type, metadata, lineCount }: AgentBlockSummaryProps) {
	const icon = TYPE_ICONS[type]
	const colorClass = TYPE_COLORS[type]
	const tool = metadata.tool
	const label = tool ?? type

	return (
		<span className="flex items-center gap-1.5 text-[11px] leading-none truncate">
			<span className={colorClass}>{icon}</span>
			<span className="font-medium text-content">{label}</span>
			<span className="text-content-muted">
				{lineCount} line{lineCount !== 1 ? 's' : ''}
			</span>
		</span>
	)
}
