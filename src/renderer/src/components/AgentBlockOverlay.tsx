import type { Terminal as XTerm } from '@xterm/xterm'
import { memo, useCallback } from 'react'
import type { AgentBlock } from '../lib/agent-parsers/types'
import { useStore } from '../store'
import { AgentBlockSummary } from './AgentBlockSummary'

interface AgentBlockOverlayProps {
	paneId: string
	termRef: React.RefObject<XTerm | null>
}

interface BlockOverlayItemProps {
	block: AgentBlock
	isCollapsed: boolean
	cellHeight: number
	viewportY: number
	viewportRows: number
	onToggle: (blockId: string) => void
}

const BlockOverlayItem = memo(function BlockOverlayItem({
	block,
	isCollapsed,
	cellHeight,
	viewportY,
	viewportRows,
	onToggle,
}: BlockOverlayItemProps) {
	const handleClick = useCallback(() => onToggle(block.id), [block.id, onToggle])

	const top = (block.startLine - viewportY) * cellHeight
	// For streaming blocks (endLine null), extend to bottom of viewport
	const endLine = block.endLine ?? block.startLine + viewportRows
	const height = (endLine - block.startLine + 1) * cellHeight
	const lineCount = endLine - block.startLine + 1
	const viewportHeight = viewportRows * cellHeight

	// Skip blocks outside viewport
	if (top + height < 0 || top > viewportHeight) return null

	if (isCollapsed) {
		return (
			<button
				type="button"
				className="absolute left-0 right-0 flex items-center gap-1 px-1.5 cursor-pointer pointer-events-auto bg-elevated/90 border-0 border-l-2 border-accent hover:bg-overlay/90 text-left"
				style={{ top, height: cellHeight }}
				onClick={handleClick}
				aria-expanded={false}
				aria-label={`Expand ${block.type}${block.metadata.tool ? `: ${block.metadata.tool}` : ''} (${lineCount} lines)`}
			>
				<span className="text-content-muted text-[10px] select-none shrink-0">{'\u25B6'}</span>
				<AgentBlockSummary type={block.type} metadata={block.metadata} lineCount={lineCount} />
			</button>
		)
	}

	return (
		<button
			type="button"
			className="absolute left-0 w-4 flex items-start justify-center pt-px cursor-pointer pointer-events-auto hover:bg-overlay/50 rounded-sm bg-transparent border-none"
			style={{ top, height }}
			onClick={handleClick}
			aria-expanded={true}
			aria-label={`Collapse ${block.type}${block.metadata.tool ? `: ${block.metadata.tool}` : ''} (${lineCount} lines)`}
		>
			<span className="text-content-muted text-[10px] select-none">{'\u25BC'}</span>
		</button>
	)
})

function getTermInfo(term: XTerm | null) {
	if (!term) return null
	const el = term.element
	if (!el) return null
	const viewport = el.querySelector('.xterm-viewport')
	if (!viewport) return null
	if (term.rows === 0) return null
	const cellHeight = viewport.clientHeight / term.rows
	return {
		cellHeight,
		viewportY: term.buffer.active.viewportY,
		viewportRows: term.rows,
	}
}

export function AgentBlockOverlay({ paneId, termRef }: AgentBlockOverlayProps) {
	const blocks = useStore((s) => s.paneAgentBlocks.get(paneId))
	const collapsedIds = useStore((s) => s.collapsedBlockIds.get(paneId))
	const toggleBlockCollapse = useStore((s) => s.toggleBlockCollapse)

	const handleToggle = useCallback(
		(blockId: string) => toggleBlockCollapse(paneId, blockId),
		[paneId, toggleBlockCollapse],
	)

	// Recompute on every render since viewport scroll changes frequently
	const termInfo = getTermInfo(termRef.current)

	if (!blocks?.length || !termInfo) return null

	return (
		<div className="absolute inset-1.5 pointer-events-none overflow-hidden z-[5]">
			{blocks.map((block) => (
				<BlockOverlayItem
					key={block.id}
					block={block}
					isCollapsed={collapsedIds?.has(block.id) ?? false}
					cellHeight={termInfo.cellHeight}
					viewportY={termInfo.viewportY}
					viewportRows={termInfo.viewportRows}
					onToggle={handleToggle}
				/>
			))}
		</div>
	)
}
