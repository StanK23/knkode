# Agent Workspace Plan

> Transform knkode from a terminal emulator into an intelligent agent workspace
> that detects, parses, and enhances the output of AI coding agents.

## Motivation

AI coding CLIs (Claude Code, Codex, Gemini CLI) output structured information
(tool calls, diffs, thinking, status) as formatted terminal text. knkode
currently renders this as raw ANSI — users get walls of text with no way to
collapse, navigate, or search agent activity. By understanding what's running
in each pane and parsing its output, knkode becomes the rendering layer that
adds collapse/expand, status tracking, and cross-pane awareness on top of any
agent CLI.

## Architecture

### Layered Detection (zero-config, progressive enhancement)

```
Layer 1: Process Detection
  PTY child process name -> agent identity (claude, codex, gemini, aider, etc.)
  If no match: plain terminal mode, no enhancement.

Layer 2: Mode Detection
  Alt screen buffer entered  -> TUI mode      -> passthrough to xterm.js
  Box-drawing / tree prefixes -> Inline mode   -> activate ANSI block parser
  NDJSON on stdout            -> Stream-JSON   -> activate structured renderer

Layer 3: Rendering Strategy
  stream-json  -> Custom React block components (richest)
  inline-ansi  -> xterm.js segments wrapped in collapsible overlays
  tui          -> Raw xterm.js (no enhancement possible)
  plain        -> Raw xterm.js (no agent detected)
```

### Agent Support Matrix

| CLI          | Output Style       | Detection Method        | Enhancement |
|--------------|--------------------|------------------------|-------------|
| Claude Code  | Ink (box-drawing)  | Process name + `\u256d\u256e` borders | ANSI block parser |
| Gemini CLI   | Ink (box-drawing)  | Process name + `\u256d\u256e` borders | ANSI block parser |
| Codex        | ratatui (alt screen) | Process name + alt buffer | Passthrough (TUI) |
| Aider        | rich (minimal structure) | Process name         | Basic status only |
| OpenCode     | Bubble Tea (alt screen) | Process name + alt buffer | Passthrough (TUI) |
| Kilo Code    | TypeScript TUI     | Process name            | TBD |
| Any CLI      | stream-json opt-in | User config             | Full structured |

### Block Types (universal across agents)

```typescript
type AgentBlockType =
  | 'thinking'       // model reasoning / chain of thought
  | 'tool-call'      // tool invocation (Read, Write, Bash, etc.)
  | 'tool-result'    // output from tool execution
  | 'diff'           // file changes
  | 'text'           // assistant response text
  | 'status'         // working / spinner / progress
  | 'permission'     // approval prompts
  | 'error'          // error messages
  | 'unknown'        // unparseable content

interface AgentBlock {
  id: string
  type: AgentBlockType
  agent: string              // 'claude-code' | 'gemini-cli' | etc.
  startLine: number          // buffer line where block starts
  endLine: number | null     // null if still streaming
  collapsed: boolean
  metadata: Record<string, string>  // tool name, file path, duration, etc.
  rawContent: string         // original ANSI content for xterm.js rendering
}
```

## Implementation Plan

### PR #1: `feature/agent-process-detection` -- Process Detection Layer

**Goal:** Know what's running in each pane.

**Changes:**

Main process (`src/main/`):
- Add `getChildProcessName(pid)` to `pty-manager.ts` -- uses `ps` on
  macOS/Linux, `wmic` on Windows to get the foreground child process name
  of each PTY's shell
- Add new IPC channel `PTY_PROCESS_INFO` that returns `{ name: string, pid: number } | null`
- Add periodic polling (every 2s) in `pty-manager.ts` that emits
  `PTY_PROCESS_CHANGED` events when the child process changes

Preload (`src/preload/`):
- Expose `onPtyProcessChanged` callback
- Expose `getPtyProcessInfo` invoke

Shared types (`src/shared/types.ts`):
- Add `AgentType` union: `'claude-code' | 'codex' | 'gemini-cli' | 'aider' | 'opencode' | 'unknown'`
- Add agent name-to-type mapping
- Add IPC channel constants

