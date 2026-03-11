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
 *  glow box-shadow alpha values, scanline overlay opacity, noise overlay opacity,
 *  and scrollbar accent color alpha.
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
	readonly black: string
	readonly red: string
	readonly green: string
	readonly yellow: string
	readonly blue: string
	readonly magenta: string
	readonly cyan: string
	readonly white: string
	readonly brightBlack: string
	readonly brightRed: string
	readonly brightGreen: string
	readonly brightYellow: string
	readonly brightBlue: string
	readonly brightMagenta: string
	readonly brightCyan: string
	readonly brightWhite: string
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
	/** Status bar position. Defaults to 'top' */
	statusBarPosition?: 'top' | 'bottom'
}

export interface PaneConfig {
	readonly label: string
	readonly cwd: string
	readonly startupCommand: string | null
	readonly themeOverride: Partial<PaneTheme> | null
}

export type SplitDirection = 'horizontal' | 'vertical'
export type DropPosition = 'left' | 'right' | 'top' | 'bottom'

export interface LayoutLeaf {
	readonly paneId: string
	readonly size: number
}

export interface LayoutBranch {
	readonly direction: SplitDirection
	readonly size: number
	readonly children: readonly LayoutNode[]
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
	readonly id: string
	readonly name: string
	readonly color: string
	readonly theme: PaneTheme
	readonly layout: WorkspaceLayout
	readonly panes: Record<string, PaneConfig>
}

export interface AppState {
	readonly openWorkspaceIds: readonly string[]
	readonly activeWorkspaceId: string | null
	readonly windowBounds: {
		readonly x: number
		readonly y: number
		readonly width: number
		readonly height: number
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
