import { describe, expect, it } from 'vitest'
import { stripAnsi } from './ansi'

describe('stripAnsi', () => {
	it('passes through plain text', () => {
		expect(stripAnsi('hello world')).toBe('hello world')
	})

	it('strips CSI color codes', () => {
		expect(stripAnsi('\x1b[31mred\x1b[0m')).toBe('red')
	})

	it('strips CSI with multiple params', () => {
		expect(stripAnsi('\x1b[1;32mbold green\x1b[0m')).toBe('bold green')
	})

	it('strips cursor movement sequences', () => {
		expect(stripAnsi('\x1b[2Aup\x1b[5Bdown')).toBe('updown')
	})

	it('strips OSC sequences', () => {
		expect(stripAnsi('\x1b]0;title\x07text')).toBe('text')
	})

	it('handles empty string', () => {
		expect(stripAnsi('')).toBe('')
	})

	it('preserves box-drawing characters', () => {
		expect(stripAnsi('\x1b[36m╭─ Read\x1b[0m')).toBe('╭─ Read')
	})
})
