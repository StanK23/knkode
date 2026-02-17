# knkode — Handoff

## What Was Done
- [done] Project foundation — configs, shared types, main process, preload (PR #1)
- [done] Workspace UI — renderer layer with all core components (PR #2)
- [done] Keyboard shortcuts & focus tracking (PR #3)
- [done] Drag-to-reorder workspace tabs (PR #4)
- [done] Testing — vitest setup + 44 store tests (PR #5)

## Active Decisions
- Tech stack: Electron + React + TypeScript + xterm.js + node-pty + Zustand
- Package manager: bun | Linter: Biome | Test runner: Vitest
- Config storage: ~/.knkode/ (JSON files)
- WorkspaceLayout: discriminated union (`preset` vs `custom` variants)

## What's Next
- Plan next feature set (component tests, settings panel, terminal integration, etc.)
