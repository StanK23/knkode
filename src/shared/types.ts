/** Default unfocused pane dimming (moderate). */
export const DEFAULT_UNFOCUSED_DIM = 0.3
/** Maximum unfocused dim overlay opacity. UI clamps to [0, MAX_UNFOCUSED_DIM]. */
export const MAX_UNFOCUSED_DIM = 0.9

/** Default pane background opacity (fully opaque). */
export const DEFAULT_PANE_OPACITY = 1 as const
/** Minimum pane background opacity. UI clamps to [MIN_PANE_OPACITY, 1]. */
export const MIN_PANE_OPACITY = 0.05

export const CURSOR_STYLES = ['block', 'underline', 'bar'] as const
export type CursorStyle = (typeof CURSOR_STYLES)[number]

// Ordered by intensity, low to high — UI renders left-to-right in this order
export const EFFECT_LEVELS = ['off', 'subtle', 'medium', 'intense'] as const
export type EffectLevel = (typeof EFFECT_LEVELS)[number]

/** Opacity/intensity multiplier for each effect level. Applied to gradient div opacity,
 *  glow box-shadow alpha values, and scanline overlay opacity.
 *  All values are in [0, 1] so they can be used directly as CSS opacity. */
export const EFFECT_MULTIPLIERS: Record<EffectLevel, number> = {
	off: 0,
	subtle: 0.4,
	medium: 0.7,
	intense: 1.0,
} as const

export function isEffectLevel(v: unknown): v is EffectLevel {
	return typeof v === 'string' && (EFFECT_LEVELS as readonly string[]).includes(v)
}

export const DEFAULT_CURSOR_STYLE: CursorStyle = 'bar'
export const DEFAULT_SCROLLBACK = 5000
export const MIN_SCROLLBACK = 500
export const MAX_SCROLLBACK = 50000

export const DEFAULT_LINE_HEIGHT = 1.0
export const MIN_LINE_HEIGHT = 1.0
export const MAX_LINE_HEIGHT = 2.0

export function isCursorStyle(v: string): v is CursorStyle {
	return (CURSOR_STYLES as readonly string[]).includes(v)
}

/** ANSI 16-color palette for terminal themes. All values are hex strings (#RRGGBB). */
export interface AnsiColors {
	black: string
	red: string
	green: string
	yellow: string
	blue: string
	magenta: string
	cyan: string
	white: string
	brightBlack: string
	brightRed: string
	brightGreen: string
	brightYellow: string
	brightBlue: string
	brightMagenta: string
	brightCyan: string
	brightWhite: string
}

export interface PaneTheme {
	background: string
	foreground: string
	fontSize: number
	/** Black overlay opacity on unfocused panes. Clamped to [0, MAX_UNFOCUSED_DIM] by the UI. */
	unfocusedDim: number
	fontFamily?: string
	/** Terminal scrollback buffer size in lines. Valid: 500–50000. Defaults to DEFAULT_SCROLLBACK if omitted. */
	scrollback?: number
	/** Terminal cursor style. Defaults to DEFAULT_CURSOR_STYLE if omitted. */
	cursorStyle?: CursorStyle
	/** Terminal background opacity. MIN_PANE_OPACITY = near-transparent, 1 = fully opaque. Clamped to [MIN_PANE_OPACITY, 1] by the UI. Defaults to DEFAULT_PANE_OPACITY. */
	paneOpacity?: number
	/** ANSI 16-color palette. When omitted, xterm.js uses its built-in defaults. */
	ansiColors?: AnsiColors
	/** UI accent color (buttons, focus rings, active tab indicators). Auto-derived if omitted. */
	accent?: string
	/** Glow color for theme effects (box-shadow). No glow when omitted. */
	glow?: string
	/** CSS gradient overlay on terminal panes. Applied as a low-opacity overlay. */
	gradient?: string
	/** Gradient overlay intensity. Controls the div opacity via EFFECT_MULTIPLIERS. */
	gradientLevel?: EffectLevel
	/** Glow effect intensity. Controls box-shadow alpha scaling via EFFECT_MULTIPLIERS. */
	glowLevel?: EffectLevel
	/** CRT scanline overlay intensity. Controls scanline opacity via EFFECT_MULTIPLIERS. */
	scanlineLevel?: EffectLevel
	/** Noise/grain overlay intensity. Static texture for film/CRT aesthetic. */
	noiseLevel?: EffectLevel
	/** Scrollbar thumb accent color intensity. Uses glow/accent color. */
	scrollbarAccent?: EffectLevel
	/** Custom cursor color (hex). Falls back to foreground when omitted. */
	cursorColor?: string
	/** Custom selection highlight color (hex). Falls back to foreground+alpha when omitted. */
	selectionColor?: string
	/** Terminal line height multiplier. Range [1.0, 2.0]. Defaults to DEFAULT_LINE_HEIGHT. */
	lineHeight?: number
	/** Theme preset name — links to THEME_PRESETS for full identity. */
	preset?: string
}

