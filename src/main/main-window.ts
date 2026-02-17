import type { BrowserWindow } from 'electron'

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
 * Returns false if the window is unavailable or destroyed.
 */
export function safeSend(channel: string, ...args: unknown[]): boolean {
	if (!mainWindow || mainWindow.isDestroyed()) return false
	try {
		mainWindow.webContents.send(channel, ...args)
		return true
	} catch {
		return false
	}
}
