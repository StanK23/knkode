import { describe, expect, it } from 'vitest'
import { isValidHex } from '../utils/colors'
import { THEME_PRESETS, buildFontFamily, buildXtermTheme, findPreset } from './theme-presets'

describe('buildXtermTheme', () => {
	it('returns base theme fields without ansiColors', () => {
		const theme = buildXtermTheme({ background: '#1a1a2e', foreground: '#e0e0e0' })
		expect(theme.background).toBe('#1a1a2e')
		expect(theme.foreground).toBe('#e0e0e0')
		expect(theme.cursor).toBe('#e0e0e0')
		expect(theme.selectionBackground).toBe('#e0e0e033')
		expect(theme.black).toBeUndefined()
	})

	it('maps all 16 ANSI colors when provided', () => {
		const ansiColors = {
			black: '#000000',
			red: '#ff0000',
			green: '#00ff00',
			yellow: '#ffff00',
			blue: '#0000ff',
			magenta: '#ff00ff',
			cyan: '#00ffff',
			white: '#ffffff',
			brightBlack: '#808080',
			brightRed: '#ff8080',
			brightGreen: '#80ff80',
			brightYellow: '#ffff80',
			brightBlue: '#8080ff',
			brightMagenta: '#ff80ff',
			brightCyan: '#80ffff',
			brightWhite: '#ffffff',
		}
		const theme = buildXtermTheme({ background: '#1a1a2e', foreground: '#e0e0e0', ansiColors })
		expect(theme.black).toBe('#000000')
		expect(theme.red).toBe('#ff0000')
		expect(theme.green).toBe('#00ff00')
		expect(theme.yellow).toBe('#ffff00')
		expect(theme.blue).toBe('#0000ff')
		expect(theme.magenta).toBe('#ff00ff')
		expect(theme.cyan).toBe('#00ffff')
		expect(theme.white).toBe('#ffffff')
		expect(theme.brightBlack).toBe('#808080')
		expect(theme.brightRed).toBe('#ff8080')
		expect(theme.brightGreen).toBe('#80ff80')
		expect(theme.brightYellow).toBe('#ffff80')
		expect(theme.brightBlue).toBe('#8080ff')
		expect(theme.brightMagenta).toBe('#ff80ff')
		expect(theme.brightCyan).toBe('#80ffff')
		expect(theme.brightWhite).toBe('#ffffff')
	})

	it('produces rgba background when opacity < 1', () => {
		const theme = buildXtermTheme({ background: '#1a1a2e', foreground: '#e0e0e0' }, 0.5)
		expect(theme.background).toBe('rgba(26, 26, 46, 0.5)')
	})

	it('produces hex background when opacity is 1 (default)', () => {
		const theme = buildXtermTheme({ background: '#1a1a2e', foreground: '#e0e0e0' })
		expect(theme.background).toBe('#1a1a2e')
	})

	it('skips invalid ANSI color values', () => {
		const ansiColors = {
			black: '#000000',
			red: 'not-a-color',
			green: '#00ff00',
			yellow: '#ffff00',
			blue: '#0000ff',
			magenta: '#ff00ff',
			cyan: '#00ffff',
			white: '#ffffff',
			brightBlack: '#808080',
			brightRed: '#ff8080',
			brightGreen: '#80ff80',
			brightYellow: '#ffff80',
			brightBlue: '#8080ff',
			brightMagenta: '#ff80ff',
			brightCyan: '#80ffff',
			brightWhite: '#ffffff',
		}
		const theme = buildXtermTheme({ background: '#1a1a2e', foreground: '#e0e0e0', ansiColors })
		expect(theme.black).toBe('#000000')
		expect(theme.red).toBeUndefined()
		expect(theme.green).toBe('#00ff00')
	})
})

describe('findPreset', () => {
	it('returns correct preset for a known name', () => {
		const preset = findPreset('Dracula')
		expect(preset).toBeDefined()
		expect(preset?.name).toBe('Dracula')
		expect(preset?.background).toBe('#282a36')
	})

	it('returns undefined for an unknown name', () => {
		expect(findPreset('NonExistent Theme')).toBeUndefined()
	})

	it('returns undefined for removed presets', () => {
		for (const removed of ['One Dark', 'Solarized Dark', 'GitHub Dark', 'GitHub Light', 'One Light', 'Rosé Pine', 'Rosé Pine Dawn', 'Kanagawa']) {
			expect(findPreset(removed), `${removed} should be removed`).toBeUndefined()
		}
	})

	it('matching is exact (case-sensitive)', () => {
		expect(findPreset('dracula')).toBeUndefined()
		expect(findPreset('DRACULA')).toBeUndefined()
		expect(findPreset('Dracula ')).toBeUndefined()
	})
})

