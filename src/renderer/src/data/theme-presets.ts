import type { PaneTheme } from '../../../shared/types'
import { resolveBackground } from '../utils/colors'

type ThemePreset = Pick<PaneTheme, 'background' | 'foreground'> & { name: string }

export const THEME_PRESETS = [
	// Dark themes
	{ name: 'Default Dark', background: '#1a1a2e', foreground: '#e0e0e0' },
	{ name: 'Dracula', background: '#282a36', foreground: '#f8f8f2' },
	{ name: 'One Dark', background: '#282c34', foreground: '#abb2bf' },
	{ name: 'Solarized Dark', background: '#002b36', foreground: '#839496' },
	{ name: 'Tokyo Night', background: '#1a1b26', foreground: '#a9b1d6' },
	{ name: 'GitHub Dark', background: '#0d1117', foreground: '#c9d1d9' },
	{ name: 'Monokai', background: '#272822', foreground: '#f8f8f2' },
	{ name: 'Nord', background: '#2e3440', foreground: '#d8dee9' },
	{ name: 'Catppuccin', background: '#1e1e2e', foreground: '#cdd6f4' },
	{ name: 'Gruvbox', background: '#282828', foreground: '#ebdbb2' },
	{ name: 'Rosé Pine', background: '#191724', foreground: '#e0def4' },
	{ name: 'Kanagawa', background: '#1f1f28', foreground: '#dcd7ba' },
	// Light themes
	{ name: 'Solarized Light', background: '#fdf6e3', foreground: '#586e75' },
	{ name: 'GitHub Light', background: '#ffffff', foreground: '#24292f' },
	{ name: 'One Light', background: '#fafafa', foreground: '#383a42' },
	{ name: 'Rosé Pine Dawn', background: '#faf4ed', foreground: '#575279' },
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

// Fallbacks intentionally overlap with TERMINAL_FONTS; browsers deduplicate font names
const FONT_FALLBACKS = 'Menlo, Monaco, Consolas, monospace'

export const DEFAULT_FONT_FAMILY = `${TERMINAL_FONTS[0]}, ${FONT_FALLBACKS}`

export function buildFontFamily(family?: string): string {
	return family ? `${family}, ${FONT_FALLBACKS}` : DEFAULT_FONT_FAMILY
}

/** Build xterm.js theme options from a PaneTheme's color fields.
 *  When opacity < 1, the background is converted to an rgba value for translucency. */
export function buildXtermTheme(
	t: Pick<PaneTheme, 'background' | 'foreground'>,
	opacity: number = 1,
): { background: string; foreground: string; cursor: string; selectionBackground: string } {
	return {
		background: resolveBackground(t.background, opacity),
		foreground: t.foreground,
		cursor: t.foreground,
		selectionBackground: `${t.foreground}33`,
	}
}
