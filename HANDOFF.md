# knkode — Handoff

## What Was Done
- [done] Settings polish round 2 (PR #20) — reviewed by 10-agent swarm, all findings addressed
  - Theme presets: 16 themes (12 dark + 4 light), smaller cards, name-as-preview (no "Aa")
  - FontPicker: 14 fonts, 3-column grid
  - BG/FG color pickers on same row
  - Replaced `opacity` with `unfocusedDim` — black overlay on unfocused panes, slider 0-70%
  - Config migration: `migrateTheme()` with null guard, type-safe reconstruction, 7 unit tests
  - App icon: custom terminal-workspace icon, production-safe paths
  - Review fixes: DEFAULT_UNFOCUSED_DIM constant, aria-pressed, dim overlay scoped + transitioned + clamped
- [done] Settings redesign + UI testing bugfixes + review fixes (PR #19)
- [done] UI polish — terminal padding, thinner separators, larger gear button (PR #18)

## Active Reviews

### PR #21 — fix: pane context menu positioning and stuck dismiss
- State: `docs/reviews/PR-21/_state.json`
- Agents: 9/9 completed
- Phase: done — compiling fixes

## Active Decisions
- Tech stack: Electron + React + TypeScript + xterm.js + node-pty + Zustand
- Styling: **Tailwind CSS v4** with @tailwindcss/vite plugin, semantic color tokens in @theme
- Package manager: bun | Linter: Biome | Test runner: Vitest
- Config storage: ~/.knkode/ (JSON files)
- PTY lifecycle: store-managed (ensurePty/killPtys/removePtyId) — decoupled from React mount

## What's Next
- Follow-up: Extract ghost button pattern (bg-transparent border-none...) to @layer components
- Follow-up: Focus trap for SettingsPanel modal (`aria-modal` expects containment)
- Follow-up: Extract `useContextMenu` hook (DRY)
- Follow-up: Context menu keyboard navigation (arrow keys, role="menu")
- Follow-up: Additional test coverage for renderer components
