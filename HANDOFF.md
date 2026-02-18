# knkode — Handoff

## What Was Done
- [done] Layout preservation + auto-apply settings (PR #22) — 9-agent review, all must-fix items addressed
  - Layout preset changes preserve existing panes by position (remap, not kill-all)
  - Settings auto-persist immediately (Save/Cancel removed, Done button added)
  - Race condition fixed: getState() reads latest workspace, not stale ref
  - Separate mount guards per effect, .catch() on all updateWorkspace calls
  - Shared remapLayoutTree utility extracted (DRY with duplicateWorkspace)
  - Defensive guards: throw on unmapped pane IDs and missing pane configs
- [done] Pane context menu bugfixes (PR #21)
- [done] Settings polish round 2 (PR #20)
- [done] Settings redesign + UI testing bugfixes (PR #19)

## Active Decisions
- Tech stack: Electron + React + TypeScript + xterm.js + node-pty + Zustand
- Styling: **Tailwind CSS v4** with @tailwindcss/vite plugin, semantic color tokens in @theme
- Package manager: bun | Linter: Biome | Test runner: Vitest
- Config storage: ~/.knkode/ (JSON files)
- PTY lifecycle: store-managed (ensurePty/killPtys/removePtyId) — decoupled from React mount

## What's Next
- Plan: `docs/plans/2026-02-18-polish-round3-plan.md` — PR #2 (move panes between workspaces), PR #3 (reorder panes within workspace)
- Follow-up: Unit tests for `applyPresetWithRemap` (3 cases: same count, fewer, more)
- Follow-up: Debounce theme/color auto-persist if disk write perf becomes an issue
- Follow-up: Extract ghost button pattern to @layer components
- Follow-up: Focus trap for SettingsPanel modal
- Follow-up: Extract `useContextMenu` hook (DRY — Pane/Tab)
- Follow-up: Context menu keyboard navigation (arrow keys, role="menu")
