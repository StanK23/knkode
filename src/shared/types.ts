/** Default unfocused pane dimming (moderate). UI range: [0, 0.7]. */
export const DEFAULT_UNFOCUSED_DIM = 0.3

export const CURSOR_STYLES = ['block', 'underline', 'bar'] as const
export type CursorStyle = (typeof CURSOR_STYLES)[number]

export const DEFAULT_CURSOR_STYLE: CursorStyle = 'bar'
export const DEFAULT_SCROLLBACK = 5000
export const MIN_SCROLLBACK = 500
export const MAX_SCROLLBACK = 50000

export function isCursorStyle(v: string): v is CursorStyle {
	return (CURSOR_STYLES as readonly string[]).includes(v)
}

export interface PaneTheme {
	background: string
	foreground: string
	fontSize: number
	/** Black overlay opacity on unfocused panes. Clamped to [0, 0.7] by the UI. */
	unfocusedDim: number
	fontFamily?: string
	/** Terminal scrollback buffer size in lines. Valid: 500–50000. Defaults to DEFAULT_SCROLLBACK if omitted. */
	scrollback?: number
	/** Terminal cursor style. Defaults to DEFAULT_CURSOR_STYLE if omitted. */
	cursorStyle?: CursorStyle
}

export interface PaneConfig {
	label: string
	cwd: string
	startupCommand: string | null
	themeOverride: Partial<PaneTheme> | null
}

export type SplitDirection = 'horizontal' | 'vertical'

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

// IPC channel names
export const IPC = {
	// Config
	CONFIG_GET_WORKSPACES: 'config:get-workspaces',
	CONFIG_SAVE_WORKSPACE: 'config:save-workspace',
	CONFIG_DELETE_WORKSPACE: 'config:delete-workspace',
	CONFIG_GET_APP_STATE: 'config:get-app-state',
	CONFIG_SAVE_APP_STATE: 'config:save-app-state',

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
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
