# knkode — Handoff

## What Was Done
- [done] Project foundation — configs, shared types, main process, preload (PR #1)
- [done] Workspace UI — renderer layer with all core components (PR #2)
- [done] Keyboard shortcuts & focus tracking (PR #3)
- [done] Drag-to-reorder workspace tabs (PR #4)
- [done] Vitest setup + 44 store tests (PR #5)
- [done] Feature completion plan — `/autopilot` run (PRs #7–#9)
- [in-progress] Bug fix: PTY lifecycle & crash-on-close (fix/pty-lifecycle-bugs)

## Active Decisions
- Tech stack: Electron + React + TypeScript + xterm.js + node-pty + Zustand
- Package manager: bun | Linter: Biome | Test runner: Vitest
- Config storage: ~/.knkode/ (JSON files)
- PTY lifecycle: store-managed (ensurePty/killPty) — decoupled from React mount

## What's Next
- Bug fix: UI layout, accessibility & polish (fix/ui-layout-polish)
- Follow-up: Extract `useContextMenu` hook (DRY)
- Follow-up: Additional test coverage for renderer components
