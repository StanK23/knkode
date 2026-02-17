# knkode — Handoff

## What Was Done
- [done] Project foundation — configs, shared types, main process, preload (PR #1)
- [done] Workspace UI — renderer layer with all core components (PR #2)
- [done] Keyboard shortcuts & focus tracking (PR #3)
- [done] Drag-to-reorder workspace tabs (PR #4)
- [done] Testing — vitest setup + 44 store tests (PR #5)
- [done] Feature completion brainstorming & planning
- [done] PTY lifecycle — lazy tab loading & terminal persistence (PR #7, 53 tests)
- [done] Context menus & closed workspaces (PR #8, 59 tests)
  - Tab context menu: rename, change color (palette), duplicate, close
  - Pane context menu: cwd, startup command, theme override, split, close
  - 10-agent review: 5 must-fix, 10 suggestions, 8 nitpicks — all addressed

## Active Decisions
- Tech stack: Electron + React + TypeScript + xterm.js + node-pty + Zustand
- Package manager: bun | Linter: Biome | Test runner: Vitest
- Config storage: ~/.knkode/ (JSON files)
- PTY lifecycle: lazy loading with CSS show/hide for tab persistence
- Change directory UX: text input, not native folder picker

## What's Next
- Task 3: Launch, test & fix (`fix/launch-and-integration`)
  - Debug empty window issue
  - Verify terminal data pipeline end-to-end
  - Test workspace/pane lifecycle
