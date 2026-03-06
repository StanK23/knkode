import { execFile as execFileCb, execFileSync } from 'node:child_process'
import os from 'node:os'
import { promisify } from 'node:util'
import * as pty from 'node-pty'
import { IPC, PROCESS_TO_AGENT, type ProcessInfo } from '../shared/types'
import { safeSend } from './main-window'

const execFile = promisify(execFileCb)

interface PtySession {
	process: pty.IPty
	initialCwd: string
	/** Last known deepest child process info (for agent detection). */
	lastProcessInfo: ProcessInfo | null
}

const sessions = new Map<string, PtySession>()

const PROCESS_POLL_INTERVAL_MS = 2000
let pollTimer: ReturnType<typeof setInterval> | null = null

const SHELL_READY_DELAY_MS = 300

export function createPty(id: string, cwd: string, startupCommand: string | null): void {
	if (sessions.has(id)) {
		killPty(id)
	}

	const shell = process.env.SHELL || (os.platform() === 'win32' ? 'powershell.exe' : '/bin/sh')

	const isWin = os.platform() === 'win32'
	// Strip CLAUDECODE env var to allow spawning claude --print inside agent panes
	// (otherwise Claude Code refuses to start with "nested sessions" error)
	const { CLAUDECODE: _, ...cleanEnv } = process.env
	const ptyProcess = pty.spawn(shell, isWin ? [] : ['-l'], {
		name: 'xterm-256color',
		cols: 80,
		rows: 24,
		cwd,
		env: {
			...cleanEnv,
			TERM: 'xterm-256color',
			COLORTERM: 'truecolor',
		},
	})

	const session: PtySession = { process: ptyProcess, initialCwd: cwd, lastProcessInfo: null }
	sessions.set(id, session)

	ptyProcess.onData((data) => {
		safeSend(IPC.PTY_DATA, id, data)
	})

	ptyProcess.onExit(({ exitCode }) => {
		// Only remove if this process is still the active session for this id.
		// After restart, the old PTY's onExit fires but sessions already holds
		// the replacement — deleting it would make the new PTY unreachable.
		const current = sessions.get(id)
		if (current?.process === ptyProcess) {
			sessions.delete(id)
		}
		safeSend(IPC.PTY_EXIT, id, exitCode)
	})

	if (startupCommand) {
		setTimeout(() => {
			if (!sessions.has(id)) return
			ptyProcess.write(`${startupCommand}\r`)
		}, SHELL_READY_DELAY_MS)
	}
}

export function writePty(id: string, data: string): void {
	const session = sessions.get(id)
	if (!session) throw new Error(`No PTY session for pane ${id}`)
	session.process.write(data)
}

export function resizePty(id: string, cols: number, rows: number): void {
	const session = sessions.get(id)
	if (!session) return

	try {
		session.process.resize(cols, rows)
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err)
		if (!msg.includes('exited') && !msg.includes('EPERM')) {
			console.error(`[pty] Unexpected resize error for pane ${id}:`, err)
		}
	}
}

export function killPty(id: string): void {
	const session = sessions.get(id)
	if (!session) return
	try {
		session.process.kill()
	} catch (err) {
		console.warn(`[pty] kill() threw for pane ${id}:`, err instanceof Error ? err.message : err)
	}
	sessions.delete(id)
}

export function killAllPtys(): void {
	const ids = [...sessions.keys()]
	for (const id of ids) {
		killPty(id)
	}
}

/** Get the deepest child process of a PTY by walking the process tree.
 *  Uses ppid-based filtering to find children reliably across macOS, Linux, and Windows. */
