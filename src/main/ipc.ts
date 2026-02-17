import { ipcMain } from 'electron'
import {
	deleteWorkspace,
	getAppState,
	getWorkspaces,
	saveAppState,
	saveWorkspace,
} from './config-store'
import { trackPane, untrackPane } from './cwd-tracker'
import { createPty, killPty, resizePty, writePty } from './pty-manager'
import type { AppState, Workspace } from '../shared/types'
import { IPC } from '../shared/types'

export function registerIpcHandlers(): void {
	// Config handlers
	ipcMain.handle(IPC.CONFIG_GET_WORKSPACES, () => getWorkspaces())

	ipcMain.handle(IPC.CONFIG_SAVE_WORKSPACE, (_e, workspace: Workspace) => {
		saveWorkspace(workspace)
	})

	ipcMain.handle(IPC.CONFIG_DELETE_WORKSPACE, (_e, id: string) => {
		deleteWorkspace(id)
	})

	ipcMain.handle(IPC.CONFIG_GET_APP_STATE, () => getAppState())

	ipcMain.handle(IPC.CONFIG_SAVE_APP_STATE, (_e, state: AppState) => {
		saveAppState(state)
	})

	// PTY handlers
	ipcMain.handle(
		IPC.PTY_CREATE,
		(_e, id: string, cwd: string, startupCommand: string | null) => {
			createPty(id, cwd, startupCommand)
			trackPane(id, cwd)
		}
	)

	ipcMain.handle(IPC.PTY_WRITE, (_e, id: string, data: string) => {
		writePty(id, data)
	})

	ipcMain.handle(IPC.PTY_RESIZE, (_e, id: string, cols: number, rows: number) => {
		resizePty(id, cols, rows)
	})

	ipcMain.handle(IPC.PTY_KILL, (_e, id: string) => {
		killPty(id)
		untrackPane(id)
	})
}