Renderer (`src/renderer/`):
- Add `agentType` per pane to store (derived from process detection)
- Show agent badge on pane header (small icon/label when agent detected)

**Tests:** Unit test for process name -> agent type mapping.

---

### PR #2: `feature/alt-screen-detection` -- Alt Screen Buffer Detection

**Goal:** Detect when a pane enters/exits alternate screen buffer (TUI mode)
so we know NOT to try parsing the output.

**Changes:**

Renderer (`src/renderer/src/components/Terminal.tsx`):
- xterm.js already tracks `buffer.active.type` ('normal' vs 'alternate')
- Add listener on buffer change events to update store
- Store `isAltScreen` per pane in Zustand

This is a prerequisite for the block parser -- it must be disabled during
alt screen mode (Codex, vim, htop, etc.).

**Tests:** None needed -- xterm.js buffer detection is built-in.

---

### PR #3: `feature/ansi-block-parser` -- ANSI Block Parser for Ink-based CLIs

**Goal:** Parse box-drawing bordered output from Claude Code and Gemini CLI
into structured blocks.

**Changes:**

New file `src/renderer/src/lib/agent-block-parser.ts`:
- Stateful parser that receives terminal buffer lines
- Detects block boundaries via box-drawing characters:
  - `\u256d` (top-left corner) = block start
  - `\u2570` (bottom-left corner) = block end
  - `\u2502` (vertical pipe) = block continuation
- Extracts block type from content patterns:
  - "Read", "Write", "Edit", "Bash" etc. in border text -> tool-call
  - Diff markers (+/-) with green/red -> diff
  - Dim/italic text patterns -> thinking
  - Spinner/braille patterns -> status
- Returns `AgentBlock[]` for each pane
- Handles partial blocks (streaming -- block not yet closed)
- ANSI-stripping for pattern matching, preserves raw content

New file `src/renderer/src/lib/agent-parsers/claude-code.ts`:
- Claude Code-specific patterns (border text format, tool names)

New file `src/renderer/src/lib/agent-parsers/gemini-cli.ts`:
- Gemini CLI-specific patterns (status icons, tool group borders)

Shared `src/renderer/src/lib/agent-parsers/types.ts`:
- `AgentBlock`, `AgentBlockType`, parser interface

**Tests:** Unit tests with captured terminal output samples from each CLI.

---

### PR #4: `feature/collapsible-blocks-ui` -- Collapsible Block Overlay UI

**Goal:** Render parsed blocks as collapsible sections overlaid on the terminal.

**Changes:**

New component `src/renderer/src/components/AgentBlockOverlay.tsx`:
- Positioned absolutely over the terminal container
- Uses block start/end line positions to calculate pixel offsets
  (line height * line number)
- Renders collapse/expand toggle on the left edge of each block
- When collapsed: shows single-line summary (tool name + result)
- When expanded: shows full xterm.js content at original position
- Click on block header to toggle

New component `src/renderer/src/components/AgentBlockSummary.tsx`:
- Renders the collapsed one-liner: icon + tool name + brief result
- Color-coded by block type (green for success, red for error, etc.)

Update `src/renderer/src/components/Terminal.tsx`:
- Integrate `AgentBlockOverlay` when agent is detected and not in alt screen
- Pass parsed blocks from store

Update store:
- Add `agentBlocks` per pane (Map<string, AgentBlock[]>)
- Add `toggleBlockCollapse(paneId, blockId)` action
- Add `collapseAllBlocks(paneId)` / `expandAllBlocks(paneId)`

**Design considerations:**
- Overlay must not interfere with terminal mouse events (pointer-events: none
  except on interactive elements)
- Overlay must stay in sync with terminal scroll position
- Performance: only render overlays for visible blocks (virtualized)

---

### PR #5: `feature/agent-status-bar` -- Per-Pane Agent Status Bar

**Goal:** Show what the agent is doing at a glance in each pane.

**Changes:**

