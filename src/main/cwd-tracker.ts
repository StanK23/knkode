import { execFileSync } from 'node:child_process'
import { IPC } from '../shared/types'
import { safeSend } from './main-window'
import { getPtyCwd } from './pty-manager'

const trackedPanes = new Map<string, string>() // paneId -> last observed cwd (polled, may lag)
const trackedBranches = new Map<string, string | null>() // paneId -> last observed branch
let intervalId: ReturnType<typeof setInterval> | null = null

/** Run `git rev-parse --abbrev-ref HEAD` in a directory. Returns null if not a git repo. */
function getGitBranch(cwd: string): string | null {
	try {
		const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
			cwd,
			encoding: 'utf8',
			timeout: 2000,
			stdio: ['ignore', 'pipe', 'ignore'],
		}).trim()
		return branch || null
	} catch {
		return null
	}
}

export function trackPane(paneId: string, initialCwd: string): void {
	trackedPanes.set(paneId, initialCwd)
	trackedBranches.set(paneId, null)
}

export function untrackPane(paneId: string): void {
	trackedPanes.delete(paneId)
	trackedBranches.delete(paneId)
}

export function startCwdTracking(): void {
	if (intervalId) return

	// 3s balances UI responsiveness against lsof subprocess cost per pane
	intervalId = setInterval(() => {
		for (const [paneId, lastCwd] of trackedPanes) {
			try {
				const currentCwd = getPtyCwd(paneId)
				if (currentCwd && currentCwd !== lastCwd) {
					trackedPanes.set(paneId, currentCwd)
					safeSend(IPC.PTY_CWD_CHANGED, paneId, currentCwd)
				}

				const cwd = currentCwd ?? lastCwd
				const currentBranch = getGitBranch(cwd)
				const lastBranch = trackedBranches.get(paneId) ?? null
				if (currentBranch !== lastBranch) {
					trackedBranches.set(paneId, currentBranch)
					safeSend(IPC.PTY_BRANCH_CHANGED, paneId, currentBranch)
				}
			} catch (err) {
				console.warn(
					`[cwd-tracker] Failed to poll pane ${paneId}:`,
					err instanceof Error ? err.message : err,
				)
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
	trackedBranches.clear()
}
