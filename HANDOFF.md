# HANDOFF

## Current State
- Branch: `dev/agent-workspace`
- PR #71 merged: generic agent subprocess manager

## What Was Done
- PR #71 merged: Generic agent subprocess manager — `agent-subprocess.ts`, IPC handlers, preload API, types, tests. Reviewed by 8 agents, all findings addressed.
- PR #58-69 merged: agent workspace foundation (detection, parser, stream JSON, renderer, launcher, settings)

## Active Plan — Stream-JSON Rendered View
- ~~PR #1: `feature/claude-subprocess` — Generic agent subprocess manager~~ ← PR #71, merged
- PR #2: `feature/claude-rendered-view` — Wire renderer to subprocess + cleanup ← next

## Architecture Notes
- Decision: replace `--print` one-shot mode with persistent bidirectional subprocess
  - `claude --print --verbose --input-format stream-json --output-format stream-json`
  - Generic `AGENT_LAUNCH_CONFIG` per agent (command, flags, env stripping, message formatter)
  - Module-scoped `Map<string, AgentSession>` pattern (mirrors pty-manager)
  - IPC: `agent:spawn`, `agent:send`, `agent:kill` + events `agent:data`, `agent:error`, `agent:exit`
- Buffer-based rendered view approach abandoned (PR #70 closed)

## Next Steps
- PR #2: Wire renderer to subprocess — connect `StreamRenderer` to new agent IPC, remove buffer-parsing approach

## Previous Work
- PR #56 merged: snippet reorder via DnD + keyboard
- PR #57 merged: fix pane scroll jump
- PR #58 merged: translucent pane backgrounds
- PR #51: Windows support + CI/CD
- PR #50: Dynamic workspace fonts
