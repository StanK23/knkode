import { execFileSync } from 'node:child_process'
import os from 'node:os'
import * as pty from 'node-pty'
import { IPC, type ProcessInfo } from '../shared/types'
import { safeSend } from './main-window'

interface PtySession {
	process: pty.IPty
	initialCwd: string
	/** Last known foreground child process name (for agent detection). */
	lastProcessName: string | null
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
	const ptyProcess = pty.spawn(shell, isWin ? [] : ['-l'], {
		name: 'xterm-256color',
		cols: 80,
		rows: 24,
		cwd,
		env: {
			...process.env,
			TERM: 'xterm-256color',
			COLORTERM: 'truecolor',
		},
	})

	const session: PtySession = { process: ptyProcess, initialCwd: cwd, lastProcessName: null }
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

/** Get the foreground child process of a PTY shell. */
export function getChildProcessInfo(pid: number): ProcessInfo | null {
	try {
		if (!Number.isInteger(pid) || pid <= 0) return null

		const platform = os.platform()
		if (platform === 'darwin' || platform === 'linux') {
			// ps -o pid=,comm= lists child processes; we want the foreground one
			const output = execFileSync('ps', ['-o', 'pid=,comm=', '-p', String(pid)], {
				encoding: 'utf-8',
				timeout: 1000,
			}).trim()
			if (!output) return null

			// Parse the single line: "  PID COMMAND"
			const match = output.match(/^\s*(\d+)\s+(.+)$/)
			if (!match) return null
			const name = match[2].split('/').pop() ?? match[2]
			return { name: name.trim(), pid: Number(match[1]) }
		}
		if (platform === 'win32') {
			const output = execFileSync(
				'wmic',
				['process', 'where', `ParentProcessId=${pid}`, 'get', 'Name,ProcessId', '/format:csv'],
				{ encoding: 'utf-8', timeout: 2000 },
			).trim()
			const lines = output.split('\n').filter((l) => l.trim())
			if (lines.length < 2) return null
			const last = lines[lines.length - 1].split(',')
			if (last.length < 3) return null
			return { name: last[1].trim(), pid: Number(last[2]) }
		}
	} catch {
		// Silently ignore — process may have exited
	}
	return null
}

/** Get the deepest child process of a PTY (walks the process tree). */
function getDeepestChild(shellPid: number): ProcessInfo | null {
	try {
		const platform = os.platform()
		if (platform !== 'darwin' && platform !== 'linux') {
			return getChildProcessInfo(shellPid)
		}

		// Get all children in one call
		const output = execFileSync('ps', ['-o', 'pid=,ppid=,comm=', '-g', String(shellPid)], {
			encoding: 'utf-8',
			timeout: 1000,
		}).trim()
		if (!output) return null

		const procs: { pid: number; ppid: number; name: string }[] = []
		for (const line of output.split('\n')) {
			const match = line.match(/^\s*(\d+)\s+(\d+)\s+(.+)$/)
			if (match) {
				procs.push({
					pid: Number(match[1]),
					ppid: Number(match[2]),
					name: (match[3].split('/').pop() ?? match[3]).trim(),
				})
			}
		}

		// Walk from shell to deepest child
		let current = shellPid
		let result: ProcessInfo | null = null
		for (let depth = 0; depth < 10; depth++) {
			const child = procs.find((p) => p.ppid === current && p.pid !== current)
			if (!child) break
			result = { name: child.name, pid: child.pid }
			current = child.pid
		}
		return result
	} catch {
		return null
	}
}

/** Get process info for a specific pane. */
export function getPtyProcessInfo(id: string): ProcessInfo | null {
	const session = sessions.get(id)
	if (!session) return null
	return getDeepestChild(session.process.pid)
}

/** Start polling child process names and emit events on changes. */
export function startProcessPolling(): void {
	if (pollTimer) return
	pollTimer = setInterval(() => {
		const ids = [...sessions.keys()]
		for (const id of ids) {
			const session = sessions.get(id)
			if (!session) continue
			const info = getDeepestChild(session.process.pid)
			const name = info?.name ?? null
			if (name !== session.lastProcessName) {
				session.lastProcessName = name
				safeSend(IPC.PTY_PROCESS_CHANGED, id, info)
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
