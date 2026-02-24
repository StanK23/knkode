import { describe, expect, it } from 'vitest'
import {
	adjustLightness,
	generateThemeVariables,
	hexToRgb,
	isDark,
	mixColors,
	rgbToHex,
} from './colors'

describe('color utils', () => {
	it('converts hex to rgb correctly', () => {
		expect(hexToRgb('#ffffff')).toEqual([255, 255, 255])
		expect(hexToRgb('#000000')).toEqual([0, 0, 0])
		expect(hexToRgb('#ff0000')).toEqual([255, 0, 0])
		expect(hexToRgb('#00ff00')).toEqual([0, 255, 0])
		expect(hexToRgb('#0000ff')).toEqual([0, 0, 255])
		expect(hexToRgb('#abc')).toEqual([170, 187, 204]) // shorthand
	})

	it('converts rgb to hex correctly', () => {
		expect(rgbToHex(255, 255, 255)).toBe('#ffffff')
		expect(rgbToHex(0, 0, 0)).toBe('#000000')
		expect(rgbToHex(255, 0, 0)).toBe('#ff0000')
		expect(rgbToHex(0, 255, 0)).toBe('#00ff00')
		expect(rgbToHex(0, 0, 255)).toBe('#0000ff')
		// clamps values
		expect(rgbToHex(300, -10, 128)).toBe('#ff0080')
	})

	it('mixes colors correctly', () => {
		expect(mixColors('#ffffff', '#000000', 0.5)).toBe('#808080')
		expect(mixColors('#ff0000', '#0000ff', 0.5)).toBe('#800080')
		expect(mixColors('#000000', '#ffffff', 0.9)).toBe('#191919')
	})

	it('determines if a color is dark', () => {
		expect(isDark('#000000')).toBe(true)
		expect(isDark('#1a1a2e')).toBe(true)
		expect(isDark('#282a36')).toBe(true)

		expect(isDark('#ffffff')).toBe(false)
		expect(isDark('#fdf6e3')).toBe(false)
		expect(isDark('#fafafa')).toBe(false)
	})

	it('generates a full theme correctly for dark mode', () => {
		const theme = generateThemeVariables('#1a1a2e', '#e0e0e0')
		expect(theme['--color-canvas']).toBe('#1a1a2e')
		expect(theme['--color-content']).toBe('#e0e0e0')
		expect(theme['--color-elevated']).toBeDefined()
		expect(theme['--color-sunken']).toBeDefined()
		expect(theme['--color-accent']).toBe('#6c63ff')
	})

	it('generates a full theme correctly for light mode', () => {
		const theme = generateThemeVariables('#ffffff', '#24292f')
		expect(theme['--color-canvas']).toBe('#ffffff')
		expect(theme['--color-content']).toBe('#24292f')
		expect(theme['--color-elevated']).toBeDefined()
		expect(theme['--color-sunken']).toBeDefined()
		expect(theme['--color-accent']).toBe('#4d46e5')
	})
})
