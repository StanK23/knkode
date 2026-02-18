# knkode — Handoff

## What Was Done
- [done] Tab bar button hit areas (PR #25) — 8-agent review, all findings addressed
  - Replaced drag-region overlay with standard Electron drag pattern (drag on parent, no-drag on children)
  - Extracted `.no-drag` CSS utility class, removed `.drag-region` class + `--spacing-drag` token
  - Added `min-w-[44px]` to "+" button, `min-h-[28px]` to closed-workspaces button (accessibility)
  - Added `self-center` to gear button + closed-workspaces menu for consistent vertical alignment
- [done] Drag-and-drop pane reordering (PR #24)
- [done] Move panes between workspaces (PR #23)
- [done] Layout preservation + auto-apply settings (PR #22)
- [done] Pane context menu bugfixes (PR #21)

## Active Decisions
- Tech stack: Electron + React + TypeScript + xterm.js + node-pty + Zustand
- Styling: **Tailwind CSS v4** with @tailwindcss/vite plugin, semantic color tokens in @theme
- Package manager: bun | Linter: Biome | Test runner: Vitest
- Config storage: ~/.knkode/ (JSON files)
- PTY lifecycle: store-managed (ensurePty/killPtys/removePtyId) — decoupled from React mount

## What's Next
- Follow-up: Unit tests for `swapPanes` + `applyPresetWithRemap`
- Follow-up: Extract `usePaneDrag` hook (DRY — 6 callbacks in Pane.tsx)
- Follow-up: Debounce theme/color auto-persist if disk write perf becomes an issue
- Follow-up: Extract ghost button pattern to @layer components
- Follow-up: Focus trap for SettingsPanel modal
- Follow-up: Extract `useContextMenu` hook (DRY — Pane/Tab)
- Follow-up: Context menu keyboard navigation (arrow keys, role="menu")
