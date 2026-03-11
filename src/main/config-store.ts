import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import {
	type AnsiColors,
	type AppState,
	type CursorStyle,
	DEFAULT_UNFOCUSED_DIM,
	type PaneTheme,
	type Snippet,
	type Workspace,
	isCursorStyle,
	isEffectLevel,
} from '../shared/types'

const CONFIG_DIR = path.join(app.getPath('home'), '.knkode')
const WORKSPACES_FILE = path.join(CONFIG_DIR, 'workspaces.json')
const APP_STATE_FILE = path.join(CONFIG_DIR, 'app-state.json')
const SNIPPETS_FILE = path.join(CONFIG_DIR, 'snippets.json')

function ensureConfigDir(): void {
	fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 })
}

function readJson<T>(filePath: string, fallback: T): T {
	let raw: string
	try {
		raw = fs.readFileSync(filePath, 'utf-8')
	} catch (err: unknown) {
		if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
			return fallback
		}
		console.error(
			`[config-store] Cannot read ${filePath}:`,
			err instanceof Error ? err.message : err,
		)
		return fallback
	}

	try {
		return JSON.parse(raw) as T
	} catch (err) {
		console.error(
			`[config-store] Corrupt JSON in ${filePath}, backing up:`,
			err instanceof Error ? err.message : err,
		)
		try {
			fs.copyFileSync(filePath, `${filePath}.corrupt`)
		} catch {
			/* best-effort backup */
		}
		return fallback
	}
}

// Atomic write: write to .tmp then rename. Safe because all calls are synchronous
// (no interleaving). If this ever becomes async, use unique temp file names.
function writeJson(filePath: string, data: unknown): void {
	ensureConfigDir()
	const tmpPath = `${filePath}.tmp`
	try {
		fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), { encoding: 'utf-8', mode: 0o600 })
		fs.renameSync(tmpPath, filePath)
	} catch (err) {
		console.error(
			`[config-store] Failed to write ${filePath}:`,
			err instanceof Error ? err.message : err,
		)
		try {
			fs.unlinkSync(tmpPath)
		} catch (cleanupErr) {
			console.warn(
				'[config-store] Failed to clean up temp file:',
				tmpPath,
				cleanupErr instanceof Error ? cleanupErr.message : cleanupErr,
			)
		}
		throw err
	}
}

/** Migrate workspace themes from legacy `opacity` field to `unfocusedDim`.
 *  Converts opacity (0.3-1.0, higher = more visible) to unfocusedDim
 *  (0-0.7, higher = more dimmed). Missing values default to DEFAULT_UNFOCUSED_DIM. */
export function migrateTheme(ws: Workspace): Workspace {
	if (!ws.theme || typeof ws.theme !== 'object') {
		console.error('[config-store] Workspace has invalid theme, using defaults:', ws.id)
		return {
			...ws,
			theme: {
				background: '#1a1a2e',
				foreground: '#e0e0e0',
				fontSize: 14,
				unfocusedDim: DEFAULT_UNFOCUSED_DIM,
			},
		}
	}

	const raw = ws.theme as Record<string, unknown>
	if ('unfocusedDim' in raw) return ws

	// Convert legacy opacity (0.3-1.0) to unfocusedDim (0-0.7)
	let dim = DEFAULT_UNFOCUSED_DIM
	if ('opacity' in raw && typeof raw.opacity === 'number' && Number.isFinite(raw.opacity)) {
		dim = Math.max(0, Math.min(0.7, 1 - raw.opacity))
	}

	const { opacity: _, ...themeWithoutLegacy } = raw as Record<string, unknown> & typeof ws.theme
	return {
		...ws,
		theme: {
			...themeWithoutLegacy,
			unfocusedDim: dim,
		} as typeof ws.theme,
	}
}

/** Migrate legacy boolean effect fields (animatedGlow, scanline) to EffectLevel fields,
 *  removing the legacy fields in the process. Also adds gradientLevel: 'medium' when a
 *  gradient string is present but no level is set. */
export function migrateEffectLevels(ws: Workspace): Workspace {
	const raw = ws.theme as unknown as Record<string, unknown>

	const needsMigration =
		'animatedGlow' in raw ||
		'scanline' in raw ||
		('gradient' in raw && typeof raw.gradient === 'string' && !('gradientLevel' in raw))

	if (!needsMigration) return ws

	const updates: Partial<Pick<PaneTheme, 'glowLevel' | 'scanlineLevel' | 'gradientLevel'>> = {}

	if ('animatedGlow' in raw) {
		if (raw.animatedGlow === true && !isEffectLevel(raw.glowLevel)) {
			updates.glowLevel = 'medium'
		}
	}

	if ('scanline' in raw) {
		if (raw.scanline === true && !isEffectLevel(raw.scanlineLevel)) {
			updates.scanlineLevel = 'medium'
		}
	}

	if ('gradient' in raw && typeof raw.gradient === 'string' && !isEffectLevel(raw.gradientLevel)) {
		updates.gradientLevel = 'medium'
	}

	console.info('[config-store] Migrated effect levels for workspace:', ws.id)

	const { animatedGlow: _, scanline: _s, ...themeWithoutLegacy } = raw
	return {
		...ws,
		theme: { ...themeWithoutLegacy, ...updates } as typeof ws.theme,
	}
}

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i
const ANSI_KEYS: readonly (keyof AnsiColors)[] = [
	'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
	'brightBlack', 'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite',
]

