import { describe, expect, it } from 'vitest'
import { isValidCwd } from './validation'

describe('isValidCwd', () => {
	it('accepts empty string', () => {
		expect(isValidCwd('')).toBe(true)
	})

	it('accepts Unix absolute paths', () => {
		expect(isValidCwd('/home/user')).toBe(true)
		expect(isValidCwd('/usr/local/bin')).toBe(true)
		expect(isValidCwd('/')).toBe(true)
	})

	it('accepts Windows absolute paths with backslashes', () => {
		expect(isValidCwd('C:\\Users\\user')).toBe(true)
		expect(isValidCwd('D:\\Projects')).toBe(true)
	})

	it('accepts Windows absolute paths with forward slashes', () => {
		expect(isValidCwd('C:/Users/user')).toBe(true)
		expect(isValidCwd('D:/Projects')).toBe(true)
	})

	it('rejects relative paths', () => {
		expect(isValidCwd('relative/path')).toBe(false)
		expect(isValidCwd('foo')).toBe(false)
	})

	it('rejects tilde paths (callers must resolve first)', () => {
		expect(isValidCwd('~/something')).toBe(false)
		expect(isValidCwd('~')).toBe(false)
	})
})
