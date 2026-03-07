import { type ChildProcess, spawn } from 'node:child_process'
import {
	AGENT_LAUNCH_CONFIG,
	type AgentMessageFormatter,
	IPC,
	type LaunchableAgent,
} from '../shared/types'
import { safeSend } from './main-window'

interface AgentSession {
	process: ChildProcess
	agentType: LaunchableAgent
	formatMessage: AgentMessageFormatter
	cwd: string
}

const sessions = new Map<string, AgentSession>()

/** Spawn a persistent agent subprocess for a pane.
 *  The agent must have a `subprocess` config in AGENT_LAUNCH_CONFIG. */
export function spawnAgent(paneId: string, agentType: LaunchableAgent, cwd: string): void {
	const config = AGENT_LAUNCH_CONFIG[agentType]
	if (!config.subprocess) {
		throw new Error(`Agent '${agentType}' does not support subprocess mode`)
	}

	// Kill existing session for this pane if any
	killAgent(paneId)

	// Build clean env — strip vars that cause nesting errors
	const env = { ...process.env }
	for (const key of config.subprocess.stripEnv) {
		delete env[key]
	}

	const proc = spawn(config.command, config.subprocess.flags, {
		cwd,
		env,
		stdio: ['pipe', 'pipe', 'pipe'],
	})

	const session: AgentSession = {
		process: proc,
		agentType,
		formatMessage: config.subprocess.formatMessage,
		cwd,
	}
	sessions.set(paneId, session)

	proc.stdout?.on('data', (chunk: Buffer) => {
		safeSend(IPC.AGENT_DATA, paneId, chunk.toString())
	})

	proc.stderr?.on('data', (chunk: Buffer) => {
		safeSend(IPC.AGENT_ERROR, paneId, chunk.toString())
	})

	proc.on('exit', (code, signal) => {
		// Only clean up and notify if this process is still the active session
		const current = sessions.get(paneId)
		if (current?.process === proc) {
			sessions.delete(paneId)
			safeSend(IPC.AGENT_EXIT, paneId, code, signal)
		}
	})

	proc.on('error', (err) => {
		safeSend(IPC.AGENT_ERROR, paneId, err.message)
		const current = sessions.get(paneId)
		if (current?.process === proc) {
			sessions.delete(paneId)
			safeSend(IPC.AGENT_EXIT, paneId, null, null)
		}
	})
}

/** Send a user message to the agent subprocess via stdin.
 *  Uses the agent's formatMessage to build the NDJSON payload. */
export function sendAgentMessage(paneId: string, message: string): void {
	const session = sessions.get(paneId)
	if (!session) throw new Error(`No agent session for pane ${paneId}`)
	if (!session.process.stdin?.writable) {
		throw new Error(`Agent stdin not writable for pane ${paneId}`)
	}

	const payload = JSON.stringify(session.formatMessage(message))
	session.process.stdin.write(`${payload}\n`, (err) => {
		if (err) safeSend(IPC.AGENT_ERROR, paneId, `stdin write failed: ${err.message}`)
	})
}

/** Kill the agent subprocess for a pane. */
export function killAgent(paneId: string): void {
	const session = sessions.get(paneId)
	if (!session) return
	try {
		session.process.kill()
	} catch (err) {
		console.warn(
			`[agent-subprocess] kill() threw for pane ${paneId}:`,
			err instanceof Error ? err.message : err,
		)
	}
	sessions.delete(paneId)
}

/** Kill all agent subprocesses (call on app quit). */
export function killAllAgents(): void {
	const ids = [...sessions.keys()]
	for (const id of ids) {
		killAgent(id)
	}
}
