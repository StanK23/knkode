# HANDOFF

## Current State
- Branch: `main`
- All PRs merged, clean state

## What Was Done
- PR #43 merged: terminal scroll jumps + scroll button redesign
- PR #44 merged: global command snippets
- PR #45 merged: pane polish — scroll debounce removal, theme-aware scroll button, directional drop zones with review fixes

## Next Steps
1. **Fix: terminal buffer loss on pane split** — When splitting a pane, React unmounts/remounts the TerminalView because the layout tree structure changes (leaf → branch). The xterm instance is destroyed, losing all scrollback buffer and scroll position. Fix requires preserving xterm instances across React remounts (terminal-manager pattern: keep xterm alive in a module-level cache, attach/detach DOM on mount/unmount, only dispose on pane close).
2. **Fix: scroll jumps to bottom on resize during complex TUI sessions** — Ratio-based preservation works for simple content (seq, printf loops). Breaks during Claude Code / vim / htop sessions. Root cause: `isAtBottom` closure variable in Terminal.tsx gets set to `true` when TUI apps redraw the screen (cursor repositioning briefly makes `viewportY === baseY`), causing the resize handler to call `scrollToBottom()` instead of preserving position. Fix: more robust scroll state tracking that ignores programmatic viewport changes from TUI screen redraws.
3. Investigate blank terminal on workspace switch
