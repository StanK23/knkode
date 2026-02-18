# knkode — Handoff

## What Was Done
- [done] UI polish — terminal padding, thinner separators, larger gear button (PR #18)
  - `p-px` padding on terminal wrapper (prevents content flush against edges)
  - `--sash-size: 2px` CSS variable for thinner allotment separators
  - Gear + new-workspace buttons: aligned to `text-lg px-2.5` with `hover:bg-overlay rounded-sm`
  - Review: 9 agents, all findings addressed (removed redundant `setSashSize` call, fixed button consistency)
- [done] Tailwind CSS v4 migration — all inline styles → Tailwind classes (PR #16)

## Active Decisions
- Tech stack: Electron + React + TypeScript + xterm.js + node-pty + Zustand
- Styling: **Tailwind CSS v4** with @tailwindcss/vite plugin, semantic color tokens in @theme
- Package manager: bun | Linter: Biome | Test runner: Vitest
- Config storage: ~/.knkode/ (JSON files)
- PTY lifecycle: store-managed (ensurePty/killPtys/removePtyId) — decoupled from React mount

## What's Next
- Settings redesign: theme presets, font family selector, SVG layout icons (branch: `feature/settings-redesign`)
- Follow-up: Extract ghost button pattern (bg-transparent border-none...) to @layer components
- Follow-up: Focus trap for SettingsPanel modal (`aria-modal` expects containment)
- Follow-up: Extract `useContextMenu` hook (DRY)
- Follow-up: Context menu keyboard navigation (arrow keys, role="menu")
- Follow-up: Additional test coverage for renderer components