New component `src/renderer/src/components/AgentStatusBar.tsx`:
- Sits at the top or bottom of the pane (configurable)
- Shows: agent icon + name, current activity (e.g. "Reading src/main.ts"),
  elapsed time, block count
- Compact: single row, ~24px height
- Only visible when an agent is detected

Update `src/renderer/src/components/Pane.tsx`:
- Conditionally render AgentStatusBar when agentType !== null

Update store:
- Add `agentStatus` per pane: `{ activity: string, elapsed: number, blockCount: number }`

---

### PR #6: `feature/stream-json-renderer` -- Structured JSON Renderer (opt-in)

**Goal:** For users who configure it, consume stream-json output from CLIs
and render our own rich block components instead of xterm.js output.

**Changes:**

New file `src/renderer/src/lib/stream-json-parser.ts`:
- Parses NDJSON events from Claude Code (`--output-format stream-json`),
  Gemini CLI (`--output-format stream-json`), or Codex (`--json`)
- Emits the same `AgentBlock` types as the ANSI parser

New component `src/renderer/src/components/AgentStreamView.tsx`:
- Full custom React renderer for agent output (replaces xterm.js)
- Renders blocks as React components: ToolCallBlock, DiffBlock,
  ThinkingBlock, TextBlock, StatusBlock
- Supports collapse/expand natively (no overlay needed)
- Syntax-highlighted code and diffs
- Markdown rendering for text blocks

Config (`src/shared/types.ts`):
- Add optional `agentConfig` to `PaneConfig`:
  ```typescript
  agentConfig?: {
    mode: 'auto' | 'stream-json'
    extraArgs?: string[]  // e.g. ['--output-format', 'stream-json']
  }
  ```

Settings UI:
- Per-pane agent mode toggle in pane settings

---

### PR #7: `feature/agent-workspace-overview` -- Multi-Agent Overview

**Goal:** Workspace-level view of all running agents across panes.

**Changes:**

New component `src/renderer/src/components/AgentOverview.tsx`:
- Keyboard shortcut to toggle (e.g. Cmd+Shift+A)
- Shows all panes with active agents in a dashboard view
- Per-agent: name, status, current activity, elapsed time, error count
- Click to focus that pane
- Visual indicators for idle/working/error/waiting-for-approval

Update `src/renderer/src/hooks/useKeyboardShortcuts.ts`:
- Add shortcut for overview toggle

---

## PR Dependency Graph

```
PR #1 (Process Detection)
  |
  +-- PR #2 (Alt Screen Detection)
  |     |
  |     +-- PR #3 (ANSI Block Parser)
  |           |
  |           +-- PR #4 (Collapsible Block UI)
  |           |
  |           +-- PR #5 (Agent Status Bar)
  |
  +-- PR #6 (Stream JSON Renderer) -- can start after PR #1
  |
  +-- PR #7 (Agent Overview) -- can start after PR #5
```

## Key Technical Decisions

1. **Parser lives in renderer, not main process.** The terminal buffer is in
   the renderer (xterm.js). Sending raw PTY data to main for parsing and back
   would add latency and complexity. The parser reads from xterm.js buffer
   directly.

2. **Overlay approach for ANSI mode.** We don't modify the xterm.js buffer.
   Instead we overlay React components at calculated positions. This keeps
   xterm.js functioning normally and makes the enhancement purely additive.

3. **Same AgentBlock type for both parsers.** The ANSI parser and stream-json
   parser produce identical output. The UI components don't care which parser
   generated the blocks.

4. **Process detection via polling, not hooks.** Shell integration hooks
   (precmd/preexec) would require modifying the user's shell config. Polling
   the child process name every 2s is zero-config and good enough.

5. **Graceful degradation at every layer.** If detection fails -> plain terminal.
   If parsing fails -> plain terminal. If a block can't be classified -> type
   'unknown', rendered as-is. Nothing breaks.

## Out of Scope (Future)

- Custom input bar / prompt separation (separate initiative)
- OSC 133 shell integration for non-agent commands
- Agent-to-agent communication features
- Built-in agent spawning (vs user typing the command)
- Cost tracking / token usage display (needs API integration)
