# knkode — Handoff

## What Was Done
- [done] Project foundation — configs, shared types, main process, preload (PR #1, merged)
- [done] Workspace UI — renderer layer with all core components (PR #2, merged)
- [done] Keyboard shortcuts & focus tracking (PR #3, merged)
- [done] Drag-to-reorder workspace tabs (PR #4, merged)
- [done] Testing — vitest setup + 44 store tests, review fixes applied (PR #5, ready to merge)

## Active Decisions
- Tech stack: Electron + React + TypeScript + xterm.js + node-pty + Zustand
- Package manager: bun | Linter: Biome | Test runner: Vitest
- Config storage: ~/.knkode/ (JSON files)
- WorkspaceLayout: discriminated union (`preset` vs `custom` variants)

## What's Next
1. Merge testing PR #5
