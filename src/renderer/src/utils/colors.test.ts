import { describe, expect, it } from 'vitest'
import { generateThemeVariables, hexToRgb, isDark, mixColors, rgbToHex } from './colors'

describe('hexToRgb', () => {
	it('parses 6-digit hex colors', () => {
		expect(hexToRgb('#ffffff')).toEqual([255, 255, 255])
		expect(hexToRgb('#000000')).toEqual([0, 0, 0])
		expect(hexToRgb('#ff0000')).toEqual([255, 0, 0])
		expect(hexToRgb('#00ff00')).toEqual([0, 255, 0])
		expect(hexToRgb('#0000ff')).toEqual([0, 0, 255])
	})

	it('parses 3-digit shorthand hex colors', () => {
		expect(hexToRgb('#abc')).toEqual([170, 187, 204])
		expect(hexToRgb('#fff')).toEqual([255, 255, 255])
		expect(hexToRgb('#000')).toEqual([0, 0, 0])
	})

	it('handles input without # prefix', () => {
		expect(hexToRgb('ff0000')).toEqual([255, 0, 0])
		expect(hexToRgb('abc')).toEqual([170, 187, 204])
	})

	it('throws on malformed input', () => {
		expect(() => hexToRgb('')).toThrow('Invalid hex color')
		expect(() => hexToRgb('#')).toThrow('Invalid hex color')
		expect(() => hexToRgb('#gg0000')).toThrow('Invalid hex color')
		expect(() => hexToRgb('#12345')).toThrow('Invalid hex color')
		expect(() => hexToRgb('#1234567')).toThrow('Invalid hex color')
		expect(() => hexToRgb('not-a-color')).toThrow('Invalid hex color')
	})
})

describe('rgbToHex', () => {
	it('converts RGB values to hex', () => {
		expect(rgbToHex(255, 255, 255)).toBe('#ffffff')
		expect(rgbToHex(0, 0, 0)).toBe('#000000')
		expect(rgbToHex(255, 0, 0)).toBe('#ff0000')
		expect(rgbToHex(0, 255, 0)).toBe('#00ff00')
		expect(rgbToHex(0, 0, 255)).toBe('#0000ff')
	})

	it('clamps out-of-range values to [0, 255]', () => {
		expect(rgbToHex(300, -10, 128)).toBe('#ff0080')
		expect(rgbToHex(-1, 256, 0)).toBe('#00ff00')
	})
})

describe('mixColors', () => {
	it('mixes two colors at 50% weight', () => {
		expect(mixColors('#ffffff', '#000000', 0.5)).toBe('#808080')
		expect(mixColors('#ff0000', '#0000ff', 0.5)).toBe('#800080')
	})

	it('returns color1 at weight=1', () => {
		expect(mixColors('#ff0000', '#0000ff', 1)).toBe('#ff0000')
	})

	it('returns color2 at weight=0', () => {
		expect(mixColors('#ff0000', '#0000ff', 0)).toBe('#0000ff')
	})

	it('clamps weight outside [0, 1]', () => {
		expect(mixColors('#ff0000', '#0000ff', 2.0)).toBe('#ff0000')
		expect(mixColors('#ff0000', '#0000ff', -1.0)).toBe('#0000ff')
	})

	it('mixes at 90% weight', () => {
		expect(mixColors('#000000', '#ffffff', 0.9)).toBe('#191919')
	})
})

describe('isDark', () => {
	it('returns true for dark colors', () => {
		expect(isDark('#000000')).toBe(true)
		expect(isDark('#1a1a2e')).toBe(true)
		expect(isDark('#282a36')).toBe(true)
	})

	it('returns false for light colors', () => {
		expect(isDark('#ffffff')).toBe(false)
		expect(isDark('#fdf6e3')).toBe(false)
		expect(isDark('#fafafa')).toBe(false)
	})

	it('defaults to true (dark) on invalid input', () => {
		expect(isDark('not-a-color')).toBe(true)
		expect(isDark('')).toBe(true)
	})

	it('handles threshold boundary', () => {
		// Luminance = (0.299*128 + 0.587*128 + 0.114*128) / 255 ≈ 0.502 → light
		expect(isDark('#808080')).toBe(false)
		// Slightly darker
		expect(isDark('#7f7f7f')).toBe(true)
	})
})

describe('generateThemeVariables', () => {
	const ALL_KEYS = [
		'--color-canvas',
		'--color-elevated',
		'--color-sunken',
		'--color-overlay',
		'--color-overlay-hover',
		'--color-overlay-active',
		'--color-content',
		'--color-content-secondary',
		'--color-content-muted',
		'--color-edge',
		'--color-accent',
		'--color-danger',
	] as const

	it('returns all 12 expected keys', () => {
		const theme = generateThemeVariables('#1a1a2e', '#e0e0e0')
		expect(Object.keys(theme).sort()).toEqual([...ALL_KEYS].sort())
	})

	it('generates correct dark-mode theme', () => {
		const theme = generateThemeVariables('#1a1a2e', '#e0e0e0')
		expect(theme['--color-canvas']).toBe('#1a1a2e')
		expect(theme['--color-content']).toBe('#e0e0e0')
		expect(theme['--color-accent']).toBe('#6c63ff')
		expect(theme['--color-danger']).toBe('#e74c3c')
		// Elevated should be lighter than canvas in dark mode
		expect(theme['--color-elevated']).not.toBe(theme['--color-canvas'])
	})

	it('generates correct light-mode theme', () => {
		const theme = generateThemeVariables('#ffffff', '#24292f')
		expect(theme['--color-canvas']).toBe('#ffffff')
		expect(theme['--color-content']).toBe('#24292f')
		expect(theme['--color-accent']).toBe('#4d46e5')
		// Sunken should differ from canvas on pure white backgrounds
		expect(theme['--color-sunken']).not.toBe('#ffffff')
	})

	it('produces distinct surface levels', () => {
		const theme = generateThemeVariables('#1a1a2e', '#e0e0e0')
		const surfaces = [
			theme['--color-canvas'],
			theme['--color-elevated'],
			theme['--color-sunken'],
			theme['--color-overlay'],
		]
		// All four should be different from each other
		expect(new Set(surfaces).size).toBe(4)
	})
})
