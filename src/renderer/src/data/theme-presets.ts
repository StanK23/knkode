import type { ITheme } from '@xterm/xterm'
import type { AnsiColors, PaneTheme } from '../../../shared/types'
import { isValidHex, resolveBackground } from '../utils/colors'

export type ThemePreset = Pick<
	PaneTheme,
	| 'background'
	| 'foreground'
	| 'ansiColors'
	| 'accent'
	| 'glow'
	| 'gradient'
	| 'gradientLevel'
	| 'glowLevel'
	| 'scanlineLevel'
	| 'noiseLevel'
	| 'scrollbarAccent'
	| 'cursorColor'
	| 'selectionColor'
	| 'fontFamily'
	| 'fontSize'
	| 'lineHeight'
> & { name: string; decoration?: string }

/** Tango-based ANSI palette used by the Default Dark preset. */
const DEFAULT_ANSI: AnsiColors = {
	black: '#000000',
	red: '#cc0000',
	green: '#4e9a06',
	yellow: '#c4a000',
	blue: '#3465a4',
	magenta: '#75507b',
	cyan: '#06989a',
	white: '#d3d7cf',
	brightBlack: '#555753',
	brightRed: '#ef2929',
	brightGreen: '#8ae234',
	brightYellow: '#fce94f',
	brightBlue: '#729fcf',
	brightMagenta: '#ad7fa8',
	brightCyan: '#34e2e2',
	brightWhite: '#eeeeec',
}

/** Solarized ANSI palette used by the Solarized Light preset. */
const SOLARIZED_ANSI: AnsiColors = {
	black: '#073642',
	red: '#dc322f',
	green: '#859900',
	yellow: '#b58900',
	blue: '#268bd2',
	magenta: '#d33682',
	cyan: '#2aa198',
	white: '#eee8d5',
	brightBlack: '#586e75',
	brightRed: '#cb4b16',
	brightGreen: '#859900',
	brightYellow: '#b58900',
	brightBlue: '#268bd2',
	brightMagenta: '#6c71c4',
	brightCyan: '#2aa198',
	brightWhite: '#fdf6e3',
}

