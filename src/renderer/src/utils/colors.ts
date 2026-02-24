/** Parse a hex color string (#RGB or #RRGGBB) into an RGB tuple. Throws on malformed input. */
export function hexToRgb(hex: string): [number, number, number] {
	const match = hex.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i)
	if (!match) throw new Error(`Invalid hex color: "${hex}"`)
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

/** Returns true if the color has low perceived luminance (< 0.5). Defaults to true (dark) on invalid input. */
export function isDark(hex: string): boolean {
	try {
		const [r, g, b] = hexToRgb(hex)
		const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
		return luminance < 0.5
	} catch {
		return true
	}
}

/**
 * Derive a full set of CSS custom properties from a background/foreground color pair
 * and typography settings.
 * Auto-detects dark vs light mode from the background luminance.
 * Returns an object suitable for React inline `style` — keys are CSS variable names.
 */
export function generateThemeVariables(
	bg: string,
	fg: string,
	fontFamily?: string,
	fontSize?: number,
): Record<`--color-${string}` | `--font-${string}`, string> {
	const dark = isDark(bg)

	// Surfaces shift toward white (dark mode) or black (light mode) for depth
	const depthColor = dark ? '#ffffff' : '#000000'
	const recessColor = dark ? '#000000' : '#e8e8e8'

	// Surface levels: canvas < sunken < elevated < overlay
	const elevated = mixColors(bg, depthColor, 0.95)
	const sunken = mixColors(bg, recessColor, 0.92)
	const overlay = mixColors(bg, depthColor, 0.9)
	const overlayHover = mixColors(bg, depthColor, 0.85)
	const overlayActive = mixColors(bg, depthColor, 0.8)

	// Content — three tiers of text prominence
	const contentSecondary = mixColors(fg, bg, 0.8)
	const contentMuted = mixColors(fg, bg, 0.55)

	// Border: 85% background + 15% foreground tint
	const edge = mixColors(bg, fg, 0.85)

	// Accent and danger are fixed — not derived from bg/fg
	const accent = dark ? '#6c63ff' : '#4d46e5'
	const danger = '#e74c3c'

	// Typography: scale UI font size relative to terminal font size.
	// We want the UI to feel proportional but slightly smaller than terminal text.
	// Range: 11px to 15px.
	const uiFontSize = fontSize ? Math.max(11, Math.min(15, fontSize - 1)) : 13

	return {
		'--color-canvas': bg,
		'--color-elevated': elevated,
		'--color-sunken': sunken,
		'--color-overlay': overlay,
		'--color-overlay-hover': overlayHover,
		'--color-overlay-active': overlayActive,
		'--color-content': fg,
		'--color-content-secondary': contentSecondary,
		'--color-content-muted': contentMuted,
		'--color-edge': edge,
		'--color-accent': accent,
		'--color-danger': danger,
		'--font-family-ui': fontFamily ? `"${fontFamily}", var(--font-mono-fallback)` : 'var(--font-mono-fallback)',
		'--font-size-ui': `${uiFontSize}px`,
	}
}