/** Validate and sanitize PaneTheme fields loaded from disk.
 *  Strips invalid values rather than rejecting the whole workspace —
 *  config files may be hand-edited or from older versions. */
export function sanitizeTheme(raw: Record<string, unknown>): PaneTheme {
	const bg = typeof raw.background === 'string' && HEX_RE.test(raw.background) ? raw.background : '#1a1a2e'
	const fg = typeof raw.foreground === 'string' && HEX_RE.test(raw.foreground) ? raw.foreground : '#e0e0e0'
	const fontSize = typeof raw.fontSize === 'number' && Number.isFinite(raw.fontSize) && raw.fontSize > 0 ? raw.fontSize : 14
	const unfocusedDim =
		typeof raw.unfocusedDim === 'number' && Number.isFinite(raw.unfocusedDim) ? raw.unfocusedDim : DEFAULT_UNFOCUSED_DIM

	const result: PaneTheme = { background: bg, foreground: fg, fontSize, unfocusedDim }

	// Optional hex color fields
	for (const field of ['accent', 'glow', 'cursorColor', 'selectionColor'] as const) {
		if (typeof raw[field] === 'string' && HEX_RE.test(raw[field])) {
			;(result as unknown as Record<string, unknown>)[field] = raw[field]
		}
	}

	// Optional string fields (non-hex)
	if (typeof raw.fontFamily === 'string' && raw.fontFamily.length > 0) result.fontFamily = raw.fontFamily
	if (typeof raw.gradient === 'string' && raw.gradient.length > 0) result.gradient = raw.gradient
	if (typeof raw.preset === 'string' && raw.preset.length > 0) result.preset = raw.preset

	// Optional numeric fields
	if (typeof raw.scrollback === 'number' && Number.isFinite(raw.scrollback)) result.scrollback = raw.scrollback
	if (typeof raw.paneOpacity === 'number' && Number.isFinite(raw.paneOpacity)) result.paneOpacity = raw.paneOpacity
	if (typeof raw.lineHeight === 'number' && Number.isFinite(raw.lineHeight)) result.lineHeight = raw.lineHeight

	// CursorStyle
	if (typeof raw.cursorStyle === 'string' && isCursorStyle(raw.cursorStyle)) {
		result.cursorStyle = raw.cursorStyle as CursorStyle
	}

	// EffectLevel fields
	for (const field of ['gradientLevel', 'glowLevel', 'scanlineLevel', 'noiseLevel', 'scrollbarAccent'] as const) {
		if (isEffectLevel(raw[field])) {
			;(result as unknown as Record<string, unknown>)[field] = raw[field]
		}
	}

	// AnsiColors — validate all 16 fields are hex strings
	if (raw.ansiColors && typeof raw.ansiColors === 'object') {
		const ac = raw.ansiColors as Record<string, unknown>
		const valid = ANSI_KEYS.every((k) => typeof ac[k] === 'string' && HEX_RE.test(ac[k]))
		if (valid) result.ansiColors = raw.ansiColors as AnsiColors
	}

	return result
}

/** Apply sanitizeTheme to a workspace loaded from disk, replacing the raw theme. */
function sanitizeWorkspaceTheme(ws: Workspace): Workspace {
	if (!ws.theme || typeof ws.theme !== 'object') {
		return { ...ws, theme: sanitizeTheme({}) }
	}
	return { ...ws, theme: sanitizeTheme(ws.theme as unknown as Record<string, unknown>) }
}

export function getWorkspaces(): Workspace[] {
	return readJson<Workspace[]>(WORKSPACES_FILE, [])
		.map(migrateTheme)
		.map(migrateEffectLevels)
		.map(sanitizeWorkspaceTheme)
}

export function saveWorkspace(workspace: Workspace): void {
	const workspaces = getWorkspaces()
	const index = workspaces.findIndex((w) => w.id === workspace.id)
	if (index >= 0) {
		workspaces[index] = workspace
	} else {
		workspaces.push(workspace)
	}
	writeJson(WORKSPACES_FILE, workspaces)
}

export function deleteWorkspace(id: string): void {
	const workspaces = getWorkspaces().filter((w) => w.id !== id)
	writeJson(WORKSPACES_FILE, workspaces)
}

export function getAppState(): AppState {
	return readJson<AppState>(APP_STATE_FILE, {
		openWorkspaceIds: [],
		activeWorkspaceId: null,
		windowBounds: { x: 100, y: 100, width: 1200, height: 800 },
	})
}

export function saveAppState(state: AppState): void {
	writeJson(APP_STATE_FILE, state)
}

export function getSnippets(): Snippet[] {
	return readJson<Snippet[]>(SNIPPETS_FILE, []).filter((s) => {
		if (!s || typeof s !== 'object') return false
		if (typeof s.id !== 'string' || s.id.length === 0) return false
		if (typeof s.name !== 'string' || s.name.length === 0) return false
		if (typeof s.command !== 'string' || s.command.length === 0) return false
		return true
	})
}

export function saveSnippets(snippets: Snippet[]): void {
	writeJson(SNIPPETS_FILE, snippets)
}
