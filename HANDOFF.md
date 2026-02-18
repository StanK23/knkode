# knkode — Handoff

## What Was Done
- [done] Move panes between workspaces (PR #23) — 9-agent review, all findings addressed
  - Store action `movePaneToWorkspace`: set() callback pattern, self-move guard, collision guard
  - Extracted `removeLeafFromTree` shared helper (DRY with closePane)
  - "Move to Workspace" context menu submenu with memoized selector, ctx-item styling
  - Persistence grouped with Promise.all, all early returns logged
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
