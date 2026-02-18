# knkode — Handoff

## What Was Done
- [done] Settings redesign + UI testing bugfixes + review fixes (PR #19)
  - Live theme preview via `previewWorkspaceTheme` (in-memory only, cancel reverts)
  - Fully themed preset cards, font picker as visual grid (shared `FontPicker` component)
  - Proper gear/cog SVG icon + min-w-[44px] touch target
  - Terminal: conditional fit() (only on metric changes), error logging in catch blocks
  - Helpers: `buildThemeFromInputs`, `buildXtermTheme`, `ThemeInputFields` interface
  - Review: 9 agents, all 17 findings addressed (5 must-fix, 7 suggestions, 5 nitpicks)
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