export const THEME_PRESETS = [
	// ── Dark themes ──────────────────────────────────────────────
	{
		name: 'Default Dark',
		background: '#1a1a2e',
		foreground: '#e0e0e0',
		fontFamily: 'cascadia-code',
		accent: '#6c63ff',
		ansiColors: DEFAULT_ANSI,
	},
	{
		name: 'Dracula',
		background: '#282a36',
		foreground: '#f8f8f2',
		fontFamily: 'fira-code',
		accent: '#bd93f9',
		glow: '#bd93f9',
		ansiColors: {
			black: '#21222c',
			red: '#ff5555',
			green: '#50fa7b',
			yellow: '#f1fa8c',
			blue: '#bd93f9',
			magenta: '#ff79c6',
			cyan: '#8be9fd',
			white: '#f8f8f2',
			brightBlack: '#6272a4',
			brightRed: '#ff6e6e',
			brightGreen: '#69ff94',
			brightYellow: '#ffffa5',
			brightBlue: '#d6acff',
			brightMagenta: '#ff92df',
			brightCyan: '#a4ffff',
			brightWhite: '#ffffff',
		},
	},
	{
		name: 'Tokyo Night',
		background: '#1a1b26',
		foreground: '#a9b1d6',
		fontFamily: 'fira-code',
		accent: '#7aa2f7',
		glow: '#7aa2f7',
		ansiColors: {
			black: '#15161e',
			red: '#f7768e',
			green: '#9ece6a',
			yellow: '#e0af68',
			blue: '#7aa2f7',
			magenta: '#bb9af7',
			cyan: '#7dcfff',
			white: '#a9b1d6',
			brightBlack: '#414868',
			brightRed: '#f7768e',
			brightGreen: '#9ece6a',
			brightYellow: '#e0af68',
			brightBlue: '#7aa2f7',
			brightMagenta: '#bb9af7',
			brightCyan: '#7dcfff',
			brightWhite: '#c0caf5',
		},
	},
	{
		name: 'Nord',
		background: '#2e3440',
		foreground: '#d8dee9',
		fontFamily: 'victor-mono',
		accent: '#88c0d0',
		ansiColors: {
			black: '#3b4252',
			red: '#bf616a',
			green: '#a3be8c',
			yellow: '#ebcb8b',
			blue: '#81a1c1',
			magenta: '#b48ead',
			cyan: '#88c0d0',
			white: '#e5e9f0',
			brightBlack: '#4c566a',
			brightRed: '#bf616a',
			brightGreen: '#a3be8c',
			brightYellow: '#ebcb8b',
			brightBlue: '#81a1c1',
			brightMagenta: '#b48ead',
			brightCyan: '#8fbcbb',
			brightWhite: '#eceff4',
		},
	},
	{
		name: 'Catppuccin',
		background: '#1e1e2e',
		foreground: '#cdd6f4',
		fontFamily: 'jetbrains-mono',
		accent: '#cba6f7',
		glow: '#cba6f7',
		ansiColors: {
			black: '#45475a',
			red: '#f38ba8',
			green: '#a6e3a1',
			yellow: '#f9e2af',
			blue: '#89b4fa',
			magenta: '#cba6f7',
			cyan: '#94e2d5',
			white: '#bac2de',
			brightBlack: '#585b70',
			brightRed: '#f38ba8',
			brightGreen: '#a6e3a1',
			brightYellow: '#f9e2af',
			brightBlue: '#89b4fa',
			brightMagenta: '#cba6f7',
			brightCyan: '#94e2d5',
			brightWhite: '#a6adc8',
		},
	},
	{
		name: 'Gruvbox',
		background: '#282828',
		foreground: '#ebdbb2',
		fontFamily: 'ibm-plex-mono',
		accent: '#fe8019',
		ansiColors: {
			black: '#282828',
			red: '#cc241d',
			green: '#98971a',
			yellow: '#d79921',
			blue: '#458588',
			magenta: '#b16286',
			cyan: '#689d6a',
			white: '#a89984',
			brightBlack: '#928374',
			brightRed: '#fb4934',
			brightGreen: '#b8bb26',
			brightYellow: '#fabd2f',
			brightBlue: '#83a598',
			brightMagenta: '#d3869b',
			brightCyan: '#8ec07c',
			brightWhite: '#ebdbb2',
		},
	},
	{
		name: 'Monokai',
		background: '#272822',
		foreground: '#f8f8f2',
		fontFamily: 'source-code-pro',
		accent: '#a6e22e',
		ansiColors: {
			black: '#272822',
			red: '#f92672',
			green: '#a6e22e',
			yellow: '#f4bf75',
			blue: '#66d9ef',
			magenta: '#ae81ff',
			cyan: '#a1efe4',
			white: '#f8f8f2',
			brightBlack: '#75715e',
			brightRed: '#f92672',
			brightGreen: '#a6e22e',
			brightYellow: '#f4bf75',
			brightBlue: '#66d9ef',
			brightMagenta: '#ae81ff',
			brightCyan: '#a1efe4',
			brightWhite: '#f9f8f5',
		},
	},
	// ── Identity themes (brand/aesthetic identity, always have accent + glow) ──
	{
		name: 'Matrix',
		background: '#0a0a0a',
		foreground: '#00ff41',
		fontFamily: 'ibm-plex-mono',
		accent: '#00ff41',
		glow: '#00ff41',
		gradient: 'linear-gradient(180deg, rgba(0, 255, 65, 0.3) 0%, transparent 40%)',
		gradientLevel: 'medium',
		glowLevel: 'medium',
		scanlineLevel: 'subtle',
		noiseLevel: 'subtle',
		scrollbarAccent: 'medium',
		cursorColor: '#00ff41',
		selectionColor: '#00ff41',
		// Digital rain — SVG data URI phosphor matrix characters
		decoration: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='0' y='10' font-family='monospace' font-size='10' fill='%2300ff41' fill-opacity='0.1'%3E1 0 1%3C/text%3E%3Ctext x='15' y='25' font-family='monospace' font-size='10' fill='%2300ff41' fill-opacity='0.05'%3E0 1 0%3C/text%3E%3Ctext x='5' y='40' font-family='monospace' font-size='10' fill='%2300ff41' fill-opacity='0.15'%3E1 1 1%3C/text%3E%3C/svg%3E")`,
		ansiColors: {
			black: '#0a0a0a',
			red: '#00cc33',
			green: '#00ff41',
			yellow: '#33ff77',
			blue: '#009933',
			magenta: '#00ff99',
			cyan: '#66ffcc',
			white: '#b3ffb3',
			brightBlack: '#1a4d2e',
			brightRed: '#00ff66',
			brightGreen: '#39ff14',
			brightYellow: '#99ffcc',
			brightBlue: '#00cc66',
			brightMagenta: '#33ff99',
			brightCyan: '#66ffaa',
			brightWhite: '#ccffcc',
		},
	},
	{
		name: 'Cyberpunk',
		background: '#0d0221',
		foreground: '#f0e6ff',
		fontFamily: 'fira-code',
		accent: '#ff2a6d',
		glow: '#ff2a6d',
		gradient: 'linear-gradient(135deg, rgba(255, 42, 109, 0.3) 0%, rgba(5, 217, 232, 0.2) 100%)',
		gradientLevel: 'medium',
		glowLevel: 'medium',
		statusBarPosition: 'bottom',

		scrollbarAccent: 'medium',
		cursorColor: '#ff2a6d',
		selectionColor: '#05d9e8',
		// Diagonal accent blocks at opposite corners (matching SVG widget)
		decoration:
			'linear-gradient(135deg, transparent 60%, rgba(255,42,109,0.1) 75%, rgba(255,42,109,0.06) 100%) no-repeat, linear-gradient(315deg, transparent 70%, rgba(5,217,232,0.07) 85%, rgba(5,217,232,0.04) 100%) no-repeat',
		ansiColors: {
			black: '#0d0221',
			red: '#ff2a6d',
			green: '#05d9e8',
			yellow: '#fef08a',
			blue: '#01c5c4',
			magenta: '#b967ff',
			cyan: '#05d9e8',
			white: '#f0e6ff',
			brightBlack: '#2e1065',
			brightRed: '#ff6e96',
			brightGreen: '#44f1f4',
			brightYellow: '#fff59d',
			brightBlue: '#7df9ff',
			brightMagenta: '#d4aaff',
			brightCyan: '#76f4f8',
			brightWhite: '#ffffff',
		},
	},
	{
		name: 'Solana',
		background: '#0c0c1d',
		foreground: '#e0e0f0',
		fontFamily: 'roboto-mono',
		accent: '#9945ff',
		glow: '#14f195',
		gradient: 'linear-gradient(160deg, rgba(153, 69, 255, 0.3) 0%, rgba(20, 241, 149, 0.2) 100%)',
		gradientLevel: 'medium',
		glowLevel: 'medium',

		scrollbarAccent: 'medium',
		cursorColor: '#14f195',
		selectionColor: '#9945ff',
		// Soft orbs at opposite corners (matching SVG widget circles)
		decoration:
			'radial-gradient(circle at 82% 27%, rgba(153,69,255,0.07) 0%, transparent 40%), radial-gradient(circle at 18% 80%, rgba(20,241,149,0.05) 0%, transparent 35%)',
		ansiColors: {
			black: '#0c0c1d',
			red: '#ff6b6b',
			green: '#14f195',
			yellow: '#ffd93d',
			blue: '#9945ff',
			magenta: '#c77dff',
			cyan: '#00d4aa',
			white: '#e0e0f0',
			brightBlack: '#3d3d5c',
			brightRed: '#ff8a8a',
			brightGreen: '#47f5ad',
			brightYellow: '#ffe066',
			brightBlue: '#b380ff',
			brightMagenta: '#daa6ff',
			brightCyan: '#33e6c0',
			brightWhite: '#f5f5ff',
		},
	},
	{
		name: 'Amber',
		background: '#0c0800',
		foreground: '#ffb000',
		fontFamily: 'ibm-plex-mono',
		accent: '#ffb000',
		glow: '#ffb000',
		gradient: 'linear-gradient(180deg, rgba(255, 176, 0, 0.25) 0%, transparent 40%)',
		gradientLevel: 'medium',
		glowLevel: 'medium',
		scanlineLevel: 'subtle',
		noiseLevel: 'subtle',
		scrollbarAccent: 'medium',
		cursorColor: '#ffb000',
		selectionColor: '#e09000',
		// CRT phosphor — center glow (matching SVG widget radial)
		decoration:
			'radial-gradient(ellipse 70% 70% at 50% 50%, rgba(255,176,0,0.06) 0%, transparent 60%)',
		ansiColors: {
			black: '#0c0800',
			red: '#cc7a00',
			green: '#ffb000',
			yellow: '#ffcc44',
			blue: '#8a5a10',
			magenta: '#e09000',
			cyan: '#d4a030',
			white: '#ffe0a0',
			brightBlack: '#5c3d10',
			brightRed: '#ff9020',
			brightGreen: '#ffbb33',
			brightYellow: '#ffdd77',
			brightBlue: '#b37a00',
			brightMagenta: '#ffcc55',
			brightCyan: '#e8b040',
			brightWhite: '#fff2d5',
		},
	},
	{
		name: 'Vaporwave',
		background: '#0a0015',
		foreground: '#f0d0ff',
		fontFamily: 'ubuntu-mono',
		accent: '#ff2d95',
		glow: '#ff71ce',
		gradient:
			'linear-gradient(135deg, rgba(255, 45, 149, 0.3) 0%, rgba(1, 205, 254, 0.2) 50%, rgba(123, 47, 255, 0.25) 100%)',
		gradientLevel: 'medium',
		glowLevel: 'intense',
		statusBarPosition: 'bottom',
		scrollbarAccent: 'medium',
		cursorColor: '#01cdfe',
		selectionColor: '#7b2fff',
		// Retro perspective grid in bottom half (matching SVG widget)
		decoration:
			'linear-gradient(0deg, rgba(255,113,206,0.06) 0px, rgba(255,113,206,0.06) 1px, transparent 1px) no-repeat 0 68% / 100% 1px, linear-gradient(0deg, rgba(255,113,206,0.06) 0px, rgba(255,113,206,0.06) 1px, transparent 1px) no-repeat 0 78% / 100% 1px, linear-gradient(0deg, rgba(255,113,206,0.06) 0px, rgba(255,113,206,0.06) 1px, transparent 1px) no-repeat 0 90% / 100% 1px, linear-gradient(180deg, transparent 60%, rgba(123,47,255,0.06) 100%)',
		ansiColors: {
			black: '#0a0015',
			red: '#ff2d95',
			green: '#05ffa1',
			yellow: '#ffe900',
			blue: '#7b2fff',
			magenta: '#ff71ce',
			cyan: '#01cdfe',
			white: '#f0d0ff',
			brightBlack: '#2d1b4e',
			brightRed: '#ff6eb4',
			brightGreen: '#44ffbb',
			brightYellow: '#fffc7e',
			brightBlue: '#a855f7',
			brightMagenta: '#ff9de2',
			brightCyan: '#67e8f9',
			brightWhite: '#ffffff',
		},
	},
	{
		name: 'Ocean',
		background: '#020b14',
		foreground: '#a0d8e8',
		fontFamily: 'jetbrains-mono',
		accent: '#00c8ff',
		glow: '#00e5b0',
		gradient:
			'linear-gradient(180deg, rgba(0, 200, 255, 0.2) 0%, rgba(0, 229, 176, 0.1) 30%, transparent 60%)',
		gradientLevel: 'medium',
		glowLevel: 'medium',
		scrollbarAccent: 'medium',
		cursorColor: '#00e5b0',
		selectionColor: '#0070a0',
		// Bioluminescent glow (matching SVG widget radial + dots)
		decoration:
			'radial-gradient(ellipse 50% 50% at 30% 40%, rgba(0,200,255,0.08) 0%, transparent 50%)',
		ansiColors: {
			black: '#020b14',
			red: '#1e8fa0',
			green: '#00e5b0',
			yellow: '#4dd8e0',
			blue: '#0070a0',
			magenta: '#3a80b8',
			cyan: '#00c8ff',
			white: '#b0d8e8',
			brightBlack: '#14384f',
			brightRed: '#40b8cc',
			brightGreen: '#30ffc8',
			brightYellow: '#78e8ee',
			brightBlue: '#2890b8',
			brightMagenta: '#5aa0cc',
			brightCyan: '#44d8f0',
			brightWhite: '#d0eff8',
		},
	},
	{
		name: 'Sunset',
		background: '#110808',
		foreground: '#f0d0a0',
		fontFamily: 'hack',
		accent: '#e8a040',
		glow: '#e04028',
		gradient:
			'linear-gradient(180deg, rgba(255, 192, 64, 0.25) 0%, rgba(224, 64, 40, 0.15) 50%, transparent 80%)',
		gradientLevel: 'medium',
		glowLevel: 'medium',
		noiseLevel: 'subtle',
		scrollbarAccent: 'medium',
		cursorColor: '#ffc040',
		selectionColor: '#e04028',
		// Ember glow from top center (matching SVG widget radial)
		decoration:
			'radial-gradient(ellipse 60% 60% at 50% 20%, rgba(232,160,64,0.08) 0%, transparent 50%)',
		ansiColors: {
			black: '#110808',
			red: '#e04028',
			green: '#e09838',
			yellow: '#ffc040',
			blue: '#b83820',
			magenta: '#cc6038',
			cyan: '#e8a050',
			white: '#f0d8b0',
			brightBlack: '#4d2418',
			brightRed: '#ff5040',
			brightGreen: '#f0b048',
			brightYellow: '#ffd880',
			brightBlue: '#d04830',
			brightMagenta: '#e87858',
			brightCyan: '#ffb070',
			brightWhite: '#fff0d8',
		},
	},
	{
		name: 'Arctic',
		background: '#050d18',
		foreground: '#c8e4f0',
		accent: '#48c8e0',
		glow: '#70e8cc',
		gradient:
			'linear-gradient(180deg, rgba(112, 232, 204, 0.15) 0%, rgba(72, 200, 224, 0.1) 30%, transparent 50%)',
		gradientLevel: 'medium',
		glowLevel: 'medium',
		scrollbarAccent: 'medium',
		cursorColor: '#a0e0f8',
		selectionColor: '#3878a0',
		// Faint crystalline lines at corners (matching SVG widget)
		decoration:
			'linear-gradient(150deg, transparent 55%, rgba(72,200,224,0.04) 80%, transparent 95%) no-repeat 100% 0 / 30% 35%, linear-gradient(330deg, transparent 60%, rgba(72,200,224,0.03) 85%, transparent 100%) no-repeat 0 70% / 25% 30%',
		ansiColors: {
			black: '#050d18',
			red: '#5898b8',
			green: '#70e8cc',
			yellow: '#a0e0f8',
			blue: '#3878a0',
			magenta: '#7898c0',
			cyan: '#48c8e0',
			white: '#d0e8f0',
			brightBlack: '#1e3550',
			brightRed: '#78b8d0',
			brightGreen: '#88f0dd',
			brightYellow: '#b8f0ff',
			brightBlue: '#5090b0',
			brightMagenta: '#98b8d8',
			brightCyan: '#68d8ee',
			brightWhite: '#f0f8ff',
		},
	},
	// ── Light themes ─────────────────────────────────────────────
	{
		name: 'Solarized Light',
		background: '#fdf6e3',
		foreground: '#586e75',
		fontFamily: 'inconsolata',
		accent: '#268bd2',
		ansiColors: SOLARIZED_ANSI,
	},
] as const satisfies readonly ThemePreset[]

