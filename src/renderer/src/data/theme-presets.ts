import type { PaneTheme } from '../../../shared/types'

export type ThemePreset = Pick<PaneTheme, 'background' | 'foreground'> & { name: string }

export const THEME_PRESETS = [
	{ name: 'Default Dark', background: '#1a1a2e', foreground: '#e0e0e0' },
	{ name: 'Dracula', background: '#282a36', foreground: '#f8f8f2' },
	{ name: 'One Dark', background: '#282c34', foreground: '#abb2bf' },
	{ name: 'Solarized Dark', background: '#002b36', foreground: '#839496' },
	{ name: 'Tokyo Night', background: '#1a1b26', foreground: '#a9b1d6' },
	{ name: 'GitHub Dark', background: '#0d1117', foreground: '#c9d1d9' },
	{ name: 'Monokai', background: '#272822', foreground: '#f8f8f2' },
	{ name: 'Nord', background: '#2e3440', foreground: '#d8dee9' },
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
] as const

const FONT_FALLBACKS = 'Menlo, Monaco, Consolas, monospace'

export const DEFAULT_FONT_FAMILY = `${TERMINAL_FONTS[0]}, ${FONT_FALLBACKS}`

export function buildFontFamily(family?: string): string {
	return family ? `${family}, ${FONT_FALLBACKS}` : DEFAULT_FONT_FAMILY
}

/** Build xterm.js theme options from a PaneTheme's color fields. */
export function buildXtermTheme(t: Pick<PaneTheme, 'background' | 'foreground'>) {
	return {
		background: t.background,
		foreground: t.foreground,
		cursor: t.foreground,
		selectionBackground: `${t.foreground}33`,
	}
}
