import { describe, expect, it } from 'vitest'
import { AGENT_TYPES, type AgentType, PROCESS_TO_AGENT } from './types'

describe('Agent detection mapping', () => {
	it('maps claude process names to claude-code', () => {
		expect(PROCESS_TO_AGENT.claude).toBe('claude-code')
		expect(PROCESS_TO_AGENT['claude-code']).toBe('claude-code')
	})

	it('maps codex process name', () => {
		expect(PROCESS_TO_AGENT.codex).toBe('codex')
	})

	it('maps gemini process name', () => {
		expect(PROCESS_TO_AGENT.gemini).toBe('gemini-cli')
	})

	it('maps aider process name', () => {
		expect(PROCESS_TO_AGENT.aider).toBe('aider')
	})

	it('maps opencode process name', () => {
		expect(PROCESS_TO_AGENT.opencode).toBe('opencode')
	})

	it('maps kilo-code process names', () => {
		expect(PROCESS_TO_AGENT['kilo-code']).toBe('kilo-code')
		expect(PROCESS_TO_AGENT.kilo).toBe('kilo-code')
	})

	it('returns undefined for unknown process names', () => {
		expect(PROCESS_TO_AGENT.vim).toBeUndefined()
		expect(PROCESS_TO_AGENT.node).toBeUndefined()
		expect(PROCESS_TO_AGENT.bash).toBeUndefined()
		expect(PROCESS_TO_AGENT.zsh).toBeUndefined()
	})

	it('all mapped values are valid AgentType values', () => {
		const validTypes = new Set<string>(AGENT_TYPES)
		for (const agentType of Object.values(PROCESS_TO_AGENT)) {
			expect(agentType).toBeDefined()
			if (agentType) expect(validTypes.has(agentType)).toBe(true)
		}
	})

	it('every AgentType has at least one process mapping', () => {
		const values = Object.values(PROCESS_TO_AGENT).filter((v): v is AgentType => v !== undefined)
		const mappedTypes = new Set(values)
		for (const agentType of AGENT_TYPES) {
			expect(mappedTypes.has(agentType)).toBe(true)
		}
	})
})
