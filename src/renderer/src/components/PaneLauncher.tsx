import { useCallback, useEffect, useState } from 'react'
import {
	AGENT_COMMANDS,
	AGENT_LABELS,
	type AgentType,
	LAUNCHABLE_AGENTS,
	type LaunchMode,
} from '../../../shared/types'
import { useStore } from '../store'
import { getEffectiveCwd } from '../store'

interface PaneLauncherProps {
	workspaceId: string
	paneId: string
}

export function PaneLauncher({ workspaceId, paneId }: PaneLauncherProps) {
	const setLaunchMode = useStore((s) => s.setLaunchMode)
	const updatePaneConfig = useStore((s) => s.updatePaneConfig)
	const workspace = useStore((s) => s.workspaces.find((w) => w.id === workspaceId))
	const homeDir = useStore((s) => s.homeDir)
	const paneConfig = workspace?.panes[paneId]
	const effectiveCwd = workspace ? getEffectiveCwd(workspace, paneId, homeDir) : homeDir

	const [cwdDisplay, setCwdDisplay] = useState(effectiveCwd)

	useEffect(() => {
		setCwdDisplay(effectiveCwd)
	}, [effectiveCwd])

	const handlePickFolder = useCallback(async () => {
		const folder = await window.api.pickFolder()
		if (folder) {
			setCwdDisplay(folder)
			updatePaneConfig(workspaceId, paneId, { cwd: folder })
		}
	}, [workspaceId, paneId, updatePaneConfig])

	const handleLaunch = useCallback(
		(mode: LaunchMode) => {
			setLaunchMode(workspaceId, paneId, mode)
		},
		[workspaceId, paneId, setLaunchMode],
	)

	// Keyboard shortcuts: 1-N for agents, T for terminal
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.metaKey || e.ctrlKey || e.altKey) return
			if (e.key === 't' || e.key === 'T') {
				e.preventDefault()
				handleLaunch('terminal')
				return
			}
			const idx = Number.parseInt(e.key, 10) - 1
			if (idx >= 0 && idx < LAUNCHABLE_AGENTS.length) {
				e.preventDefault()
				handleLaunch(LAUNCHABLE_AGENTS[idx])
			}
		}
		window.addEventListener('keydown', handler)
		return () => window.removeEventListener('keydown', handler)
	}, [handleLaunch])

	if (!workspace || !paneConfig) return null

	const agentFlags = workspace.agentFlags ?? {}

	return (
		<div className="flex flex-col items-center justify-center h-full w-full select-none gap-6 p-8">
			{/* CWD selector */}
			<button
				type="button"
				onClick={handlePickFolder}
				className="flex items-center gap-2 text-xs text-content-secondary hover:text-content transition-colors cursor-pointer rounded-sm px-3 py-1.5 border border-edge hover:border-accent"
				title="Click to change working directory"
			>
				<span className="text-content-muted">cwd:</span>
				<span className="font-mono truncate max-w-80">{cwdDisplay}</span>
			</button>

			{/* Agent buttons */}
			<div className="flex flex-col gap-3 w-full max-w-xs">
				{LAUNCHABLE_AGENTS.map((agent, idx) => (
					<AgentButton
						key={agent}
						agent={agent}
						shortcut={String(idx + 1)}
						flags={agentFlags[agent]}
						onLaunch={() => handleLaunch(agent)}
					/>
				))}

				{/* Terminal button */}
				<button
					type="button"
					onClick={() => handleLaunch('terminal')}
					className="flex items-center gap-3 rounded-sm border border-edge hover:border-accent px-4 py-3 text-left transition-colors cursor-pointer group"
				>
					<span className="text-sm font-medium text-content group-hover:text-accent transition-colors">
						Terminal
					</span>
					<span className="flex-1" />
					<kbd className="text-[10px] text-content-muted border border-edge rounded px-1.5 py-0.5">
						T
					</kbd>
				</button>
			</div>
		</div>
	)
}

function AgentButton({
	agent,
	shortcut,
	flags,
	onLaunch,
}: {
	agent: AgentType
	shortcut: string
	flags?: string
	onLaunch: () => void
}) {
	const label = AGENT_LABELS[agent]
	const command = AGENT_COMMANDS[agent] ?? agent

	return (
		<button
			type="button"
			onClick={onLaunch}
			className="flex items-center gap-3 rounded-sm border border-edge hover:border-accent px-4 py-3 text-left transition-colors cursor-pointer group"
		>
			<div className="flex flex-col min-w-0">
				<span className="text-sm font-medium text-content group-hover:text-accent transition-colors">
					{label}
				</span>
				<span className="text-[10px] text-content-muted truncate">
					{command}
					{flags?.trim() ? ` ${flags.trim()}` : ''}
				</span>
			</div>
			<span className="flex-1" />
			<kbd className="text-[10px] text-content-muted border border-edge rounded px-1.5 py-0.5">
				{shortcut}
			</kbd>
		</button>
	)
}
