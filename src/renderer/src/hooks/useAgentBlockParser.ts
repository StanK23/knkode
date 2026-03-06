import type { Terminal as XTerm } from '@xterm/xterm'
import { useEffect, useRef } from 'react'
import type { AgentType } from '../../../shared/types'
import { AgentBlockParser, supportsBlockParsing } from '../lib/agent-block-parser'
import { useStore } from '../store'

const PARSE_INTERVAL_MS = 200

/**
 * Connects an AgentBlockParser to an xterm.js terminal buffer, periodically
 * parsing new lines and pushing blocks to the store. Only active when an
 * agent is detected, the agent supports block parsing, and the pane is not
 * in alternate screen mode.
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

		parserRef.current = new AgentBlockParser(agentType as AgentType)

		const interval = setInterval(() => {
			const term = termRef.current
			const parser = parserRef.current
			if (!term || !parser) return

			const buffer = term.buffer.active
			const lineCount = buffer.length

			parser.update((i) => buffer.getLine(i)?.translateToString(true) ?? '', lineCount)

			const blocks = parser.getBlocks()
			const lastBlock = blocks.length > 0 ? blocks[blocks.length - 1] : null

			// Only update store if blocks actually changed
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
