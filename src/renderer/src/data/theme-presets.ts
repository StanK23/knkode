export interface ThemePreset {
	name: string
	background: string
	foreground: string
}

export const THEME_PRESETS: ThemePreset[] = [
	{ name: 'Default Dark', background: '#1a1a2e', foreground: '#e0e0e0' },
	{ name: 'Dracula', background: '#282a36', foreground: '#f8f8f2' },
	{ name: 'One Dark', background: '#282c34', foreground: '#abb2bf' },
	{ name: 'Solarized Dark', background: '#002b36', foreground: '#839496' },
	{ name: 'Tokyo Night', background: '#1a1b26', foreground: '#a9b1d6' },
	{ name: 'GitHub Dark', background: '#0d1117', foreground: '#c9d1d9' },
	{ name: 'Monokai', background: '#272822', foreground: '#f8f8f2' },
]

export const TERMINAL_FONTS = [
	'JetBrains Mono',
	'Fira Code',
	'Source Code Pro',
	'Cascadia Code',
	'SF Mono',
	'Menlo',
	'Monaco',
	'Consolas',
]

export const DEFAULT_FONT_FAMILY = 'JetBrains Mono, Menlo, Monaco, Consolas, monospace'
