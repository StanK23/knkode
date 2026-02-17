# knkode — Handoff

## What Was Done
- [done] Project foundation — configs, shared types, main process, preload (PR #1)
- [done] Workspace UI — renderer layer with all core components (PR #2)
- [done] Keyboard shortcuts & focus tracking (PR #3)
- [done] Drag-to-reorder workspace tabs (PR #4)
- [done] Testing — vitest setup + 44 store tests (PR #5)
- [done] Feature completion brainstorming & planning
- [in-progress] PTY lifecycle — lazy tab loading & terminal persistence (`feature/pty-lifecycle`)

## Active Decisions
- Tech stack: Electron + React + TypeScript + xterm.js + node-pty + Zustand
- Package manager: bun | Linter: Biome | Test runner: Vitest
- Config storage: ~/.knkode/ (JSON files)
- WorkspaceLayout: discriminated union (`preset` vs `custom` variants)
- PTY lifecycle: lazy loading with CSS show/hide (not mount/unmount) for tab persistence
- Change directory UX: text input, not native folder picker

## What's Next
- Implement feature completion plan — see `docs/plans/2026-02-18-feature-completion-plan.md`
- Task 2: Context menus & closed workspaces (`feature/context-menus`)
- Task 3: Launch, test & fix (`fix/launch-and-integration`)
