import { contextBridge, ipcRenderer } from 'electron'
import type { AppState, Workspace } from '../shared/types'
import { IPC } from '../shared/types'

const api = {
	// Config
	getWorkspaces: (): Promise<Workspace[]> => ipcRenderer.invoke(IPC.CONFIG_GET_WORKSPACES),
	saveWorkspace: (workspace: Workspace): Promise<void> =>
		ipcRenderer.invoke(IPC.CONFIG_SAVE_WORKSPACE, workspace),
	deleteWorkspace: (id: string): Promise<void> =>
		ipcRenderer.invoke(IPC.CONFIG_DELETE_WORKSPACE, id),
	getAppState: (): Promise<AppState> => ipcRenderer.invoke(IPC.CONFIG_GET_APP_STATE),
	saveAppState: (state: AppState): Promise<void> =>
		ipcRenderer.invoke(IPC.CONFIG_SAVE_APP_STATE, state),

	// PTY
	createPty: (id: string, cwd: string, startupCommand: string | null): Promise<void> =>
		ipcRenderer.invoke(IPC.PTY_CREATE, id, cwd, startupCommand),
	writePty: (id: string, data: string): Promise<void> =>
		ipcRenderer.invoke(IPC.PTY_WRITE, id, data),
	resizePty: (id: string, cols: number, rows: number): Promise<void> =>
		ipcRenderer.invoke(IPC.PTY_RESIZE, id, cols, rows),
	killPty: (id: string): Promise<void> => ipcRenderer.invoke(IPC.PTY_KILL, id),

	// PTY events
	onPtyData: (callback: (id: string, data: string) => void) => {
		const listener = (_event: Electron.IpcRendererEvent, id: string, data: string) =>
			callback(id, data)
		ipcRenderer.on(IPC.PTY_DATA, listener)
		return () => ipcRenderer.removeListener(IPC.PTY_DATA, listener)
	},
	onPtyExit: (callback: (id: string, exitCode: number) => void) => {
		const listener = (_event: Electron.IpcRendererEvent, id: string, exitCode: number) =>
			callback(id, exitCode)
		ipcRenderer.on(IPC.PTY_EXIT, listener)
		return () => ipcRenderer.removeListener(IPC.PTY_EXIT, listener)
	},
	onPtyCwdChanged: (callback: (paneId: string, cwd: string) => void) => {
		const listener = (_event: Electron.IpcRendererEvent, paneId: string, cwd: string) =>
			callback(paneId, cwd)
		ipcRenderer.on(IPC.PTY_CWD_CHANGED, listener)
		return () => ipcRenderer.removeListener(IPC.PTY_CWD_CHANGED, listener)
	},
}

contextBridge.exposeInMainWorld('api', api)

export type KnkodeApi = typeof api
