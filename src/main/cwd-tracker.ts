import type { BrowserWindow } from 'electron'
import { getPtyCwd } from './pty-manager'
import { IPC } from '../shared/types'

const trackedPanes = new Map<string, string>() // paneId -> last known cwd
let intervalId: ReturnType<typeof setInterval> | null = null
let mainWindow: BrowserWindow | null = null

export function setCwdTrackerWindow(win: BrowserWindow): void {
	mainWindow = win
}

export function trackPane(paneId: string, initialCwd: string): void {
	trackedPanes.set(paneId, initialCwd)
}

export function untrackPane(paneId: string): void {
	trackedPanes.delete(paneId)
}

export function startCwdTracking(): void {
	if (intervalId) return

	intervalId = setInterval(() => {
		for (const [paneId, lastCwd] of trackedPanes) {
			const currentCwd = getPtyCwd(paneId)
			if (currentCwd && currentCwd !== lastCwd) {
				trackedPanes.set(paneId, currentCwd)
				mainWindow?.webContents.send(IPC.PTY_CWD_CHANGED, paneId, currentCwd)
			}
		}
	}, 3000) // Poll every 3 seconds
}

export function stopCwdTracking(): void {
	if (intervalId) {
		clearInterval(intervalId)
		intervalId = null
	}
	trackedPanes.clear()
}
