# knkode — Handoff

## What Was Done
- [done] Tailwind CSS v4 migration — all inline styles → Tailwind classes (PR #16)
  - Installed `tailwindcss@4.1.18` + `@tailwindcss/vite@4.1.18`
  - Semantic design tokens in `@theme`: surfaces, content tiers, functional colors, spacing, shadows
  - Converted 8 component files, deleted `shared.ts`, removed all imperative hover handlers
  - Extracted `.ctx-menu`, `.ctx-item`, `.ctx-input`, `.ctx-submit`, `.settings-input`, `.section-label` to `@layer components`
  - Added `focus-visible:ring` to all action buttons

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
