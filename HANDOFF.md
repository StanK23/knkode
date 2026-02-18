# knkode — Handoff

## What Was Done
- [in-progress] Drag-and-drop pane reordering (PR #24) — branch: `feat/reorder-panes`
  - Store action `swapPanes`: walks layout tree, swaps leaf paneId values
  - HTML5 DnD on pane headers with `application/x-knkode-pane` MIME type
  - Visual: opacity-40 drag, inset accent shadow drop target (matches tab DnD)
- [done] Move panes between workspaces (PR #23)
- [done] Layout preservation + auto-apply settings (PR #22)
- [done] Pane context menu bugfixes (PR #21)
- [done] Settings polish round 2 (PR #20)

## Active Decisions
- Tech stack: Electron + React + TypeScript + xterm.js + node-pty + Zustand
- Styling: **Tailwind CSS v4** with @tailwindcss/vite plugin, semantic color tokens in @theme
- Package manager: bun | Linter: Biome | Test runner: Vitest
- Config storage: ~/.knkode/ (JSON files)
- PTY lifecycle: store-managed (ensurePty/killPtys/removePtyId) — decoupled from React mount

## What's Next
- Follow-up: Unit tests for `applyPresetWithRemap` (3 cases: same count, fewer, more)
- Follow-up: Debounce theme/color auto-persist if disk write perf becomes an issue
- Follow-up: Extract ghost button pattern to @layer components
- Follow-up: Focus trap for SettingsPanel modal
- Follow-up: Extract `useContextMenu` hook (DRY — Pane/Tab)
- Follow-up: Context menu keyboard navigation (arrow keys, role="menu")
