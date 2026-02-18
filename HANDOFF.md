# knkode — Handoff

## What Was Done
- [done] Terminal addons (PR #27) — SearchAddon + Cmd+F, WebLinksAddon + IPC URL opening, 13 findings addressed
- [done] Release reliability fixes (PR #26) — ErrorBoundary, atomic config writes, CwdInput validation
- [done] Tab bar button hit areas (PR #25)
- [done] Drag-and-drop pane reordering (PR #24)
- [done] Move panes between workspaces (PR #23)

## Active Reviews

### PR #28 — feat: keyboard shortcuts (close tab, pane navigation)
- State: `docs/reviews/PR-28/_state.json`
- Agents: 9/9 completed
- Phase: done — compiled report ready, fixing findings

## Active Decisions
- Tech stack: Electron + React + TypeScript + xterm.js + node-pty + Zustand
- Styling: **Tailwind CSS v4** with @tailwindcss/vite plugin, semantic color tokens in @theme
- Package manager: bun | Linter: Biome | Test runner: Vitest
- Config storage: ~/.knkode/ (JSON files, atomic writes)
- PTY lifecycle: store-managed (ensurePty/killPtys/removePtyId) — decoupled from React mount

## What's Next
- PR #3: Keyboard shortcuts v2 — under review (PR #28)
- PR #4: Dynamic window title ("workspace name — knkode")
- PR #5: Terminal settings (scrollback length + cursor style, persisted per-workspace)
- Follow-up: Unit tests for `swapPanes` + `applyPresetWithRemap`
- Follow-up: Extract `usePaneDrag` hook (DRY — 6 callbacks in Pane.tsx)
- Follow-up: Focus trap for SettingsPanel modal
- Follow-up: Extract `useContextMenu` hook (DRY — Pane/Tab)
