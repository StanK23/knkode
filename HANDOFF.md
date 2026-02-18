# knkode — Handoff

## What Was Done
- [done] Settings redesign — theme presets, font selector, SVG layout icons (PR #19)
  - `fontFamily?` added to PaneTheme (backward compatible)
  - 8 theme presets (Default Dark, Dracula, One Dark, Solarized Dark, Tokyo Night, GitHub Dark, Monokai, Nord)
  - Font family dropdown (8 monospace fonts) in settings + pane context menu
  - SVG layout icons replacing Unicode characters
  - `buildFontFamily()` helper, `as const` arrays, `Pick<PaneTheme>` for ThemePreset
  - Review: 9 agents, all findings addressed (DRY, accessibility, error handling, type safety)
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