export interface PaneConfig {
	label: string
	cwd: string
	startupCommand: string | null
	themeOverride: Partial<PaneTheme> | null
}

export type SplitDirection = 'horizontal' | 'vertical'
export type DropPosition = 'left' | 'right' | 'top' | 'bottom'

export interface LayoutLeaf {
	paneId: string
	size: number
}

export interface LayoutBranch {
	direction: SplitDirection
	size: number
	children: LayoutNode[]
}

export type LayoutNode = LayoutLeaf | LayoutBranch

export function isLayoutBranch(node: LayoutNode): node is LayoutBranch {
	return 'children' in node
}

export type LayoutPreset = 'single' | '2-column' | '2-row' | '3-panel-l' | '3-panel-t' | '2x2-grid'

export type WorkspaceLayout =
	| { type: 'preset'; preset: LayoutPreset; tree: LayoutNode }
	| { type: 'custom'; tree: LayoutNode }

export interface Workspace {
	id: string
	name: string
	color: string
	theme: PaneTheme
	layout: WorkspaceLayout
	panes: Record<string, PaneConfig>
}

export interface AppState {
	openWorkspaceIds: string[]
	activeWorkspaceId: string | null
	windowBounds: {
		x: number
		y: number
		width: number
		height: number
	}
}

/** A reusable shell command that can be executed in any terminal pane. */
export interface Snippet {
	readonly id: string
	readonly name: string
	readonly command: string
}

/** PR info for a pane's current branch. */
export interface PrInfo {
	readonly number: number
	readonly url: string
	readonly title: string
}

// IPC channel names
export const IPC = {
	// Config
	CONFIG_GET_WORKSPACES: 'config:get-workspaces',
	CONFIG_SAVE_WORKSPACE: 'config:save-workspace',
	CONFIG_DELETE_WORKSPACE: 'config:delete-workspace',
	CONFIG_GET_APP_STATE: 'config:get-app-state',
	CONFIG_SAVE_APP_STATE: 'config:save-app-state',
	CONFIG_GET_SNIPPETS: 'config:get-snippets',
	CONFIG_SAVE_SNIPPETS: 'config:save-snippets',

	// App
	APP_GET_HOME_DIR: 'app:get-home-dir',
	APP_OPEN_EXTERNAL: 'app:open-external',

	// PTY
	PTY_CREATE: 'pty:create',
	PTY_WRITE: 'pty:write',
	PTY_RESIZE: 'pty:resize',
	PTY_KILL: 'pty:kill',
	PTY_DATA: 'pty:data',
	PTY_EXIT: 'pty:exit',
	PTY_CWD_CHANGED: 'pty:cwd-changed',
	PTY_BRANCH_CHANGED: 'pty:branch-changed',
	PTY_PR_CHANGED: 'pty:pr-changed',
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
