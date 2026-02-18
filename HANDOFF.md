# knkode — Handoff

## What Was Done
- [done] Drag-and-drop pane reordering (PR #24) — 9-agent review, all findings addressed
  - Store action `swapPanes`: reuses `remapLayoutTree` with swap lambda
  - HTML5 DnD on pane headers: typed `PaneDragPayload`, `PANE_DRAG_MIME` constant
  - Visual: opacity-40 drag, full-border accent shadow drop target, a11y attributes
  - Review fixes: narrow catch, runtime type guard, counter symmetry, draggable={!isEditing}
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
- Follow-up: Unit tests for `swapPanes` + `applyPresetWithRemap`
- Follow-up: Extract `usePaneDrag` hook (DRY — 6 callbacks in Pane.tsx)
- Follow-up: Debounce theme/color auto-persist if disk write perf becomes an issue
- Follow-up: Extract ghost button pattern to @layer components
- Follow-up: Focus trap for SettingsPanel modal
- Follow-up: Extract `useContextMenu` hook (DRY — Pane/Tab)
- Follow-up: Context menu keyboard navigation (arrow keys, role="menu")
