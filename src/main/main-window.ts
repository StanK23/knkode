import type { BrowserWindow } from 'electron'
import type { IpcChannel } from '../shared/types'

let mainWindow: BrowserWindow | null = null

export function setMainWindow(win: BrowserWindow): void {
	mainWindow = win
	win.on('closed', () => {
		mainWindow = null
	})
}

export function getMainWindow(): BrowserWindow | null {
	return mainWindow
}

/**
 * Safely send an IPC message to the renderer.
 * Returns false if the send fails for any reason (window destroyed, not ready, etc.).
 */
export function safeSend(channel: IpcChannel, ...args: unknown[]): boolean {
	if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isDestroyed()) return false
	try {
		mainWindow.webContents.send(channel, ...args)
		return true
	} catch (err) {
		console.warn('[main-window] safeSend failed:', channel, err)
		return false
	}
}
