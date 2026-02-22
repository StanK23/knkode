import os from 'node:os'
import path from 'node:path'
import { ipcMain, shell } from 'electron'
import type { AppState, Snippet, Workspace } from '../shared/types'
import { IPC } from '../shared/types'
import {
	deleteWorkspace,
	getAppState,
	getSnippets,
	getWorkspaces,
	saveAppState,
	saveSnippets,
	saveWorkspace,
} from './config-store'
import { trackPane, untrackPane } from './cwd-tracker'
import { createPty, killPty, resizePty, writePty } from './pty-manager'

const MAX_PANE_ID_LENGTH = 128

function assertString(value: unknown, name: string): asserts value is string {
	if (typeof value !== 'string') throw new Error(`Invalid ${name}: expected string`)
}

function assertNonEmptyString(value: unknown, name: string): asserts value is string {
	assertString(value, name)
	if (value.length === 0) throw new Error(`Invalid ${name}: must not be empty`)
}

function assertPaneId(value: unknown): asserts value is string {
	assertNonEmptyString(value, 'pane id')
	if ((value as string).length > MAX_PANE_ID_LENGTH) {
		throw new Error(`Invalid pane id: exceeds ${MAX_PANE_ID_LENGTH} characters`)
	}
}

function assertIntInRange(
	value: unknown,
	name: string,
	min: number,
	max: number,
): asserts value is number {
	if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
		throw new Error(`Invalid ${name}: expected integer in [${min}, ${max}]`)
	}
}

function assertWorkspace(value: unknown): asserts value is Workspace {
	if (!value || typeof value !== 'object') throw new Error('Invalid workspace: expected object')
	const obj = value as Record<string, unknown>
	if (typeof obj.id !== 'string') throw new Error('Invalid workspace: missing or invalid id')
	if (typeof obj.name !== 'string') throw new Error('Invalid workspace: missing or invalid name')
	if (typeof obj.color !== 'string') throw new Error('Invalid workspace: missing or invalid color')
	if (!obj.theme || typeof obj.theme !== 'object')
		throw new Error('Invalid workspace: missing or invalid theme')
	if (!obj.layout || typeof obj.layout !== 'object')
		throw new Error('Invalid workspace: missing or invalid layout')
	const layout = obj.layout as Record<string, unknown>
	if (layout.type !== 'preset' && layout.type !== 'custom') {
		throw new Error('Invalid workspace: layout.type must be "preset" or "custom"')
	}
	if (!obj.panes || typeof obj.panes !== 'object')
		throw new Error('Invalid workspace: missing or invalid panes')
}

const MAX_SNIPPETS = 500
const MAX_SNIPPET_NAME_LENGTH = 256
const MAX_SNIPPET_COMMAND_LENGTH = 4096

function assertSnippets(value: unknown): asserts value is Snippet[] {
	if (!Array.isArray(value)) throw new Error('Invalid snippets: expected array')
	if (value.length > MAX_SNIPPETS) throw new Error(`Too many snippets: max ${MAX_SNIPPETS}`)
	for (const item of value) {
		if (!item || typeof item !== 'object') throw new Error('Invalid snippet: expected object')
		const s = item as Record<string, unknown>
		assertNonEmptyString(s.id, 'snippet id')
		if ((s.id as string).length > MAX_PANE_ID_LENGTH)
			throw new Error(`Invalid snippet id: exceeds ${MAX_PANE_ID_LENGTH} characters`)
		assertNonEmptyString(s.name, 'snippet name')
		if ((s.name as string).length > MAX_SNIPPET_NAME_LENGTH)
			throw new Error(`Invalid snippet name: exceeds ${MAX_SNIPPET_NAME_LENGTH} characters`)
		assertNonEmptyString(s.command, 'snippet command')
		if ((s.command as string).length > MAX_SNIPPET_COMMAND_LENGTH)
			throw new Error(`Invalid snippet command: exceeds ${MAX_SNIPPET_COMMAND_LENGTH} characters`)
	}
}

