import { Allotment } from 'allotment'
import { useCallback } from 'react'
import 'allotment/dist/style.css'
import type { LayoutNode, PaneConfig, Workspace } from '../../../shared/types'
import { isLayoutBranch } from '../../../shared/types'
import { useStore } from '../store'
import { Pane } from './Pane'

interface PaneAreaProps {
	workspace: Workspace
}

export function PaneArea({ workspace }: PaneAreaProps) {
	const updateWorkspace = useStore((s) => s.updateWorkspace)
	const updatePaneConfig = useStore((s) => s.updatePaneConfig)
	const paneCount = Object.keys(workspace.panes).length

	const handleUpdateConfig = useCallback(
		(paneId: string, updates: Partial<PaneConfig>) => {
			updatePaneConfig(workspace.id, paneId, updates)
		},
		[workspace.id, updatePaneConfig],
	)

	const handleSplit = useCallback(
		(paneId: string, direction: 'horizontal' | 'vertical') => {
			const newPaneId = crypto.randomUUID()
			const sourcePane = workspace.panes[paneId]
			if (!sourcePane) return

			const newPane: PaneConfig = {
				label: 'terminal',
				cwd: sourcePane.cwd,
				startupCommand: null,
				themeOverride: null,
			}

			const replaceInTree = (node: LayoutNode): LayoutNode => {
				if (isLayoutBranch(node)) {
					return {
						...node,
						children: node.children.map(replaceInTree),
					}
				}
				if (node.paneId === paneId) {
					return {
						direction,
						size: node.size,
						children: [
							{ paneId, size: 50 },
							{ paneId: newPaneId, size: 50 },
						],
					}
				}
				return node
			}

			updateWorkspace({
				...workspace,
				layout: {
					type: 'custom',
					tree: replaceInTree(workspace.layout.tree),
				},
				panes: {
					...workspace.panes,
					[newPaneId]: newPane,
				},
			})
		},
		[workspace, updateWorkspace],
	)

	const handleClose = useCallback(
		(paneId: string) => {
			// PTY cleanup is handled by Pane's unmount effect
			const removeFromTree = (node: LayoutNode): LayoutNode | null => {
				if (!isLayoutBranch(node)) {
					return node.paneId === paneId ? null : node
				}
				const remaining = node.children
					.map(removeFromTree)
					.filter((n): n is LayoutNode => n !== null)
				if (remaining.length === 0) return null
				if (remaining.length === 1) return { ...remaining[0], size: node.size }
				return { ...node, children: remaining }
			}

			const newTree = removeFromTree(workspace.layout.tree)
			if (!newTree) return

			const { [paneId]: _, ...remainingPanes } = workspace.panes

			updateWorkspace({
				...workspace,
				layout: { type: 'custom', tree: newTree },
				panes: remainingPanes,
			})
		},
		[workspace, updateWorkspace],
	)

	const renderNode = (node: LayoutNode): React.ReactNode => {
		if (!isLayoutBranch(node)) {
			const config = workspace.panes[node.paneId]
			if (!config) return null
			return (
				<Pane
					key={node.paneId}
					paneId={node.paneId}
					config={config}
					workspaceTheme={workspace.theme}
					onUpdateConfig={handleUpdateConfig}
					onSplitHorizontal={(id) => handleSplit(id, 'horizontal')}
					onSplitVertical={(id) => handleSplit(id, 'vertical')}
					onClose={handleClose}
					canClose={paneCount > 1}
				/>
			)
		}

		const isVertical = node.direction === 'vertical'

		return (
			<Allotment
				vertical={isVertical}
				key={JSON.stringify(node.children.map((c) => (isLayoutBranch(c) ? 'branch' : c.paneId)))}
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

	return <div style={{ flex: 1, overflow: 'hidden' }}>{renderNode(workspace.layout.tree)}</div>
}
