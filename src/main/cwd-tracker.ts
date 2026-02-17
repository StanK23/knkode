import { getMainWindow } from './main-window'
import { getPtyCwd } from './pty-manager'
import { IPC } from '../shared/types'

const trackedPanes = new Map<string, string>() // paneId -> last observed cwd (polled, may lag)
let intervalId: ReturnType<typeof setInterval> | null = null

export function trackPane(paneId: string, initialCwd: string): void {
	trackedPanes.set(paneId, initialCwd)
}

export function untrackPane(paneId: string): void {
	trackedPanes.delete(paneId)
}

export function startCwdTracking(): void {
	if (intervalId) return

	// 3s balances UI responsiveness against lsof subprocess cost per pane
	intervalId = setInterval(() => {
		for (const [paneId, lastCwd] of trackedPanes) {
			const currentCwd = getPtyCwd(paneId)
			if (currentCwd && currentCwd !== lastCwd) {
				trackedPanes.set(paneId, currentCwd)
				getMainWindow()?.webContents.send(IPC.PTY_CWD_CHANGED, paneId, currentCwd)
			}
		}
	}, 3000)
}

export function stopCwdTracking(): void {
	if (intervalId) {
		clearInterval(intervalId)
		intervalId = null
	}
	trackedPanes.clear()
}
