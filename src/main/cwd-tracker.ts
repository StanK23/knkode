import { execFile } from 'node:child_process'
import type { PrInfo } from '../shared/types'
import { IPC } from '../shared/types'
import { safeSend } from './main-window'
import { getPtyCwd } from './pty-manager'

const trackedPanes = new Map<string, string>() // paneId -> last observed cwd (polled, may lag)
const trackedBranches = new Map<string, string | null>() // paneId -> last observed git branch (null = not a git repo or unknown)
const trackedPrs = new Map<string, PrInfo | null>() // paneId -> last observed PR info
const prLastChecked = new Map<string, number>() // paneId -> timestamp of last PR check
let intervalId: ReturnType<typeof setInterval> | null = null
let gitMissing = false // Log ENOENT only once to avoid spamming
let ghMissing = false // Set when gh CLI not found — retried periodically
let ghMissingAt = 0 // Timestamp when ghMissing was set

// Avoid hammering the gh CLI; PRs change infrequently
const PR_REFRESH_INTERVAL_MS = 60_000
// Retry finding gh CLI after this interval (covers late-install, PATH changes)
const GH_RETRY_INTERVAL_MS = 300_000

/** Augmented env for subprocess calls. Computed lazily on first use.
 *  Electron launched from Dock/Spotlight inherits a minimal system PATH that
 *  excludes common Homebrew and Linuxbrew directories — git works via the Xcode
 *  CLT shim at /usr/bin/git, but gh and other Homebrew tools are invisible.
 *  Appended to the end so system PATH entries take priority over Homebrew. */
let cachedEnv: NodeJS.ProcessEnv | null = null
function execEnv(): NodeJS.ProcessEnv {
	if (cachedEnv) return cachedEnv
	const p = process.env.PATH ?? ''
	const segments = new Set(p.split(':'))
	const extras = ['/opt/homebrew/bin', '/usr/local/bin', '/home/linuxbrew/.linuxbrew/bin']
	const missing = extras.filter((d) => !segments.has(d))
	cachedEnv = missing.length === 0 ? process.env : { ...process.env, PATH: `${p}:${missing.join(':')}` }
	return cachedEnv
}

/** Run `git rev-parse --abbrev-ref HEAD` asynchronously in a directory.
 *  Calls back with the branch name or null on any failure. */
function getGitBranch(cwd: string, callback: (branch: string | null) => void): void {
	if (gitMissing) {
		callback(null)
		return
	}
	execFile(
		'git',
		['rev-parse', '--abbrev-ref', 'HEAD'],
		{ cwd, timeout: 2000, env: execEnv() },
		(err, stdout) => {
			if (err) {
				if (!gitMissing && 'code' in err && err.code === 'ENOENT') {
					gitMissing = true
					console.warn('[cwd-tracker] git not found — branch detection disabled')
				} else if ('killed' in err && err.killed) {
					console.warn('[cwd-tracker] git rev-parse timed out for', cwd)
				} else if (
					!('code' in err && err.code === 'ENOENT') &&
					!(err instanceof Error && err.message.includes('not a git repository'))
				) {
					console.warn(
						'[cwd-tracker] git rev-parse failed for',
						cwd,
						err instanceof Error ? err.message : err,
					)
				}
				callback(null)
				return
			}
			const branch = stdout.trim()
			callback(branch || null)
		},
	)
}

/** Run `gh pr view --json number,url,title,state` asynchronously in a directory.
 *  Calls back with PrInfo or null (null on any error, including no open PR on current branch). */
