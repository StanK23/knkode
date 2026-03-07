# HANDOFF

## Current State
- Branch: `feature/claude-rendered-view`
- PR #72 open: Wire StreamRenderer to agent subprocess + cleanup — review complete, fixes applied, ready for merge

## What Was Done
- PR #72: Full rendered conversation view for Claude Code agent — StreamRenderer, AgentStatusBar, PaneLauncher, settings tabs, stream-json parsing, process detection. Reviewed by 10 agents, 25 findings fixed (9 must-fix, 10 suggestions, 6 nitpicks).
- PR #71 merged: Generic agent subprocess manager
- PR #58-69 merged: agent workspace foundation

## Active Plan — Stream-JSON Rendered View
- ~~PR #1: `feature/claude-subprocess` — Generic agent subprocess manager~~ <- PR #71, merged
- PR #2: `feature/claude-rendered-view` — Wire renderer to subprocess + cleanup <- PR #72, review fixes applied

## Architecture Notes
- Decision: replace `--print` one-shot mode with persistent bidirectional subprocess
  - `claude --print --verbose --input-format stream-json --output-format stream-json`
  - Generic `AGENT_LAUNCH_CONFIG` per agent (command, flags, env stripping, message formatter)
  - Module-scoped `Map<string, AgentSession>` pattern (mirrors pty-manager)
  - IPC: `agent:spawn`, `agent:send`, `agent:kill` + events `agent:data`, `agent:error`, `agent:exit`
- Buffer-based rendered view approach abandoned (PR #70 closed)
- Security: agentFlags validated with allowlist regex (alphanumeric + hyphens, underscores, equals, dots, commas, spaces, slashes)
- Agent stderr surfaced to user via feedStreamData
- rAF batching enabled in Electron renderer (was dead code before fix)

## Next Steps
- Merge PR #72
- Plan follow-up features as knktx board:
  - Status bar (model + tokens)
  - Slash command autocomplete
  - Context compaction handling
  - Interactive modes (tool approval buttons)

## Previous Work
- PR #56 merged: snippet reorder via DnD + keyboard
- PR #57 merged: fix pane scroll jump
- PR #58 merged: translucent pane backgrounds
- PR #51: Windows support + CI/CD
- PR #50: Dynamic workspace fonts
