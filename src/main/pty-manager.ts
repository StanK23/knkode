import { execFileSync } from 'node:child_process'
import os from 'node:os'
import * as pty from 'node-pty'
import { getMainWindow } from './main-window'
import { IPC } from '../shared/types'

interface PtySession {
	process: pty.IPty
	initialCwd: string
}

const sessions = new Map<string, PtySession>()

const SHELL_READY_DELAY_MS = 300

export function createPty(id: string, cwd: string, startupCommand: string | null): void {
	if (sessions.has(id)) {
		killPty(id)
	}

	const shell = process.env.SHELL || (os.platform() === 'win32' ? 'powershell.exe' : '/bin/sh')

	const ptyProcess = pty.spawn(shell, [], {
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

	const session: PtySession = { process: ptyProcess, initialCwd: cwd }
	sessions.set(id, session)

	ptyProcess.onData((data) => {
		getMainWindow()?.webContents.send(IPC.PTY_DATA, id, data)
	})

	ptyProcess.onExit(({ exitCode }) => {
		sessions.delete(id)
		getMainWindow()?.webContents.send(IPC.PTY_EXIT, id, exitCode)
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
		console.warn(`[pty] CWD tracking failed for pane ${id}:`, err instanceof Error ? err.message : err)
	}
	return session.initialCwd
}
