# HANDOFF

## Current State
- Branch: `feature/stream-renderer-ui`
- PR #69 open: stream JSON renderer UI — --print mode streaming implemented, needs manual testing

## What Was Done
- PR #58 merged: translucent pane backgrounds with blur
- PR #59 merged: agent process detection — async process tree walking, IPC, store integration, agent badges
- PR #60 merged: alt screen buffer detection — xterm `onBufferChange` wired to store, cleanupPaneState helper, 157 tests
- PR #61 merged: ANSI block parser — stateful incremental parser, agent-specific classifiers (Claude Code, Gemini CLI), shared helpers, 55 tests
- PR #62 merged: collapsible block overlay UI — store state, parser hook, overlay components, Terminal integration
  - 10-agent review: 7 must-fix, 10 suggestions, 6 nitpicks — all addressed
- PR #63 merged: per-pane agent status bar — AgentStatusBar component, elapsed timer, paneAgentStartTimes store, Pane integration
  - 9-agent review: 4 must-fix, 8 suggestions, 5 nitpicks — all addressed
- PR #64 merged: agent detection walks past agent to subprocesses
- PR #65 merged: status bar height, bullet block detection, scroll jump, isFittingRef scroll fix
- PR #66 merged: pane launcher overlay — LaunchMode type, workspace CWD, PaneLauncher component, folder picker, AGENT_LAUNCH_CONFIG
  - 6-agent review: 7 must-fix, 9 suggestions, 6 nitpicks — all addressed
- PR #67 merged: agent flag settings — per-agent CLI flags in workspace config, settings panel tab refactor
  - 5-agent review: 3 must-fix, 6 suggestions, 2 nitpicks — all addressed
- PR #68 merged: stream JSON parser — NDJSON parser, shared types, store state, PTY hook, 290 tests
  - 6-agent review: 4 must-fix, 9 suggestions, 3 nitpicks — 14/16 addressed

## PR #69 — Stream JSON Renderer UI

### Architecture
- Uses `claude --print --verbose --output-format stream-json --include-partial-messages`
- Agent panes open a plain shell (no auto-start), user sends first message via chat input
- `sendAgentMessage` constructs CLI command with heredoc for safe message passing
- Multi-turn via `--resume SESSION_ID` extracted from result events
- Parser handles verbose format: system, stream_event, assistant, rate_limit_event, result types
- `CLAUDECODE` env var stripped from PTY to prevent nested session errors

### Key Discoveries
- `--output-format stream-json` requires `--verbose` flag (error without it)
- `--input-format stream-json` didn't work in testing — using sequential `--print --resume` instead
- Agent panes must ignore saved `startupCommand` from previous sessions

### Test Coverage
- 297 tests passing
- 6 new parser tests for verbose stream-json format

## Active Plan — Agent Workspace (revised)
Previous plan PRs #1-5 complete (PR #59-63). PR #6 complete (PR #66). PR #8 complete (PR #67). PR #7a complete (PR #68). PR #7b in progress (PR #69).

- ~~PR #6: pane launcher overlay~~ ← PR #66, merged
- ~~PR #8: agent flag settings~~ ← PR #67, merged
- ~~PR #7a: stream JSON parser + store~~ ← PR #68, merged
- PR #7b: stream JSON renderer UI ← PR #69, open

## Previous Work
- PR #56 merged: snippet reorder via DnD + keyboard
- PR #57 merged: fix pane scroll jump
- PR #58 merged: translucent pane backgrounds
- PR #51: Windows support + CI/CD
- PR #50: Dynamic workspace fonts

## Next Steps
1. Manual testing of PR #69 rendered view
2. Merge PR #69
