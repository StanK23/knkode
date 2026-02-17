# knkode — Handoff

## What Was Done
- [done] Project foundation — configs, shared types, main process, preload (`feature/project-foundation`)
- [done] PR-1 round 2 review — 8 agents, all 7 must-fix items resolved:
  - Removed duplicate mainWindow, use singleton exclusively
  - Full IPC validation with assertion helpers (assertWorkspace, assertAppState, assertPaneId, etc.)
  - Config-store: ENOENT vs corruption distinction, .corrupt backup, mode 0o600, error handling
  - PTY: throw on missing write session, kill error handling, startup guard, /bin/sh fallback
  - CWD tracker: try/catch per-pane in polling loop
  - IpcChannel union type constraining preload
  - tsconfig.node.json include fix, Biome formatting

## Active Decisions
- Tech stack: Electron + React + TypeScript + xterm.js + node-pty + Zustand
- Package manager: bun | Linter: Biome
- Config storage: ~/.knkode/ (JSON files)
- WorkspaceLayout: discriminated union (`preset` vs `custom` variants)

## What's Next
1. Workspace UI — TabBar, App.tsx, SettingsPanel, LayoutPicker, store (new branch)
2. Keyboard shortcuts & polish
