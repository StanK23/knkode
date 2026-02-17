# knkode — Handoff

## What Was Done
- [done] Project foundation — configs, shared types, main process, preload (PR #1)
- [done] Workspace UI — renderer layer with all core components (PR #2)
- [done] Keyboard shortcuts & focus tracking (PR #3)
- [done] Drag-to-reorder workspace tabs (PR #4)
- [done] Vitest setup + 44 store tests (PR #5)
- [done] Feature completion plan — `/autopilot` run (PRs #7–#9):
  - PR #7: PTY lifecycle — lazy tab loading & terminal persistence (53 tests)
  - PR #8: Tab & pane context menus, closed workspaces menu (59 tests)
  - PR #9: App launch & terminal integration fixes

## Active Decisions
- Tech stack: Electron + React + TypeScript + xterm.js + node-pty + Zustand
- Package manager: bun | Linter: Biome | Test runner: Vitest
- Config storage: ~/.knkode/ (JSON files)
- PTY lifecycle: lazy loading with CSS show/hide for tab persistence

## What's Next
- Follow-up opportunities:
  - Extract `useContextMenu` hook from Tab.tsx/Pane.tsx (DRY)
  - Additional test coverage for renderer components
  - Performance profiling (allotment initial render warning)
