# knkode — Handoff

## What Was Done
- [in-review] Terminal settings (PR #30) — scrollback length + cursor style, persisted per-workspace
- [done] Dynamic window title (PR #29) — "workspace name — knkode" in dock/Mission Control/Cmd+Tab
- [done] Keyboard shortcuts v2 (PR #28) — Cmd+Shift+W close tab, Cmd+Alt+Arrow pane nav
- [done] Terminal addons (PR #27) — SearchAddon + Cmd+F, WebLinksAddon + IPC URL opening
- [done] Release reliability fixes (PR #26) — ErrorBoundary, atomic config writes, CwdInput validation

## Active Reviews

### PR #30 — feat: terminal settings — scrollback + cursor style
- State: `docs/reviews/PR-30/_state.json`
- Agents: 9/9 completed
- Phase: done — awaiting fix pass

## Active Decisions
- Tech stack: Electron + React + TypeScript + xterm.js + node-pty + Zustand
- Styling: **Tailwind CSS v4** with @tailwindcss/vite plugin, semantic color tokens in @theme
- Package manager: bun | Linter: Biome | Test runner: Vitest
- Config storage: ~/.knkode/ (JSON files, atomic writes)
- PTY lifecycle: store-managed (ensurePty/killPtys/removePtyId) — decoupled from React mount

## What's Next
- Fix review findings for PR #30 (5 must-fix, 4 suggestions, 3 nitpicks)
- Follow-up: Unit tests for `swapPanes` + `applyPresetWithRemap`
- Follow-up: Extract `usePaneDrag` hook (DRY — 6 callbacks in Pane.tsx)
- Follow-up: Focus trap for SettingsPanel modal
- Follow-up: Extract `useContextMenu` hook (DRY — Pane/Tab)
- Follow-up: IPC `assertWorkspace` per-field theme validation
