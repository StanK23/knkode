import type { BrowserWindow } from 'electron'
import { execSync } from 'node:child_process'
import os from 'node:os'
import * as pty from 'node-pty'
import { IPC } from '../shared/types'

interface PtySession {
	process: pty.IPty
	cwd: string
}

const sessions = new Map<string, PtySession>()

let mainWindow: BrowserWindow | null = null

export function setPtyWindow(win: BrowserWindow): void {
	mainWindow = win
}

export function createPty(id: string, cwd: string, startupCommand: string | null): void {
	if (sessions.has(id)) {
		killPty(id)
	}

	const shell = process.env.SHELL || (os.platform() === 'win32' ? 'powershell.exe' : '/bin/zsh')

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

	const session: PtySession = { process: ptyProcess, cwd }
	sessions.set(id, session)

	ptyProcess.onData((data) => {
		mainWindow?.webContents.send(IPC.PTY_DATA, id, data)
	})

	ptyProcess.onExit(({ exitCode }) => {
		sessions.delete(id)
		mainWindow?.webContents.send(IPC.PTY_EXIT, id, exitCode)
	})

	// Run startup command if provided
	if (startupCommand) {
		setTimeout(() => {
			ptyProcess.write(`${startupCommand}\r`)
		}, 300)
	}
}

export function writePty(id: string, data: string): void {
	sessions.get(id)?.process.write(data)
}

export function resizePty(id: string, cols: number, rows: number): void {
	try {
		sessions.get(id)?.process.resize(cols, rows)
	} catch {
		// Ignore resize errors on dead processes
	}
}

export function killPty(id: string): void {
	const session = sessions.get(id)
	if (session) {
		session.process.kill()
		sessions.delete(id)
	}
}

export function killAllPtys(): void {
	for (const [id] of sessions) {
		killPty(id)
	}
}

export function getPtyCwd(id: string): string | null {
	const session = sessions.get(id)
	if (!session) return null

	// node-pty doesn't expose cwd directly on all platforms,
	// but we track the initial cwd and can use process.pid for lsof
	try {
		const pid = session.process.pid
		if (pid && os.platform() === 'darwin') {
			const result = execSync(`lsof -p ${pid} -Fn | grep '^fcwd$' -A1 | grep '^n'`, {
				encoding: 'utf-8',
				timeout: 1000,
			}).trim()
			if (result.startsWith('n')) {
				return result.slice(1)
			}
		}
	} catch {
		// Fall back to stored cwd
	}
	return session.cwd
}
