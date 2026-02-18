# knkode — Handoff

## What Was Done
- [in-progress] Move panes between workspaces (PR #23) — branch: `feat/move-pane-to-workspace`
  - Store action `movePaneToWorkspace`: removes from source tree, adds to dest, PTY stays alive
  - Extracted `removeLeafFromTree` shared helper (DRY with closePane)
  - "Move to Workspace" context menu submenu with color dot + name
  - Smart destination insertion: appends to horizontal root or wraps in new split
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
- Plan: `docs/plans/2026-02-18-polish-round3-plan.md` — PR #3 (reorder panes within workspace)
- Follow-up: Unit tests for `applyPresetWithRemap` (3 cases: same count, fewer, more)
- Follow-up: Debounce theme/color auto-persist if disk write perf becomes an issue
- Follow-up: Extract ghost button pattern to @layer components
- Follow-up: Focus trap for SettingsPanel modal
- Follow-up: Extract `useContextMenu` hook (DRY — Pane/Tab)
- Follow-up: Context menu keyboard navigation (arrow keys, role="menu")
