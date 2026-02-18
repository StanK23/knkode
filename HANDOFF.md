# knkode — Handoff

## What Was Done
- [done] Pane context menu bugfixes (PR #21) — 9-agent review, all findings addressed
  - Context menu now opens at mouse cursor position (was hardcoded top-right)
  - Fixed stuck-dismiss: capture-phase mousedown escapes xterm's stopPropagation
  - position:fixed escapes allotment's overflow:hidden, useLayoutEffect clamps to viewport
  - Auto-focus context menu on open so Escape key works immediately
  - Null guard for e.target in useClickOutside
- [done] Settings polish round 2 (PR #20) — reviewed by 10-agent swarm, all findings addressed
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
- Follow-up: Extract `useContextMenu` hook (DRY — shared boilerplate in Pane/Tab)
- Follow-up: Context menu keyboard navigation (arrow keys, role="menu")
- Follow-up: Named `Point` type for context menu position state
- Follow-up: Additional test coverage for renderer components