function checkPrStatus(cwd: string, callback: (pr: PrInfo | null) => void): void {
	if (ghMissing) {
		// Periodically retry — gh may be installed after app launch
		if (Date.now() - ghMissingAt < GH_RETRY_INTERVAL_MS) {
			callback(null)
			return
		}
		ghMissing = false
		console.info('[cwd-tracker] Retrying gh CLI detection…')
	}
	execFile(
		'gh',
		['pr', 'view', '--json', 'number,url,title,state'],
		{ cwd, timeout: 10_000, env: execEnv() },
		(err, stdout, stderr) => {
			if (err) {
				if ('code' in err && err.code === 'ENOENT') {
					if (!ghMissing) {
						ghMissing = true
						ghMissingAt = Date.now()
						console.warn(
							'[cwd-tracker] gh CLI not found — PR detection disabled (will retry in 5m)',
						)
					}
				} else if ('killed' in err && err.killed) {
					console.warn('[cwd-tracker] gh pr view timed out for', cwd)
				} else {
					// Log non-trivial failures once per CWD (auth issues, network errors, etc.)
					// Exit code 1 with "no pull requests found" is expected — don't spam for that
					const msg = stderr?.trim() ?? ''
					if (msg && !msg.includes('no pull requests found')) {
						console.warn('[cwd-tracker] gh pr view failed:', msg.slice(0, 200))
					}
				}
				callback(null)
				return
			}
			try {
				const data: Record<string, unknown> = JSON.parse(stdout)
				if (
					typeof data.number === 'number' &&
					typeof data.url === 'string' &&
					typeof data.title === 'string' &&
					data.state === 'OPEN'
				) {
					// Validate URL format before trusting gh output
					try {
						const parsed = new URL(data.url)
						if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
							callback(null)
							return
						}
					} catch {
						callback(null)
						return
					}
					const title =
						typeof data.title === 'string' && data.title.length > 256
							? `${data.title.slice(0, 253)}...`
							: data.title
					callback({ number: data.number, url: data.url, title })
				} else {
					callback(null)
				}
			} catch (parseErr) {
				console.warn('[cwd-tracker] Failed to parse gh pr output:', stdout.slice(0, 200), parseErr)
				callback(null)
			}
		},
	)
}

/** Re-fetch PR status on branch change or every PR_REFRESH_INTERVAL_MS. */
function shouldCheckPr(paneId: string, branchChanged: boolean): boolean {
	if (branchChanged) return true
	const lastChecked = prLastChecked.get(paneId) ?? 0
	return Date.now() - lastChecked >= PR_REFRESH_INTERVAL_MS
}

export function trackPane(paneId: string, initialCwd: string): void {
	trackedPanes.set(paneId, initialCwd)
	trackedBranches.set(paneId, null)
	trackedPrs.set(paneId, null)
}

export function untrackPane(paneId: string): void {
	trackedPanes.delete(paneId)
	trackedBranches.delete(paneId)
	trackedPrs.delete(paneId)
	prLastChecked.delete(paneId)
}

export function startCwdTracking(): void {
	if (intervalId) return

	// 3s balances UI responsiveness against lsof + git + gh subprocess cost per pane
	intervalId = setInterval(() => {
		// Snapshot keys to avoid issues with Map mutation during iteration
		const paneIds = [...trackedPanes.keys()]
		for (const paneId of paneIds) {
			const lastCwd = trackedPanes.get(paneId)
			if (lastCwd === undefined) continue // untracked between snapshot and iteration

			try {
				const currentCwd = getPtyCwd(paneId)
				if (currentCwd && currentCwd !== lastCwd) {
					trackedPanes.set(paneId, currentCwd)
					safeSend(IPC.PTY_CWD_CHANGED, paneId, currentCwd)
				}

				const cwd = currentCwd ?? lastCwd
				getGitBranch(cwd, (currentBranch) => {
					if (!trackedPanes.has(paneId)) return // pane closed during async check
					const lastBranch = trackedBranches.get(paneId) ?? null
					const branchChanged = currentBranch !== lastBranch
					if (branchChanged) {
						trackedBranches.set(paneId, currentBranch)
						safeSend(IPC.PTY_BRANCH_CHANGED, paneId, currentBranch)
					}

					// PR detection — async, fires event when result arrives
					if (currentBranch && shouldCheckPr(paneId, branchChanged)) {
						if (branchChanged) {
							// Clear stale PR from previous branch immediately
							const hadPr = trackedPrs.get(paneId) !== null
							trackedPrs.set(paneId, null)
							if (hadPr) safeSend(IPC.PTY_PR_CHANGED, paneId, null)
						}
						prLastChecked.set(paneId, Date.now())
						checkPrStatus(cwd, (pr) => {
							if (!trackedPanes.has(paneId)) return // pane closed during async check
							const current = trackedPrs.get(paneId)
							const changed = pr?.number !== current?.number
							if (changed) {
								trackedPrs.set(paneId, pr)
								safeSend(IPC.PTY_PR_CHANGED, paneId, pr)
							}
						})
					} else if (!currentBranch && trackedPrs.get(paneId) !== null) {
						// No branch = no PR
						trackedPrs.set(paneId, null)
						safeSend(IPC.PTY_PR_CHANGED, paneId, null)
					}
				})
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
	trackedPrs.clear()
	prLastChecked.clear()
}
