/** Default unfocused pane dimming (moderate). UI range: [0, 0.7]. */
export const DEFAULT_UNFOCUSED_DIM = 0.3

/** Default pane background opacity (fully opaque). UI range: [0.1, 1]. */
export const DEFAULT_PANE_OPACITY = 1 as const

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
	/** Terminal background opacity. 0.1 = near-transparent, 1 = fully opaque. Clamped to [0.1, 1] by the UI. Defaults to DEFAULT_PANE_OPACITY. */
	paneOpacity?: number
}

export const LAUNCH_MODES = ['claude-code', 'gemini-cli', 'terminal'] as const
export type LaunchMode = (typeof LAUNCH_MODES)[number]

export interface PaneConfig {
	label: string
	cwd: string
	startupCommand: string | null
	themeOverride: Partial<PaneTheme> | null
	/** How this pane was launched. null = show launcher overlay (new panes). Missing = treat as 'terminal' (backwards compat). */
	launchMode?: LaunchMode | null
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
	/** Workspace-level working directory. Pane CWD overrides this. Falls back to os.homedir(). */
	cwd?: string
	/** Per-agent CLI flags (e.g. "--model opus"). Keyed by LaunchableAgent. */
	agentFlags?: Partial<Record<LaunchableAgent, string>>
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

// Agent detection
export const AGENT_TYPES = [
	'claude-code',
	'codex',
	'gemini-cli',
	'aider',
	'opencode',
	'kilo-code',
] as const
export type AgentType = (typeof AGENT_TYPES)[number]

/** Map process executable names to agent types.
 *  Lookup returns undefined for unknown process names. */
export const PROCESS_TO_AGENT: Partial<Record<string, AgentType>> = {
	claude: 'claude-code',
	'claude-code': 'claude-code',
	codex: 'codex',
	gemini: 'gemini-cli',
	aider: 'aider',
	opencode: 'opencode',
	'kilo-code': 'kilo-code',
	kilo: 'kilo-code',
}

export interface ProcessInfo {
	name: string
	pid: number
}

/** Human-readable labels for agent types (used in UI badges). */
export const AGENT_LABELS: Record<AgentType, string> = {
	'claude-code': 'Claude',
	codex: 'Codex',
	'gemini-cli': 'Gemini',
	aider: 'Aider',
	opencode: 'OpenCode',
	'kilo-code': 'Kilo',
}

/** Agents available in the pane launcher. Single source of truth — AGENT_LAUNCH_CONFIG is keyed by this. */
export const LAUNCHABLE_AGENTS = ['claude-code', 'gemini-cli'] as const
export type LaunchableAgent = (typeof LAUNCHABLE_AGENTS)[number]

/** Message formatter for agent subprocess stdin.
 *  Takes the user's text and returns the JSON object to write as NDJSON. */
export type AgentMessageFormatter = (text: string) => Record<string, unknown>

/** Per-agent subprocess configuration for bidirectional stream-json mode.
 *  Agents that support subprocess mode have this defined; others are null. */
export interface AgentSubprocessConfig {
	/** CLI args for subprocess mode (e.g. ['--print', '--verbose', ...]). */
	readonly flags: readonly string[]
	/** Env vars to strip from the child process (prevents nesting errors). */
	readonly stripEnv: readonly string[]
	/** Formats a user message string into the JSON payload for stdin. */
	formatMessage: AgentMessageFormatter
}

/** Per-agent launch configuration: CLI command, default flags, and optional subprocess config. */
export interface AgentLaunchConfig {
	command: string
	defaultFlags: string[]
	/** Subprocess config for rendered view mode. null = agent only supports PTY/TUI mode. */
	subprocess: AgentSubprocessConfig | null
}

export const AGENT_LAUNCH_CONFIG: Record<LaunchableAgent, AgentLaunchConfig> = {
	'claude-code': {
		command: 'claude',
		defaultFlags: [],
		subprocess: {
			flags: [
				'--print',
				'--verbose',
				'--input-format',
				'stream-json',
				'--output-format',
				'stream-json',
			],
			stripEnv: ['CLAUDECODE', 'CLAUDE_CODE_ENTRYPOINT'],
			formatMessage: (text: string) => ({
				type: 'user',
				message: { role: 'user', content: [{ type: 'text', text }] },
			}),
		},
	},
	'gemini-cli': {
		command: 'gemini',
		defaultFlags: [],
		subprocess: null, // TBD — will add when Gemini CLI supports structured I/O
	},
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
	APP_PICK_FOLDER: 'app:pick-folder',

	// PTY
	PTY_CREATE: 'pty:create',
	PTY_WRITE: 'pty:write',
	PTY_RESIZE: 'pty:resize',
	PTY_KILL: 'pty:kill',
	PTY_DATA: 'pty:data',
	PTY_EXIT: 'pty:exit',
	PTY_CWD_CHANGED: 'pty:cwd-changed',
	PTY_PROCESS_CHANGED: 'pty:process-changed',
	PTY_GET_PROCESS_INFO: 'pty:get-process-info',

	// Agent subprocess (bidirectional stream-json)
	AGENT_SPAWN: 'agent:spawn',
	AGENT_SEND: 'agent:send',
	AGENT_KILL: 'agent:kill',
	AGENT_DATA: 'agent:data',
	AGENT_ERROR: 'agent:error',
	AGENT_EXIT: 'agent:exit',
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
