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
> & { name: string }

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
		accent: '#6c63ff',
		ansiColors: DEFAULT_ANSI,
	},
	{
		name: 'Dracula',
		background: '#282a36',
		foreground: '#f8f8f2',
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
		accent: '#ff2a6d',
		glow: '#ff2a6d',
		gradient: 'linear-gradient(135deg, rgba(255, 42, 109, 0.3) 0%, rgba(5, 217, 232, 0.2) 100%)',
		gradientLevel: 'medium',
		glowLevel: 'medium',



		scrollbarAccent: 'medium',
		cursorColor: '#ff2a6d',
		selectionColor: '#05d9e8',
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
		accent: '#9945ff',
		glow: '#14f195',
		gradient: 'linear-gradient(160deg, rgba(153, 69, 255, 0.3) 0%, rgba(20, 241, 149, 0.2) 100%)',
		gradientLevel: 'medium',
		glowLevel: 'medium',



		scrollbarAccent: 'medium',
		cursorColor: '#14f195',
		selectionColor: '#9945ff',
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
	// ── Light themes ─────────────────────────────────────────────
	{
		name: 'Solarized Light',
		background: '#fdf6e3',
		foreground: '#586e75',
		accent: '#268bd2',
		ansiColors: SOLARIZED_ANSI,
	},
] as const satisfies readonly ThemePreset[]

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