async function getDeepestChild(shellPid: number): Promise<ProcessInfo | null> {
	if (!Number.isInteger(shellPid) || shellPid <= 0) return null

	try {
		const platform = os.platform()
		if (platform === 'darwin' || platform === 'linux') {
			// Get all processes with ppid info in one call, filter in-process
			const { stdout } = await execFile('ps', ['ax', '-o', 'pid=,ppid=,comm='], {
				encoding: 'utf-8',
				timeout: 1000,
			})
			if (!stdout.trim()) return null

			const procs: { pid: number; ppid: number; name: string }[] = []
			for (const line of stdout.split('\n')) {
				const match = line.match(/^\s*(\d+)\s+(\d+)\s+(.+)$/)
				if (match) {
					procs.push({
						pid: Number(match[1]),
						ppid: Number(match[2]),
						name: match[3].trim(),
					})
				}
			}

			// Walk from shell PID to deepest child via ppid chain.
			// Return the first known agent found; fall back to deepest child.
			let current = shellPid
			let result: ProcessInfo | null = null
			for (let depth = 0; depth < 10; depth++) {
				const child = procs.find((p) => p.ppid === current && p.pid !== current)
				if (!child) break
				result = { name: child.name, pid: child.pid }
				if (PROCESS_TO_AGENT[child.name]) return result
				current = child.pid
			}
			return result
		}

		if (platform === 'win32') {
			// Get all processes in one PowerShell call, walk tree in-process
			const { stdout } = await execFile(
				'powershell.exe',
				[
					'-NoProfile',
					'-Command',
					'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name | ConvertTo-Json -Compress',
				],
				{ encoding: 'utf-8', timeout: 5000 },
			)
			const trimmed = stdout.trim()
			if (!trimmed) return null

			let allProcs: Array<{ ProcessId: number; ParentProcessId: number; Name: string }>
			try {
				const parsed = JSON.parse(trimmed)
				allProcs = Array.isArray(parsed) ? parsed : [parsed]
			} catch {
				return null
			}

			// Walk from shell PID to deepest child.
			// Return the first known agent found; fall back to deepest child.
			let current = shellPid
			let result: ProcessInfo | null = null
			for (let depth = 0; depth < 10; depth++) {
				const child = allProcs.find((p) => p.ParentProcessId === current && p.ProcessId !== current)
				if (!child?.Name || !Number.isInteger(child.ProcessId) || child.ProcessId <= 0) break
				const name = child.Name.replace(/\.exe$/i, '')
				result = { name, pid: child.ProcessId }
				if (PROCESS_TO_AGENT[name]) return result
				current = child.ProcessId
			}
			return result
		}
	} catch (err) {
		// execFile rejects on non-zero exit (process gone) or timeout — expected.
		// Log unexpected system errors (ENOENT, EACCES) for diagnostics.
		if (err instanceof Error) {
			const code = (err as NodeJS.ErrnoException).code
			const killed = (err as { killed?: boolean }).killed
			if (typeof code === 'string') {
				console.warn('[pty] getDeepestChild system error:', code, err.message)
			} else if (!killed && typeof code !== 'number') {
				console.warn('[pty] getDeepestChild unexpected error:', err.message)
			}
		}
	}
	return null
}

/** Get cached process info for a specific pane (from last poll cycle). */
export function getPtyProcessInfo(id: string): ProcessInfo | null {
	const session = sessions.get(id)
	if (!session) return null
	return session.lastProcessInfo
}

/** Start polling child process names and emit events on changes. */
export function startProcessPolling(): void {
	if (pollTimer) return
	pollTimer = setInterval(async () => {
		if (sessions.size === 0) return
		const ids = [...sessions.keys()]
		for (const id of ids) {
			try {
				const session = sessions.get(id)
				if (!session) continue
				const info = await getDeepestChild(session.process.pid)
				const name = info?.name ?? null
				const prevName = session.lastProcessInfo?.name ?? null
				if (name !== prevName) {
					session.lastProcessInfo = info
					safeSend(IPC.PTY_PROCESS_CHANGED, id, info)
				}
			} catch (err) {
				console.warn(`[pty] Process polling failed for pane ${id}:`, err)
			}
		}
	}, PROCESS_POLL_INTERVAL_MS)
}

/** Stop process polling (call on app quit). */
export function stopProcessPolling(): void {
	if (pollTimer) {
		clearInterval(pollTimer)
		pollTimer = null
	}
}

export function getPtyCwd(id: string): string | null {
	const session = sessions.get(id)
	if (!session) return null

	// macOS: read cwd via lsof. Linux: not implemented (falls back to initialCwd).
	try {
		const pid = session.process.pid
		if (!Number.isInteger(pid) || pid <= 0) return session.initialCwd

		if (os.platform() === 'darwin') {
			const lsofOutput = execFileSync('lsof', ['-p', String(pid), '-Fn'], {
				encoding: 'utf-8',
				timeout: 1000,
			})
			const lines = lsofOutput.split('\n')
			const cwdIndex = lines.indexOf('fcwd')
			if (cwdIndex >= 0 && cwdIndex + 1 < lines.length) {
				const nameLine = lines[cwdIndex + 1]
				if (nameLine.startsWith('n')) return nameLine.slice(1)
			}
		}
	} catch (err) {
		console.warn(
			`[pty] CWD tracking failed for pane ${id}:`,
			err instanceof Error ? err.message : err,
		)
	}
	return session.initialCwd
}
