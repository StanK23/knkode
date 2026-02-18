import { Allotment } from 'allotment'
import { useCallback, useMemo } from 'react'
import 'allotment/dist/style.css'
import type { LayoutNode, PaneConfig, Workspace } from '../../../shared/types'
import { isLayoutBranch } from '../../../shared/types'
import { getPaneIdsInOrder, useStore } from '../store'
import { Pane } from './Pane'

interface PaneAreaProps {
	workspace: Workspace
}

export function PaneArea({ workspace }: PaneAreaProps) {
	const splitPane = useStore((s) => s.splitPane)
	const closePane = useStore((s) => s.closePane)
	const updatePaneConfig = useStore((s) => s.updatePaneConfig)
	const focusedPaneId = useStore((s) => s.focusedPaneId)
	const focusGeneration = useStore((s) => s.focusGeneration)
	const setFocusedPane = useStore((s) => s.setFocusedPane)
	const paneCount = Object.keys(workspace.panes).length
	const paneIndexMap = useMemo(() => {
		const order = getPaneIdsInOrder(workspace.layout.tree)
		return new Map(order.map((id, i) => [id, i + 1]))
	}, [workspace.layout.tree])

	const handleUpdateConfig = useCallback(
		(paneId: string, updates: Partial<PaneConfig>) => {
			updatePaneConfig(workspace.id, paneId, updates)
		},
		[workspace.id, updatePaneConfig],
	)

	const handleSplit = useCallback(
		(paneId: string, direction: 'horizontal' | 'vertical') => {
			splitPane(workspace.id, paneId, direction)
		},
		[workspace.id, splitPane],
	)

	const handleClose = useCallback(
		(paneId: string) => {
			closePane(workspace.id, paneId)
		},
		[workspace.id, closePane],
	)

	const renderNode = (node: LayoutNode): React.ReactNode => {
		if (!isLayoutBranch(node)) {
			const config = workspace.panes[node.paneId]
			if (!config) return null
			return (
				<Pane
					key={node.paneId}
					paneId={node.paneId}
					paneIndex={paneIndexMap.get(node.paneId) ?? 1}
					workspaceId={workspace.id}
					config={config}
					workspaceTheme={workspace.theme}
					onUpdateConfig={handleUpdateConfig}
					// iTerm2 convention: "Split Horizontal" = horizontal divider = vertical stacking
					onSplitHorizontal={(id) => handleSplit(id, 'vertical')}
					// iTerm2 convention: "Split Vertical" = vertical divider = horizontal (side-by-side)
					onSplitVertical={(id) => handleSplit(id, 'horizontal')}
					onClose={handleClose}
					canClose={paneCount > 1}
					isFocused={focusedPaneId === node.paneId}
					focusGeneration={focusGeneration}
					onFocus={setFocusedPane}
				/>
			)
		}

		const isVertical = node.direction === 'vertical'

		return (
			<Allotment
				vertical={isVertical}
				key={node.children
					.map((c) => (isLayoutBranch(c) ? `b${c.children.length}` : c.paneId))
					.join('-')}
			>
				{node.children.map((child, i) => (
					<Allotment.Pane
						key={isLayoutBranch(child) ? `branch-${i}` : child.paneId}
						preferredSize={`${child.size}%`}
					>
						{renderNode(child)}
					</Allotment.Pane>
				))}
			</Allotment>
		)
	}

	return <div className="flex-1 overflow-hidden">{renderNode(workspace.layout.tree)}</div>
}
