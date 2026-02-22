# HANDOFF

## Current State
- Branch: `fix/terminal-persistence`
- PR #46 open: terminal persistence across splits + TUI scroll fix
- Review findings applied, ready for merge

## What Was Done
- PR #43 merged: terminal scroll jumps + scroll button redesign
- PR #44 merged: global command snippets
- PR #45 merged: pane polish — scroll debounce removal, theme-aware scroll button, directional drop zones with review fixes
- PR #46 (open): terminal cache + TUI resize fix
  - Fix 1: ratio-based scroll on resize (removes isAtBottom flag broken by TUI redraws)
  - Fix 2: module-level xterm cache survives React remounts on pane split
  - Review: 9 agents, 4 must-fix + 7 suggestions addressed

## Next Steps
1. Merge PR #46
2. Investigate blank terminal on workspace switch
