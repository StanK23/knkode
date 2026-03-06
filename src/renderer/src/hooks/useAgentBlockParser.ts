import type { Terminal as XTerm } from '@xterm/xterm'
import { useEffect, useRef } from 'react'
import type { AgentType } from '../../../shared/types'
import { AgentBlockParser, supportsBlockParsing } from '../lib/agent-block-parser'
import { useStore } from '../store'

const PARSE_INTERVAL_MS = 200

/**
 * Hook that manages an AgentBlockParser for an xterm.js terminal buffer.
 * Called unconditionally on every pane. Internally starts a periodic parsing
 * interval when an agent is detected (via process detection OR launchMode)
 * and the agent supports block parsing.
 * When conditions are not met, any existing blocks are cleared.
 */
export function useAgentBlockParser(paneId: string, termRef: React.RefObject<XTerm | null>): boolean {
	const agentType = useStore((s) => s.paneAgentTypes.get(paneId) ?? null)
	const isAltScreen = useStore((s) => s.altScreenPaneIds.has(paneId))
	const updateAgentBlocks = useStore((s) => s.updateAgentBlocks)

	// Use launchMode as fallback when process detection hasn't fired yet
	const launchAgent = useStore((s) => {
		const ws = s.workspaces.find((w) => paneId in w.panes)
		const mode = ws?.panes[paneId]?.launchMode
		if (mode && mode !== 'terminal') return mode as AgentType
		return null
	})

	const effectiveAgent = agentType ?? launchAgent
	// Agent panes must parse on alt screen — Claude Code's TUI renders there.
	// Only skip alt screen for non-agent panes (vim, less, etc.)
	const shouldParse = effectiveAgent !== null && supportsBlockParsing(effectiveAgent)
	const parserRef = useRef<AgentBlockParser | null>(null)
	const prevBlockCountRef = useRef(0)
	const prevLastEndLineRef = useRef<number | null>(null)
	const prevLastTypeRef = useRef<string | null>(null)
	const prevLastContentRef = useRef<string>('')

	useEffect(() => {
		if (!shouldParse || !effectiveAgent) {
			// Clear blocks when parsing stops
			if (parserRef.current) {
				parserRef.current = null
				updateAgentBlocks(paneId, [])
			}
			prevBlockCountRef.current = 0
			prevLastEndLineRef.current = null
			prevLastTypeRef.current = null
			prevLastContentRef.current = ''
			return
		}

		parserRef.current = new AgentBlockParser(effectiveAgent)

		const interval = setInterval(() => {
			const term = termRef.current
			const parser = parserRef.current
			if (!term || !parser) return

			try {
				const buffer = term.buffer.active
				const lineCount = buffer.length

				parser.update((i) => buffer.getLine(i)?.translateToString(true) ?? '', lineCount)

				const blocks = parser.getBlocks()
				const lastBlock = blocks.length > 0 ? blocks[blocks.length - 1] : null

				// Heuristic: only update store when block count, last block's endLine,
				// type, or content changes.
				if (
					blocks.length !== prevBlockCountRef.current ||
					lastBlock?.endLine !== prevLastEndLineRef.current ||
					lastBlock?.type !== prevLastTypeRef.current ||
					lastBlock?.content !== prevLastContentRef.current
				) {
					prevBlockCountRef.current = blocks.length
					prevLastEndLineRef.current = lastBlock?.endLine ?? null
					prevLastTypeRef.current = lastBlock?.type ?? null
					prevLastContentRef.current = lastBlock?.content ?? ''
					updateAgentBlocks(paneId, blocks)
				}
			} catch (err) {
				console.error(`[agent-parser] Error parsing pane ${paneId}:`, err)
			}
		}, PARSE_INTERVAL_MS)

		return () => {
			clearInterval(interval)
			parserRef.current = null
			prevBlockCountRef.current = 0
			prevLastEndLineRef.current = null
			prevLastTypeRef.current = null
			prevLastContentRef.current = ''
		}
	}, [paneId, effectiveAgent, shouldParse, isAltScreen, updateAgentBlocks, termRef])

	return shouldParse
}
