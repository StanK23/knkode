import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import { type AppState, DEFAULT_UNFOCUSED_DIM, type Workspace } from '../shared/types'

const CONFIG_DIR = path.join(app.getPath('home'), '.knkode')
const WORKSPACES_FILE = path.join(CONFIG_DIR, 'workspaces.json')
const APP_STATE_FILE = path.join(CONFIG_DIR, 'app-state.json')

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

function writeJson(filePath: string, data: unknown): void {
	ensureConfigDir()
	try {
		fs.writeFileSync(filePath, JSON.stringify(data, null, 2), { encoding: 'utf-8', mode: 0o600 })
	} catch (err) {
		console.error(
			`[config-store] Failed to write ${filePath}:`,
			err instanceof Error ? err.message : err,
		)
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

	return {
		...ws,
		theme: {
			background: ws.theme.background,
			foreground: ws.theme.foreground,
			fontSize: ws.theme.fontSize,
			fontFamily: ws.theme.fontFamily,
			unfocusedDim: dim,
		},
	}
}

export function getWorkspaces(): Workspace[] {
	return readJson<Workspace[]>(WORKSPACES_FILE, []).map(migrateTheme)
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
