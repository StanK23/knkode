import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import type { ScrollDebugEvent } from '../shared/types'

const LOG_DIR = path.join(app.getPath('home'), '.knkode', 'logs')
const LOG_FILE = path.join(LOG_DIR, 'scroll-debug.jsonl')
const MAX_LOG_BYTES = 20 * 1024 * 1024
const SESSION_ID = `${new Date().toISOString()}-${process.pid}`

let initialized = false
let flushTimer: NodeJS.Timeout | null = null
let queue: string[] = []
let writeChain = Promise.resolve()

function ensureLogFile(): void {
	if (initialized) return
	fs.mkdirSync(LOG_DIR, { recursive: true, mode: 0o700 })
	try {
		const stat = fs.statSync(LOG_FILE)
		if (stat.size > MAX_LOG_BYTES) {
			const archivedPath = `${LOG_FILE}.prev`
			try {
				fs.rmSync(archivedPath, { force: true })
			} catch {
				/* best-effort cleanup */
			}
			fs.renameSync(LOG_FILE, archivedPath)
		}
	} catch (err) {
		if (
			!(err instanceof Error) ||
			!('code' in err) ||
			(err as NodeJS.ErrnoException).code !== 'ENOENT'
		) {
			console.warn('[scroll-debug] Failed to inspect log file:', err)
		}
	}
	initialized = true
	queue.push(
		`${JSON.stringify({
			ts: new Date().toISOString(),
			sessionId: SESSION_ID,
			event: 'session-start',
			pid: process.pid,
		})}\n`,
	)
}

function flushQueueSoon(): void {
	if (flushTimer) return
	flushTimer = setTimeout(() => {
		flushTimer = null
		void flushScrollDebugLog()
	}, 100)
}

export function flushScrollDebugLog(): Promise<void> {
	if (queue.length === 0) return writeChain
	ensureLogFile()
	const batch = queue.join('')
	queue = []
	writeChain = writeChain
		.then(() => fs.promises.appendFile(LOG_FILE, batch, { encoding: 'utf-8', mode: 0o600 }))
		.catch((err) => {
			console.warn('[scroll-debug] Failed to append log batch:', err)
		})
	return writeChain
}

export function appendScrollDebugEvent(event: ScrollDebugEvent): void {
	ensureLogFile()
	queue.push(
		`${JSON.stringify({
			ts: new Date().toISOString(),
			sessionId: SESSION_ID,
			pid: process.pid,
			...event,
		})}\n`,
	)
	if (queue.length >= 50) {
		void flushScrollDebugLog()
		return
	}
	flushQueueSoon()
}

export function getScrollDebugLogPath(): string {
	ensureLogFile()
	return LOG_FILE
}
