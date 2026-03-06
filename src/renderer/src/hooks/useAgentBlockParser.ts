import type { Terminal as XTerm } from '@xterm/xterm'
import { useEffect, useRef } from 'react'
import { AgentBlockParser, supportsBlockParsing } from '../lib/agent-block-parser'
import { useStore } from '../store'

const PARSE_INTERVAL_MS = 200

/**
 * Hook that manages an AgentBlockParser for an xterm.js terminal buffer.
 * Called unconditionally on every pane. Internally starts a periodic parsing
 * interval only when an agent is detected, the agent supports block parsing,
 * and the pane is not in alternate screen mode. When conditions are not met,
 * any existing blocks are cleared.
 */
export function useAgentBlockParser(paneId: string, termRef: React.RefObject<XTerm | null>): void {
	const agentType = useStore((s) => s.paneAgentTypes.get(paneId) ?? null)
	const isAltScreen = useStore((s) => s.altScreenPaneIds.has(paneId))
	const updateAgentBlocks = useStore((s) => s.updateAgentBlocks)

	const shouldParse = agentType !== null && !isAltScreen && supportsBlockParsing(agentType)
	const parserRef = useRef<AgentBlockParser | null>(null)
	const prevBlockCountRef = useRef(0)
	const prevLastEndLineRef = useRef<number | null>(null)
	const prevLastTypeRef = useRef<string | null>(null)

	useEffect(() => {
		if (!shouldParse || !agentType) {
			// Clear blocks when parsing stops
			if (parserRef.current) {
				parserRef.current = null
				updateAgentBlocks(paneId, [])
			}
			prevBlockCountRef.current = 0
			prevLastEndLineRef.current = null
			prevLastTypeRef.current = null
			return
		}

		parserRef.current = new AgentBlockParser(agentType)

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

				// Heuristic: only update store when block count, last block's endLine, or
				// last block's type changes. Does not detect metadata or mid-array mutations
				// — acceptable since blocks are append-only and the last block is the one
				// actively streaming.
				if (
					blocks.length !== prevBlockCountRef.current ||
					lastBlock?.endLine !== prevLastEndLineRef.current ||
					lastBlock?.type !== prevLastTypeRef.current
				) {
					prevBlockCountRef.current = blocks.length
					prevLastEndLineRef.current = lastBlock?.endLine ?? null
					prevLastTypeRef.current = lastBlock?.type ?? null
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
		}
	}, [paneId, agentType, shouldParse, updateAgentBlocks, termRef])
}
