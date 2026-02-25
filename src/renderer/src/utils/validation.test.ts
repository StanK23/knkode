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

	it('accepts lowercase drive letters', () => {
		expect(isValidCwd('c:\\Users')).toBe(true)
		expect(isValidCwd('d:/Projects')).toBe(true)
	})

	it('accepts Windows root paths', () => {
		expect(isValidCwd('C:\\')).toBe(true)
		expect(isValidCwd('C:/')).toBe(true)
	})

	it('rejects bare drive letter without trailing separator', () => {
		expect(isValidCwd('C:')).toBe(false)
	})

	// UNC paths (\\server\share) are intentionally unsupported — the main process
	// validates with path.isAbsolute() which covers UNC; this renderer-side check
	// only handles standard drive-letter paths.
	it('rejects UNC paths (intentionally unsupported)', () => {
		expect(isValidCwd('\\\\server\\share')).toBe(false)
	})

	it('rejects relative paths', () => {
		expect(isValidCwd('relative/path')).toBe(false)
		expect(isValidCwd('foo')).toBe(false)
		expect(isValidCwd('./foo')).toBe(false)
		expect(isValidCwd('../bar')).toBe(false)
	})

	it('rejects tilde paths (callers must resolve first)', () => {
		expect(isValidCwd('~/something')).toBe(false)
		expect(isValidCwd('~')).toBe(false)
	})

	it('rejects whitespace-only and leading-whitespace paths', () => {
		expect(isValidCwd(' ')).toBe(false)
		expect(isValidCwd(' /home')).toBe(false)
	})
})
