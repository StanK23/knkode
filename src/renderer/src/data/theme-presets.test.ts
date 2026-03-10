import { describe, expect, it } from 'vitest'
import { isEffectLevel } from '../../../shared/types'
import { hexToRgb, isDark, isValidHex } from '../utils/colors'
import {
	THEME_PRESETS,
	type ThemePreset,
	buildFontFamily,
	buildXtermTheme,
	findPreset,
} from './theme-presets'

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

	// Presets removed in PR #78 (trimmed to most distinct identities)
	it('returns undefined for removed presets', () => {
		const removed = [
			'One Dark',
			'Solarized Dark',
			'GitHub Dark',
			'GitHub Light',
			'One Light',
			'Rosé Pine',
			'Rosé Pine Dawn',
			'Kanagawa',
		]
		for (const name of removed) {
			expect(findPreset(name), `${name} should be removed`).toBeUndefined()
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
			if (preset.accent) {
				expect(isValidHex(preset.accent), `${preset.name}.accent = "${preset.accent}"`).toBe(true)
			}
		}
	})

	it('every preset with glow has valid hex glow', () => {
		for (const preset of THEME_PRESETS) {
			if (preset.glow) {
				expect(isValidHex(preset.glow), `${preset.name}.glow = "${preset.glow}"`).toBe(true)
			}
		}
	})

	it('every preset effect level is a valid EffectLevel', () => {
		for (const preset of THEME_PRESETS as readonly ThemePreset[]) {
			for (const key of [
				'gradientLevel',
				'glowLevel',
				'scanlineLevel',
				'noiseLevel',
				'scrollbarAccent',
			] as const) {
				const val = preset[key]
				if (val !== undefined) {
					expect(
						isEffectLevel(val),
						`${preset.name}.${key} = "${val}" is not a valid EffectLevel`,
					).toBe(true)
				}
			}
		}
	})
})

const IDENTITY_THEMES = [
	'Matrix',
	'Cyberpunk',
	'Solana',
	'Amber',
	'Vaporwave',
	'Ocean',
	'Sunset',
	'Arctic',
]

