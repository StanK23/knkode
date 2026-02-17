# knkode — Handoff

## What Was Done
- [done] Project foundation — configs, shared types, main process, preload (PR #1)
- [done] Workspace UI — renderer layer with all core components (PR #2)
- [done] Keyboard shortcuts & focus tracking (PR #3)
- [done] Drag-to-reorder workspace tabs (PR #4)
- [done] Testing — vitest setup + 44 store tests (PR #5)
- [done] Feature completion brainstorming & planning
- [done] PTY lifecycle — lazy tab loading & terminal persistence (PR #7, 53 tests)
- [in-progress] Context menus & closed workspaces (`feature/context-menus`)

## Active Decisions
- Tech stack: Electron + React + TypeScript + xterm.js + node-pty + Zustand
- Package manager: bun | Linter: Biome | Test runner: Vitest
- Config storage: ~/.knkode/ (JSON files)
- PTY lifecycle: lazy loading with CSS show/hide for tab persistence
- Change directory UX: text input, not native folder picker

## What's Next
- Complete context menus PR review and merge
- Task 3: Launch, test & fix (`fix/launch-and-integration`)
