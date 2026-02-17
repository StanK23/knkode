import { ipcMain } from 'electron'
import path from 'node:path'
import {
	deleteWorkspace,
	getAppState,
	getWorkspaces,
	saveAppState,
	saveWorkspace,
} from './config-store'
import { trackPane, untrackPane } from './cwd-tracker'
import { createPty, killPty, resizePty, writePty } from './pty-manager'
import { IPC } from '../shared/types'

/** Register all IPC handlers. Must be called before creating any BrowserWindow. */
export function registerIpcHandlers(): void {
	// Config handlers
	ipcMain.handle(IPC.CONFIG_GET_WORKSPACES, () => getWorkspaces())

	ipcMain.handle(IPC.CONFIG_SAVE_WORKSPACE, (_e, workspace: unknown) => {
		if (!workspace || typeof workspace !== 'object' || !('id' in workspace) || !('name' in workspace)) {
			throw new Error('Invalid workspace payload')
		}
		saveWorkspace(workspace as import('../shared/types').Workspace)
	})

	ipcMain.handle(IPC.CONFIG_DELETE_WORKSPACE, (_e, id: unknown) => {
		if (typeof id !== 'string' || id.length === 0) throw new Error('Invalid workspace id')
		deleteWorkspace(id)
	})

	ipcMain.handle(IPC.CONFIG_GET_APP_STATE, () => getAppState())

	ipcMain.handle(IPC.CONFIG_SAVE_APP_STATE, (_e, state: unknown) => {
		if (!state || typeof state !== 'object' || !('openWorkspaceIds' in state)) {
			throw new Error('Invalid app state payload')
		}
		saveAppState(state as import('../shared/types').AppState)
	})

	// PTY handlers
	ipcMain.handle(
		IPC.PTY_CREATE,
		async (_e, id: unknown, cwd: unknown, startupCommand: unknown) => {
			if (typeof id !== 'string' || id.length === 0 || id.length > 128) {
				throw new Error('Invalid pane id')
			}
			if (typeof cwd !== 'string' || !path.isAbsolute(cwd)) {
				throw new Error('Invalid cwd — must be an absolute path')
			}
			if (startupCommand !== null && typeof startupCommand !== 'string') {
				throw new Error('Invalid startup command')
			}
			try {
				createPty(id, cwd, startupCommand as string | null)
				trackPane(id, cwd)
			} catch (err) {
				console.error(`[ipc] PTY_CREATE failed for pane ${id}:`, err)
				throw new Error(`Failed to create terminal in ${cwd}. Check that the directory exists and your shell is configured.`)
			}
		}
	)

	ipcMain.handle(IPC.PTY_WRITE, (_e, id: unknown, data: unknown) => {
		if (typeof id !== 'string') throw new Error('Invalid pane id')
		if (typeof data !== 'string') throw new Error('Invalid data')
		writePty(id, data)
	})

	ipcMain.handle(IPC.PTY_RESIZE, (_e, id: unknown, cols: unknown, rows: unknown) => {
		if (typeof id !== 'string') throw new Error('Invalid pane id')
		if (!Number.isInteger(cols) || (cols as number) < 1 || (cols as number) > 1000) {
			throw new Error('Invalid cols')
		}
		if (!Number.isInteger(rows) || (rows as number) < 1 || (rows as number) > 500) {
			throw new Error('Invalid rows')
		}
		resizePty(id, cols as number, rows as number)
	})

	ipcMain.handle(IPC.PTY_KILL, (_e, id: unknown) => {
		if (typeof id !== 'string') throw new Error('Invalid pane id')
		killPty(id)
		untrackPane(id)
	})
}
