# knkode — Handoff

## What Was Done
- [done] Project foundation — configs, shared types, main process, preload (`feature/project-foundation`)
- [done] PR-1 review fixes — security (execFileSync, sandbox, URL validation), error handling, IPC validation, DRY (shared main-window module, cleanup idempotency, preload helper)

## Active Decisions
- Tech stack: Electron + React + TypeScript + xterm.js + node-pty + Zustand
- Package manager: bun
- Linter: Biome
- Config storage: ~/.knkode/ (JSON files)
- WorkspaceLayout: discriminated union (`preset` vs `custom` variants)

## What's Next
1. Workspace UI — TabBar, Pane, PaneArea, Terminal, SettingsPanel, LayoutPicker, App.tsx, store (new branch)
2. Keyboard shortcuts & polish — global shortcuts, final integration
