export function hexToRgb(hex: string) {
	const c = hex.replace(/^#/, '')
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

export function rgbToHex(r: number, g: number, b: number) {
	return `#${[r, g, b]
		.map((x) =>
			Math.round(Math.max(0, Math.min(255, x)))
				.toString(16)
				.padStart(2, '0'),
		)
		.join('')}`
}

export function mixColors(color1: string, color2: string, weight: number) {
	const c1 = hexToRgb(color1)
	const c2 = hexToRgb(color2)
	const w = Math.max(0, Math.min(1, weight))
	return rgbToHex(
		c1[0] * w + c2[0] * (1 - w),
		c1[1] * w + c2[1] * (1 - w),
		c1[2] * w + c2[2] * (1 - w),
	)
}

export function isDark(hex: string) {
	try {
		const [r, g, b] = hexToRgb(hex)
		const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
		return luminance < 0.5
	} catch {
		return true // Fallback
	}
}

export function generateThemeVariables(bg: string, fg: string) {
	const dark = isDark(bg)

	// Create depth by mixing with white (if dark bg) or black (if light bg)
	const depthColor = dark ? '#ffffff' : '#000000'

	// Surfaces
	const canvas = bg
	const elevated = mixColors(bg, depthColor, 0.95)
	const sunken = mixColors(bg, dark ? '#000000' : '#ffffff', 0.92) // Opposite direction for sunken
	const overlay = mixColors(bg, depthColor, 0.9)
	const overlayHover = mixColors(bg, depthColor, 0.85)
	const overlayActive = mixColors(bg, depthColor, 0.8)

	// Content
	const content = fg
	const contentSecondary = mixColors(fg, bg, 0.7)
	const contentMuted = mixColors(fg, bg, 0.45)

	// Functional
	const edge = mixColors(bg, fg, 0.85) // Slight tint of foreground into the border

	// We could derive accent/danger, but relying on a default fallback or keeping them constant is safer
	// if we don't have explicit theme definitions.
	const accent = dark ? '#6c63ff' : '#4d46e5'
	const danger = '#e74c3c'

	return {
		'--color-canvas': canvas,
		'--color-elevated': elevated,
		'--color-sunken': sunken,
		'--color-overlay': overlay,
		'--color-overlay-hover': overlayHover,
		'--color-overlay-active': overlayActive,
		'--color-content': content,
		'--color-content-secondary': contentSecondary,
		'--color-content-muted': contentMuted,
		'--color-edge': edge,
		'--color-accent': accent,
		'--color-danger': danger,
	} as Record<string, string>
}
