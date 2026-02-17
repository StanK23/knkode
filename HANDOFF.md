# knkode — Handoff

## What Was Done
- [done] Project foundation — configs, shared types, main process, preload (`feature/project-foundation`)
- [done] PR-1 round 1 review fixes — security, error handling, IPC validation, DRY

## Active Reviews

### PR #1 — feat: project foundation — configs, backend, preload
- State: `docs/reviews/PR-1/_state.json`
- Agents: 8/8 completed
- Phase: done — compiled report at `docs/reviews/PR-1/compiled-report.md`
- **7 must-fix items** remaining (duplicate mainWindow, shallow IPC validation, unsafe readJson, writeJson errors, writePty no-op, tsconfig include, Biome lint)

## Active Decisions
- Tech stack: Electron + React + TypeScript + xterm.js + node-pty + Zustand
- Package manager: bun | Linter: Biome
- Config storage: ~/.knkode/ (JSON files)
- WorkspaceLayout: discriminated union (`preset` vs `custom` variants)

## What's Next
1. Fix PR-1 must-fix findings (on `feature/project-foundation`)
2. Workspace UI — TabBar, App.tsx, SettingsPanel, LayoutPicker, store (new branch)
3. Keyboard shortcuts & polish
