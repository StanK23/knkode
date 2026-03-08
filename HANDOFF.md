# HANDOFF

## Current State
- Branch: `feature/agent-status-bar-tokens` (from `dev/agent-workspace`)
- PR #74 open: Status bar model/tokens + inline block token badges — review fixes applied, ready for merge

## What Was Done
- PR #74: Status bar model name + cumulative token counter, inline per-block token badges, review fixes (17/17 addressed)
- PR #73 merged: Full rendered conversation view for Claude Code agent
- PR #71 merged: Generic agent subprocess manager
- PR #58-69 merged: agent workspace foundation

## Active Plan — Agent UX Enhancements (knktx board: 69a96d8d)
All branches from `dev/agent-workspace`. PRs target `dev/agent-workspace`, **not `main`**.

- PR #1: `feature/agent-status-bar-tokens` — Status bar model/tokens + inline block badges (PR #74, review complete)
- PR #2: `feature/slash-command-autocomplete` — Slash command autocomplete
- PR #3: `feature/context-compaction-ui` — Context compaction UI
- PR #4: `feature/tool-approval-buttons` — Interactive tool approval
- PR #5: `feature/stream-render-latency` — Reduce stream rendering latency

## Architecture Notes
- Decision: replace `--print` one-shot mode with persistent bidirectional subprocess
  - `claude --print --verbose --input-format stream-json --output-format stream-json`
  - Generic `AGENT_LAUNCH_CONFIG` per agent (command, flags, env stripping, message formatter)
  - Module-scoped `Map<string, AgentSession>` pattern (mirrors pty-manager)
  - IPC: `agent:spawn`, `agent:send`, `agent:kill` + events `agent:data`, `agent:error`, `agent:exit`
- Buffer-based rendered view approach abandoned (PR #70 closed)
- Security: agentFlags validated with allowlist regex
- Agent stderr surfaced to user via feedStreamData
- rAF batching enabled in Electron renderer
- Per-block token usage: parser tracks output_tokens deltas between content_block_start/stop

## Previous Work
- PR #56 merged: snippet reorder via DnD + keyboard
- PR #57 merged: fix pane scroll jump
- PR #58 merged: translucent pane backgrounds
- PR #51: Windows support + CI/CD
- PR #50: Dynamic workspace fonts
