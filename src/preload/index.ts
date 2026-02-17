import { contextBridge, ipcRenderer } from 'electron'
import type { AppState, Workspace } from '../shared/types'
import { IPC } from '../shared/types'

type Unsubscribe = () => void

function onIpcEvent<T extends unknown[]>(
	channel: string,
	callback: (...args: T) => void,
): Unsubscribe {
	const listener = (_event: Electron.IpcRendererEvent, ...args: T) =>
		callback(...args)
	ipcRenderer.on(channel, listener as (...args: unknown[]) => void)
	return () => ipcRenderer.removeListener(channel, listener as (...args: unknown[]) => void)
}

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
	onPtyData: (cb: (id: string, data: string) => void): Unsubscribe =>
		onIpcEvent<[string, string]>(IPC.PTY_DATA, cb),
	onPtyExit: (cb: (id: string, exitCode: number) => void): Unsubscribe =>
		onIpcEvent<[string, number]>(IPC.PTY_EXIT, cb),
	onPtyCwdChanged: (cb: (paneId: string, cwd: string) => void): Unsubscribe =>
		onIpcEvent<[string, string]>(IPC.PTY_CWD_CHANGED, cb),
}

contextBridge.exposeInMainWorld('api', api)

export type KnkodeApi = typeof api