describe('buildFontFamily', () => {
	it('returns default when no family provided', () => {
		expect(buildFontFamily()).toContain('JetBrains Mono')
	})

	it('returns family with fallbacks for allowed font', () => {
		const result = buildFontFamily('Fira Code')
		expect(result).toContain('Fira Code')
		expect(result).toContain('monospace')
	})

	it('returns default for unrecognized font family', () => {
		expect(buildFontFamily('Comic Sans')).toContain('JetBrains Mono')
		expect(buildFontFamily('Comic Sans')).not.toContain('Comic Sans')
	})

	it('rejects CSS injection attempts', () => {
		const result = buildFontFamily('"; } body { display: none; } .x { font-family: "')
		expect(result).toContain('JetBrains Mono')
		expect(result).not.toContain('display')
	})
})

describe('THEME_PRESETS data integrity', () => {
	it('every preset has a non-empty name', () => {
		for (const preset of THEME_PRESETS) {
			expect(preset.name.length).toBeGreaterThan(0)
		}
	})

	it('every preset has valid hex background and foreground', () => {
		for (const preset of THEME_PRESETS) {
			expect(isValidHex(preset.background)).toBe(true)
			expect(isValidHex(preset.foreground)).toBe(true)
		}
	})

	it('all ANSI color values are valid hex', () => {
		for (const preset of THEME_PRESETS) {
			if (preset.ansiColors) {
				for (const [key, value] of Object.entries(preset.ansiColors)) {
					expect(isValidHex(value), `${preset.name}.ansiColors.${key} = "${value}"`).toBe(true)
				}
			}
		}
	})

	it('preset names are unique', () => {
		const names = THEME_PRESETS.map((p) => p.name)
		expect(new Set(names).size).toBe(names.length)
	})

	it('every preset with accent has valid hex accent', () => {
		for (const preset of THEME_PRESETS) {
			if ('accent' in preset && preset.accent) {
				expect(isValidHex(preset.accent), `${preset.name}.accent = "${preset.accent}"`).toBe(true)
			}
		}
	})

	it('every preset with glow has valid hex glow', () => {
		for (const preset of THEME_PRESETS) {
			if ('glow' in preset && preset.glow) {
				expect(isValidHex(preset.glow), `${preset.name}.glow = "${preset.glow}"`).toBe(true)
			}
		}
	})
})

describe('identity theme properties', () => {
	it('Matrix is green monochrome — all ANSI colors are green-family', () => {
		const matrix = findPreset('Matrix')
		expect(matrix).toBeDefined()
		expect(matrix!.glow).toBe('#00ff41')
		// Every ANSI color should be in the green hue range (no red, blue, etc.)
		for (const [key, value] of Object.entries(matrix!.ansiColors!)) {
			if (key === 'black') continue // black is exempt
			const hex = value.replace('#', '')
			const r = Number.parseInt(hex.slice(0, 2), 16)
			const g = Number.parseInt(hex.slice(2, 4), 16)
			// Green channel should dominate or equal red channel
			expect(g).toBeGreaterThanOrEqual(r)
		}
	})

	it('Cyberpunk has neon glow and dark purple background', () => {
		const cyberpunk = findPreset('Cyberpunk')
		expect(cyberpunk).toBeDefined()
		expect(cyberpunk!.accent).toBe('#ff2a6d')
		expect(cyberpunk!.glow).toBe('#ff2a6d')
		// Background should be very dark
		const bg = cyberpunk!.background.replace('#', '')
		const lum = Number.parseInt(bg.slice(0, 2), 16) + Number.parseInt(bg.slice(2, 4), 16) + Number.parseInt(bg.slice(4, 6), 16)
		expect(lum).toBeLessThan(100)
	})

	it('Solana has brand purple accent and green glow', () => {
		const solana = findPreset('Solana')
		expect(solana).toBeDefined()
		expect(solana!.accent).toBe('#9945ff')
		expect(solana!.glow).toBe('#14f195')
		// Accent and glow should be different (purple vs green)
		expect(solana!.accent).not.toBe(solana!.glow)
	})

	it('all identity themes have both accent and glow', () => {
		for (const name of ['Matrix', 'Cyberpunk', 'Solana']) {
			const preset = findPreset(name)
			expect(preset, `${name} should exist`).toBeDefined()
			expect(preset!.accent, `${name} should have accent`).toBeDefined()
			expect(preset!.glow, `${name} should have glow`).toBeDefined()
		}
	})
})
