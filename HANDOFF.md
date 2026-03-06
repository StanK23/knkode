# HANDOFF

## Current State
- Branch: `main`
- All plan PRs merged (PR #66-69)

## What Was Done
- PR #58 merged: translucent pane backgrounds with blur
- PR #59 merged: agent process detection — async process tree walking, IPC, store integration, agent badges
- PR #60 merged: alt screen buffer detection — xterm `onBufferChange` wired to store, cleanupPaneState helper, 157 tests
- PR #61 merged: ANSI block parser — stateful incremental parser, agent-specific classifiers (Claude Code, Gemini CLI), shared helpers, 55 tests
- PR #62 merged: collapsible block overlay UI — store state, parser hook, overlay components, Terminal integration
- PR #63 merged: per-pane agent status bar — AgentStatusBar component, elapsed timer, paneAgentStartTimes store, Pane integration
- PR #64 merged: agent detection walks past agent to subprocesses
- PR #65 merged: status bar height, bullet block detection, scroll jump, isFittingRef scroll fix
- PR #66 merged: pane launcher overlay — LaunchMode type, workspace CWD, PaneLauncher component, folder picker, AGENT_LAUNCH_CONFIG
- PR #67 merged: agent flag settings — per-agent CLI flags in workspace config, settings panel tab refactor
- PR #68 merged: stream JSON parser — NDJSON parser, shared types, store state, PTY hook, 290 tests
- PR #69 merged: stream JSON renderer UI — StreamRenderer, --print mode, rendered/raw toggle, chat input

## Completed Plan — Agent Workspace
- ~~PR #6: pane launcher overlay~~ ← PR #66, merged
- ~~PR #8: agent flag settings~~ ← PR #67, merged
- ~~PR #7a: stream JSON parser + store~~ ← PR #68, merged
- ~~PR #7b: stream JSON renderer UI~~ ← PR #69, merged

## Architecture Notes
- PR #69 uses `--print` mode (non-interactive, one-shot per message). This has UX limitations:
  - No persistent Claude session (new process per message)
  - Heredoc-based stdin for message passing
  - `--resume` with session ID for multi-turn context
- Decision: switch to buffer-based rendered view that parses the interactive TUI output from xterm buffer
  - `AgentBlockParser` already detects block boundaries (╭╰ box-drawing, ● bullets)
  - `getTerminal(paneId)` provides xterm buffer access
  - Extract text content from buffer lines per block, render in clean UI
  - Interactive TUI mode = persistent session, real-time output

## Next Steps
1. Build buffer-based rendered view (`BufferRenderedView`) — parse TUI blocks from xterm buffer
2. Switch from `--print` mode to interactive TUI mode (`claude --output-format stream-json`)
3. Both raw (terminal) and rendered (structured blocks) modes work with persistent session

## Previous Work
- PR #56 merged: snippet reorder via DnD + keyboard
- PR #57 merged: fix pane scroll jump
- PR #58 merged: translucent pane backgrounds
- PR #51: Windows support + CI/CD
- PR #50: Dynamic workspace fonts
