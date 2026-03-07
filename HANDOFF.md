# HANDOFF

## Current State
- Branch: `feature/claude-subprocess` (base: `dev/agent-workspace`)
- PR #71 open: generic agent subprocess manager — review complete, fixes pending

## Active Reviews

### PR #71 — feat: generic agent subprocess manager
- State: `docs/reviews/PR-71/_state.json`
- Agents: 8/8 completed
- Phase: done (compiled, fixes pending)
- Must fix: 4 items (agentType validation, error handler missing AGENT_EXIT, stdin.write errors, spurious exit event)
- Suggestions: 5 items | Nitpicks: 5 items

## What Was Done
- PR #71 (open): Generic agent subprocess manager — `agent-subprocess.ts`, IPC handlers, preload API, types, tests
- PR #58-69 merged: agent workspace foundation (detection, parser, stream JSON, renderer, launcher, settings)

## Active Plan — Stream-JSON Rendered View
- PR #1: `feature/claude-subprocess` — Generic agent subprocess manager ← PR #71, review complete, fixes pending
- PR #2: `feature/claude-rendered-view` — Wire renderer to subprocess + cleanup ← not started

## Architecture Notes
- Decision: replace `--print` one-shot mode with persistent bidirectional subprocess
  - `claude --print --verbose --input-format stream-json --output-format stream-json`
  - Generic `AGENT_LAUNCH_CONFIG` per agent (command, flags, env stripping, message formatter)
  - Module-scoped `Map<string, AgentSession>` pattern (mirrors pty-manager)
  - IPC: `agent:spawn`, `agent:send`, `agent:kill` + events `agent:data`, `agent:error`, `agent:exit`
- Buffer-based rendered view approach abandoned (PR #70 closed)

## Previous Work
- PR #56 merged: snippet reorder via DnD + keyboard
- PR #57 merged: fix pane scroll jump
- PR #58 merged: translucent pane backgrounds
- PR #51: Windows support + CI/CD
- PR #50: Dynamic workspace fonts