/** Union of all theme preset names. Used for compile-time variant completeness checks. */
export type ThemePresetName = (typeof THEME_PRESETS)[number]['name']

export const TERMINAL_FONTS = [
	'JetBrains Mono',
	'Fira Code',
	'Source Code Pro',
	'Cascadia Code',
	'SF Mono',
	'Menlo',
	'Monaco',
	'Consolas',
	'IBM Plex Mono',
	'Hack',
	'Inconsolata',
	'Ubuntu Mono',
	'Roboto Mono',
	'Victor Mono',
] as const

// Fallbacks intentionally overlap with TERMINAL_FONTS; unavailable fonts are skipped
const FONT_FALLBACKS = 'Menlo, Monaco, Consolas, monospace'

export const DEFAULT_FONT_FAMILY = `${TERMINAL_FONTS[0]}, ${FONT_FALLBACKS}`

export function buildFontFamily(family?: string): string {
	if (family && (TERMINAL_FONTS as readonly string[]).includes(family)) {
		return `${family}, ${FONT_FALLBACKS}`
	}
	return DEFAULT_FONT_FAMILY
}

/** Build xterm.js theme options from a PaneTheme's color fields.
 *  When opacity < 1, the background is converted to an rgba value for translucency.
 *  ANSI colors are validated before passing to xterm — invalid values are skipped. */
export function buildXtermTheme(
	t: Pick<PaneTheme, 'background' | 'foreground' | 'ansiColors' | 'cursorColor' | 'selectionColor'>,
	opacity = 1,
): ITheme {
	const theme: ITheme = {
		background: resolveBackground(t.background, opacity),
		foreground: t.foreground,
		cursor: t.cursorColor && isValidHex(t.cursorColor) ? t.cursorColor : t.foreground,
		selectionBackground:
			t.selectionColor && isValidHex(t.selectionColor)
				? `${t.selectionColor}55`
				: `${t.foreground}33`,
	}

	if (t.ansiColors) {
		for (const [key, value] of Object.entries(t.ansiColors)) {
			if (isValidHex(value)) {
				;(theme as Record<string, string>)[key] = value
			}
		}
	}

	return theme
}

export const DEFAULT_PRESET_NAME = THEME_PRESETS[0].name

/** Look up a theme preset by name. Returns undefined if not found. */
export function findPreset(name: string): ThemePreset | undefined {
	return THEME_PRESETS.find((p) => p.name === name)
}
