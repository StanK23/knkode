#!/usr/bin/env node
/**
 * MVP test: Claude Code bidirectional stream-json mode.
 * Tests whether the process stays alive for multiple messages.
 *
 * Run: node test-stream-json.mjs
 */
import { spawn } from 'child_process'

// Strip Claude Code env vars so we don't hit nested session check
const env = { ...process.env }
delete env.CLAUDECODE
delete env.CLAUDE_CODE_ENTRYPOINT

const proc = spawn('claude', [
  '--print',
  '--verbose',
  '--input-format', 'stream-json',
  '--output-format', 'stream-json',
], {
  env,
  stdio: ['pipe', 'pipe', 'pipe'],
})

let outputBuffer = ''
let messageCount = 0

proc.stdout.on('data', (chunk) => {
  const text = chunk.toString()
  outputBuffer += text

  // Parse NDJSON lines
  const lines = outputBuffer.split('\n')
  outputBuffer = lines.pop() // keep incomplete line

  for (const line of lines) {
    if (!line.trim()) continue
    try {
      const event = JSON.parse(line)
      console.log(`[STDOUT] type=${event.type}`, JSON.stringify(event).slice(0, 200))
    } catch {
      console.log(`[STDOUT raw] ${line.slice(0, 200)}`)
    }
  }
})

proc.stderr.on('data', (chunk) => {
  console.log(`[STDERR] ${chunk.toString().trim()}`)
})

proc.on('exit', (code) => {
  console.log(`\n[PROCESS EXITED] code=${code}`)
  console.log(`Messages sent: ${messageCount}`)
  if (messageCount >= 2) {
    console.log('SUCCESS: Process stayed alive for multiple messages!')
  } else {
    console.log('FAIL: Process exited before second message could be sent')
  }
})

// Send first message
function sendMessage(text) {
  messageCount++
  const msg = JSON.stringify({
    type: 'user',
    message: { role: 'user', content: [{ type: 'text', text }] }
  })
  console.log(`\n[STDIN #${messageCount}] ${msg.slice(0, 150)}`)
  proc.stdin.write(msg + '\n')
}

console.log('Starting claude --print --input-format stream-json --output-format stream-json')
console.log('Sending message 1...')
sendMessage('Reply with exactly: "MSG1_OK"')

// Wait 10s then send message 2 (if process is still alive)
setTimeout(() => {
  if (proc.exitCode !== null) {
    console.log('Process already exited, cannot send message 2')
    return
  }
  console.log('\nProcess still alive! Sending message 2...')
  sendMessage('Reply with exactly: "MSG2_OK"')

  // Wait for response then exit
  setTimeout(() => {
    console.log('\nTest complete. Killing process.')
    proc.kill()
  }, 10000)
}, 10000)

// Safety timeout
setTimeout(() => {
  console.log('\n[TIMEOUT] 30s reached, killing process')
  proc.kill()
}, 30000)
