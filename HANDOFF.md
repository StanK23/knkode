# knkode — Handoff

## What Was Done
- [done] Release reliability fixes (PR #26) — 9-agent review, all 17 findings addressed
  - ErrorBoundary wrapping each PaneArea with Try Again + Reload, role="alert", autoFocus
  - Atomic config writes (write .tmp → rename) with cleanup logging
  - CwdInput with tilde→homeDir resolution, shared isValidCwd utility, error text, Escape handling
  - Extracted validation.ts shared utility (DRY with Pane.tsx context menu)
- [done] Tab bar button hit areas (PR #25)
- [done] Drag-and-drop pane reordering (PR #24)
- [done] Move panes between workspaces (PR #23)
- [done] Layout preservation + auto-apply settings (PR #22)

## Active Decisions
- Tech stack: Electron + React + TypeScript + xterm.js + node-pty + Zustand
- Styling: **Tailwind CSS v4** with @tailwindcss/vite plugin, semantic color tokens in @theme
- Package manager: bun | Linter: Biome | Test runner: Vitest
- Config storage: ~/.knkode/ (JSON files, atomic writes)
- PTY lifecycle: store-managed (ensurePty/killPtys/removePtyId) — decoupled from React mount

## What's Next
- PR #2: Find in terminal (SearchAddon + Cmd+F) + clickable URLs (WebLinksAddon)
- PR #3: Pane navigation shortcuts (Cmd+Arrow) + close workspace tab (Cmd+Shift+W)
- PR #4: Dynamic window title ("workspace name — knkode")
- PR #5: Terminal settings (scrollback length + cursor style, persisted per-workspace)
- Follow-up: Unit tests for `swapPanes` + `applyPresetWithRemap`
- Follow-up: Extract `usePaneDrag` hook (DRY — 6 callbacks in Pane.tsx)
- Follow-up: Focus trap for SettingsPanel modal
- Follow-up: Extract `useContextMenu` hook (DRY — Pane/Tab)
