import { describe, expect, it } from 'vitest'
import { AGENT_LAUNCH_CONFIG } from '../shared/types'

describe('AGENT_LAUNCH_CONFIG', () => {
	describe('claude-code subprocess config', () => {
		const config = AGENT_LAUNCH_CONFIG['claude-code']

		it('has subprocess config', () => {
			expect(config.subprocess).not.toBeNull()
		})

		it('uses correct command', () => {
			expect(config.command).toBe('claude')
		})

		it('includes required flags for stream-json mode', () => {
			const flags = config.subprocess!.flags
			expect(flags).toEqual([
				'--print',
				'--verbose',
				'--input-format',
				'stream-json',
				'--output-format',
				'stream-json',
			])
		})

		it('strips CLAUDECODE env vars', () => {
			expect(config.subprocess!.stripEnv).toContain('CLAUDECODE')
			expect(config.subprocess!.stripEnv).toContain('CLAUDE_CODE_ENTRYPOINT')
		})

		it('formats messages as stream-json NDJSON', () => {
			const formatted = config.subprocess!.formatMessage('hello world')
			expect(formatted).toEqual({
				type: 'user',
				message: {
					role: 'user',
					content: [{ type: 'text', text: 'hello world' }],
				},
			})
		})

		it('formats messages with special characters correctly', () => {
			const formatted = config.subprocess!.formatMessage('line1\nline2\t"quoted"')
			const payload = JSON.stringify(formatted)
			expect(() => JSON.parse(payload)).not.toThrow()
			const parsed = JSON.parse(payload)
			expect(parsed.message.content[0].text).toBe('line1\nline2\t"quoted"')
		})
	})

	describe('gemini-cli config', () => {
		const config = AGENT_LAUNCH_CONFIG['gemini-cli']

		it('has no subprocess config (TBD)', () => {
			expect(config.subprocess).toBeNull()
		})

		it('uses correct command', () => {
			expect(config.command).toBe('gemini')
		})
	})
})