describe('identity theme properties', () => {
	it('Matrix is green-dominant — green channel >= red and blue for all ANSI colors', () => {
		const matrix: ThemePreset | undefined = findPreset('Matrix')
		if (!matrix?.ansiColors) throw new Error('Matrix preset missing')
		expect(matrix.glow).toBe('#00ff41')
		for (const [key, value] of Object.entries(matrix.ansiColors)) {
			if (key === 'black') continue
			const [r, g, b] = hexToRgb(value)
			expect(g, `${key} green >= red`).toBeGreaterThanOrEqual(r)
			expect(g, `${key} green >= blue`).toBeGreaterThanOrEqual(b)
		}
	})

	it('Cyberpunk has neon glow and very dark background', () => {
		const cyberpunk = findPreset('Cyberpunk')
		if (!cyberpunk) throw new Error('Cyberpunk preset missing')
		expect(cyberpunk.accent).toBe('#ff2a6d')
		expect(cyberpunk.glow).toBe('#ff2a6d')
		expect(isDark(cyberpunk.background)).toBe(true)
	})

	it('Solana has brand purple accent and green glow', () => {
		const solana = findPreset('Solana')
		if (!solana) throw new Error('Solana preset missing')
		expect(solana.accent).toBe('#9945ff')
		expect(solana.glow).toBe('#14f195')
	})

	it('all identity themes have both accent and glow', () => {
		for (const name of IDENTITY_THEMES) {
			const preset = findPreset(name)
			if (!preset) throw new Error(`${name} preset missing`)
			expect(preset.accent, `${name} should have accent`).toBeDefined()
			expect(preset.glow, `${name} should have glow`).toBeDefined()
		}
	})

	it('all identity themes have glowLevel and gradientLevel', () => {
		for (const name of IDENTITY_THEMES) {
			const preset = findPreset(name)
			if (!preset) throw new Error(`${name} preset missing`)
			expect(
				preset.glowLevel === 'medium' || preset.glowLevel === 'intense',
				`${name} should have glowLevel medium or intense`,
			).toBe(true)
			expect(preset.gradientLevel, `${name} should have gradientLevel`).toBe('medium')
			expect(preset.gradient, `${name} should have gradient`).toBeDefined()
		}
	})

	it('all identity themes have cursorColor and selectionColor', () => {
		for (const name of IDENTITY_THEMES) {
			const preset = findPreset(name)
			if (!preset) throw new Error(`${name} preset missing`)
			expect(preset.cursorColor, `${name} should have cursorColor`).toBeDefined()
			expect(preset.selectionColor, `${name} should have selectionColor`).toBeDefined()
			if (preset.cursorColor) {
				expect(isValidHex(preset.cursorColor), `${name}.cursorColor valid hex`).toBe(true)
			}
			if (preset.selectionColor) {
				expect(isValidHex(preset.selectionColor), `${name}.selectionColor valid hex`).toBe(true)
			}
		}
	})

	it('all identity themes have scrollbarAccent', () => {
		for (const name of IDENTITY_THEMES) {
			const preset = findPreset(name)
			if (!preset) throw new Error(`${name} preset missing`)
			expect(isEffectLevel(preset.scrollbarAccent), `${name} should have scrollbarAccent`).toBe(
				true,
			)
		}
	})

	it('CRT themes have scanlineLevel set', () => {
		for (const name of ['Matrix', 'Amber']) {
			const preset = findPreset(name)
			if (!preset) throw new Error(`${name} preset missing`)
			expect(preset.scanlineLevel, `${name} should have scanlineLevel`).toBe('subtle')
		}
	})

	it('non-CRT identity themes do not have scanlineLevel', () => {
		for (const name of ['Cyberpunk', 'Solana', 'Vaporwave', 'Ocean', 'Sunset', 'Arctic']) {
			const preset = findPreset(name)
			if (!preset) throw new Error(`${name} preset missing`)
			expect(preset.scanlineLevel, `${name} should not have scanlineLevel`).toBeUndefined()
		}
	})

	it('identity theme gradients are valid CSS gradient strings', () => {
		for (const name of IDENTITY_THEMES) {
			const preset = findPreset(name)
			if (!preset) throw new Error(`${name} preset missing`)
			expect(preset.gradient).toMatch(/^linear-gradient\(/)
		}
	})

	it('Amber is amber-dominant — red+green channel >= blue for all ANSI colors', () => {
		const amber = findPreset('Amber')
		if (!amber?.ansiColors) throw new Error('Amber preset missing')
		for (const [key, value] of Object.entries(amber.ansiColors)) {
			if (key === 'black') continue
			const [r, g, b] = hexToRgb(value)
			expect(r + g, `${key} (R+G) >= B`).toBeGreaterThanOrEqual(b)
		}
	})

	it('Vaporwave has intense glow — maximalist aesthetic', () => {
		const vaporwave = findPreset('Vaporwave')
		if (!vaporwave) throw new Error('Vaporwave preset missing')
		expect(vaporwave.glowLevel).toBe('intense')
	})

	it('Ocean is teal-dominant — green channel prominent in ANSI colors', () => {
		const ocean = findPreset('Ocean')
		if (!ocean?.ansiColors) throw new Error('Ocean preset missing')
		let tealCount = 0
		for (const [key, value] of Object.entries(ocean.ansiColors)) {
			if (key === 'black') continue
			const [r, g, b] = hexToRgb(value)
			if (g >= r && b >= r) tealCount++
		}
		expect(tealCount, 'most Ocean ANSI colors should be teal/blue-dominant').toBeGreaterThan(8)
	})

	it('Sunset uses warm tones — red channel prominent in ANSI colors', () => {
		const sunset = findPreset('Sunset')
		if (!sunset?.ansiColors) throw new Error('Sunset preset missing')
		let warmCount = 0
		for (const [key, value] of Object.entries(sunset.ansiColors)) {
			if (key === 'black') continue
			const [r, , b] = hexToRgb(value)
			if (r >= b) warmCount++
		}
		expect(warmCount, 'most Sunset ANSI colors should be warm (R >= B)').toBeGreaterThan(12)
	})

	it('Arctic uses cool tones — blue channel prominent in ANSI colors', () => {
		const arctic = findPreset('Arctic')
		if (!arctic?.ansiColors) throw new Error('Arctic preset missing')
		let coolCount = 0
		for (const [key, value] of Object.entries(arctic.ansiColors)) {
			if (key === 'black') continue
			const [r, , b] = hexToRgb(value)
			if (b >= r) coolCount++
		}
		expect(coolCount, 'most Arctic ANSI colors should be cool (B >= R)').toBeGreaterThan(12)
	})

	it('community themes do not have effects', () => {
		const community = [
			'Default Dark',
			'Dracula',
			'Tokyo Night',
			'Nord',
			'Catppuccin',
			'Gruvbox',
			'Monokai',
			'Solarized Light',
		]
		for (const name of community) {
			const preset = findPreset(name)
			if (!preset) throw new Error(`${name} preset missing`)
			expect(preset.gradient, `${name} should not have gradient`).toBeUndefined()
			expect(preset.gradientLevel, `${name} should not have gradientLevel`).toBeUndefined()
			expect(preset.glowLevel, `${name} should not have glowLevel`).toBeUndefined()
			expect(preset.scanlineLevel, `${name} should not have scanlineLevel`).toBeUndefined()
		}
	})
})
