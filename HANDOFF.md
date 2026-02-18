# knkode — Handoff

## What Was Done
- [done] Settings polish round 2 (PR #20)
  - Theme presets: 16 themes (8 dark + 4 light + Catppuccin/Gruvbox/Rosé Pine/Kanagawa), smaller cards, name-as-preview (no "Aa")
  - FontPicker: 14 fonts (added IBM Plex Mono, Hack, Inconsolata, Ubuntu Mono, Roboto Mono, Victor Mono), 3-column grid
  - BG/FG color pickers on same row
  - Replaced `opacity` with `unfocusedDim` — black overlay on unfocused panes, slider 0-70%
  - Config migration: `opacity` → `unfocusedDim` in config-store.ts
  - App icon: custom terminal-workspace icon (resources/icon.png + icon.icns), dock icon set in main process
- [done] Settings redesign + UI testing bugfixes + review fixes (PR #19)
- [done] UI polish — terminal padding, thinner separators, larger gear button (PR #18)

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