function assertAppState(value: unknown): asserts value is AppState {
	if (!value || typeof value !== 'object') throw new Error('Invalid app state: expected object')
	const obj = value as Record<string, unknown>
	if (!Array.isArray(obj.openWorkspaceIds))
		throw new Error('Invalid app state: openWorkspaceIds must be an array')
	if (obj.activeWorkspaceId !== null && typeof obj.activeWorkspaceId !== 'string') {
		throw new Error('Invalid app state: activeWorkspaceId must be string or null')
	}
	if (!obj.windowBounds || typeof obj.windowBounds !== 'object') {
		throw new Error('Invalid app state: missing or invalid windowBounds')
	}
}

export function registerIpcHandlers(): void {
	ipcMain.handle(IPC.APP_GET_HOME_DIR, () => os.homedir())

	ipcMain.handle(IPC.APP_OPEN_EXTERNAL, (_e, url: unknown) => {
		assertString(url, 'url')
		if (url.length > 2048) throw new Error('URL too long')
		let parsed: URL
		try {
			parsed = new URL(url)
		} catch {
			throw new Error('Invalid URL')
		}
		if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
			throw new Error('Only http/https URLs are allowed')
		}
		return shell.openExternal(parsed.href)
	})

	ipcMain.handle(IPC.CONFIG_GET_WORKSPACES, () => getWorkspaces())

	ipcMain.handle(IPC.CONFIG_SAVE_WORKSPACE, (_e, workspace: unknown) => {
		assertWorkspace(workspace)
		saveWorkspace(workspace)
	})

	ipcMain.handle(IPC.CONFIG_DELETE_WORKSPACE, (_e, id: unknown) => {
		assertNonEmptyString(id, 'workspace id')
		deleteWorkspace(id)
	})

	ipcMain.handle(IPC.CONFIG_GET_APP_STATE, () => getAppState())

	ipcMain.handle(IPC.CONFIG_SAVE_APP_STATE, (_e, state: unknown) => {
		assertAppState(state)
		saveAppState(state)
	})

	ipcMain.handle(IPC.PTY_CREATE, async (_e, id: unknown, cwd: unknown, startupCommand: unknown) => {
		assertPaneId(id)
		assertString(cwd, 'cwd')
		if (!path.isAbsolute(cwd)) throw new Error('Invalid cwd: must be an absolute path')
		if (cwd.includes('\0')) throw new Error('Invalid cwd: contains null byte')
		if (startupCommand !== null && typeof startupCommand !== 'string') {
			throw new Error('Invalid startup command')
		}
		try {
			createPty(id, path.resolve(cwd), startupCommand as string | null)
			trackPane(id, cwd)
		} catch (err) {
			console.error(`[ipc] PTY_CREATE failed for pane ${id}:`, err)
			throw new Error(
				`Failed to create terminal in ${cwd}. Check that the directory exists and your shell is configured.`,
			)
		}
	})

	ipcMain.handle(IPC.PTY_WRITE, (_e, id: unknown, data: unknown) => {
		assertPaneId(id)
		assertString(data, 'data')
		writePty(id, data)
	})

	ipcMain.handle(IPC.PTY_RESIZE, (_e, id: unknown, cols: unknown, rows: unknown) => {
		assertPaneId(id)
		assertIntInRange(cols, 'cols', 1, 1000)
		assertIntInRange(rows, 'rows', 1, 500)
		resizePty(id, cols, rows)
	})

	ipcMain.handle(IPC.PTY_KILL, (_e, id: unknown) => {
		assertPaneId(id)
		killPty(id)
		untrackPane(id)
	})

	ipcMain.handle(IPC.CONFIG_GET_SNIPPETS, () => getSnippets())

	ipcMain.handle(IPC.CONFIG_SAVE_SNIPPETS, (_e, snippets: unknown) => {
		assertSnippets(snippets)
		saveSnippets(snippets)
	})
}
