import type React from 'react'
import { TERMINAL_FONTS } from '../data/theme-presets'

/** Test whether a string is a valid hex color (#RGB, #RRGGBB, or bare RGB/RRGGBB). */
export function isValidHex(hex: string): boolean {
	return /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)
}

/** Parse a hex color string (#RGB or #RRGGBB) into an RGB tuple. Returns [0,0,0] on malformed input. */
export function hexToRgb(hex: string): [number, number, number] {
	const match = hex.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i)
	if (!match) {
		console.warn('[theme] malformed hex color:', hex)
		return [0, 0, 0]
	}
	const c = match[1]
	if (c.length === 3) {
		return [
			Number.parseInt(c[0] + c[0], 16),
			Number.parseInt(c[1] + c[1], 16),
			Number.parseInt(c[2] + c[2], 16),
		]
	}
	return [
		Number.parseInt(c.slice(0, 2), 16),
		Number.parseInt(c.slice(2, 4), 16),
		Number.parseInt(c.slice(4, 6), 16),
	]
}

/** Convert RGB values to a hex string. Clamps each channel to [0, 255]. */
export function rgbToHex(r: number, g: number, b: number): string {
	return `#${[r, g, b]
		.map((x) =>
			Math.round(Math.max(0, Math.min(255, x)))
				.toString(16)
				.padStart(2, '0'),
		)
		.join('')}`
}

/** Linearly interpolate between two hex colors. Weight 1 = 100% color1, 0 = 100% color2. Clamps weight to [0, 1]. */
export function mixColors(color1: string, color2: string, weight: number): string {
	const c1 = hexToRgb(color1)
	const c2 = hexToRgb(color2)
	const w = Math.max(0, Math.min(1, weight))
	return rgbToHex(
		c1[0] * w + c2[0] * (1 - w),
		c1[1] * w + c2[1] * (1 - w),
		c1[2] * w + c2[2] * (1 - w),
	)
}

/** Returns true if the color has low perceived luminance (< 0.5).
 *  Invalid input → hexToRgb returns [0,0,0] → luminance 0 → true (dark). */
export function isDark(hex: string): boolean {
	const [r, g, b] = hexToRgb(hex)
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
	return luminance < 0.5
}

const MIN_UI_FONT_SIZE = 11
const MAX_UI_FONT_SIZE = 15
const DEFAULT_UI_FONT_SIZE = 13

/** The exact set of CSS custom properties produced by generateThemeVariables.
 *  Intersected with React.CSSProperties so the result can be spread into a `style` prop. */
export type ThemeVariables = {
	'--color-canvas': string
	'--color-elevated': string
	'--color-sunken': string
	'--color-overlay': string
	'--color-overlay-hover': string
	'--color-overlay-active': string
	'--color-content': string
	'--color-content-secondary': string
	'--color-content-muted': string
	'--color-edge': string
	'--color-accent': string
	'--color-danger': string
	'--font-family-ui': string
	'--font-size-ui': string
} & React.CSSProperties

/**
 * Derive a full set of CSS custom properties from a background/foreground color pair
 * and typography settings.
 * Auto-detects dark vs light mode from the background luminance.
 * Returns an object suitable for React inline `style` — keys are CSS variable names.
 */
export function generateThemeVariables(
	bg?: string,
	fg?: string,
	fontFamily?: string,
	fontSize?: number,
): ThemeVariables {
	const safeBg = bg && isValidHex(bg) ? bg : '#1a1a2e'
	const safeFg = fg && isValidHex(fg) ? fg : '#e0e0e0'

	const dark = isDark(safeBg)

	// Surfaces shift toward white (dark mode) or black (light mode) for depth
	const depthColor = dark ? '#ffffff' : '#000000'
	const recessColor = dark ? '#000000' : '#e8e8e8'

	// Surface levels: canvas < sunken < elevated < overlay
	const elevated = mixColors(safeBg, depthColor, 0.95)
	const sunken = mixColors(safeBg, recessColor, 0.92)
	const overlay = mixColors(safeBg, depthColor, 0.9)
	const overlayHover = mixColors(safeBg, depthColor, 0.85)
	const overlayActive = mixColors(safeBg, depthColor, 0.8)

	// Content — three tiers of text prominence
	const contentSecondary = mixColors(safeFg, safeBg, 0.8)
	const contentMuted = mixColors(safeFg, safeBg, 0.55)

	// Border: 85% background + 15% foreground tint
	const edge = mixColors(safeBg, safeFg, 0.85)

	// Accent and danger are fixed — not derived from bg/fg
	const accent = dark ? '#6c63ff' : '#4d46e5'
	const danger = '#e74c3c'

	// Sanitize fontFamily — only allow known fonts to prevent CSS injection from tampered config
	const safeFontFamily = fontFamily && (TERMINAL_FONTS as readonly string[]).includes(fontFamily)
		? fontFamily
		: undefined

	// Typography: 1px smaller than terminal font size, clamped to 11-15px range
	const uiFontSize =
		typeof fontSize === 'number' && Number.isFinite(fontSize) && fontSize > 0
			? Math.max(MIN_UI_FONT_SIZE, Math.min(MAX_UI_FONT_SIZE, fontSize - 1))
			: DEFAULT_UI_FONT_SIZE

	return {
		'--color-canvas': safeBg,
		'--color-elevated': elevated,
		'--color-sunken': sunken,
		'--color-overlay': overlay,
		'--color-overlay-hover': overlayHover,
		'--color-overlay-active': overlayActive,
		'--color-content': safeFg,
		'--color-content-secondary': contentSecondary,
		'--color-content-muted': contentMuted,
		'--color-edge': edge,
		'--color-accent': accent,
		'--color-danger': danger,
		// CSS variable fallback — intentionally different from buildFontFamily() in theme-presets.ts
		// which uses literal font names for xterm.js (no CSS variable support in canvas).
		'--font-family-ui': safeFontFamily
			? `"${safeFontFamily}", var(--font-mono-fallback)`
			: 'var(--font-mono-fallback)',
		'--font-size-ui': `${uiFontSize}px`,
	}
}
