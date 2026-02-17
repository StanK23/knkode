# knkode — Handoff

## What Was Done
- [done] Bug fix: UI layout, accessibility & polish (PR #12) — 8-agent review
- [done] Bug fix: UI testing bugs — drag region, split dirs, settings shortcut, focus indicator (PR #14) — 9-agent review

## Active Decisions
- Tech stack: Electron + React + TypeScript + xterm.js + node-pty + Zustand
- Package manager: bun | Linter: Biome | Test runner: Vitest
- Config storage: ~/.knkode/ (JSON files)
- PTY lifecycle: store-managed (ensurePty/killPtys/removePtyId) — decoupled from React mount

## What's Next
- Follow-up: Focus trap for SettingsPanel modal (`aria-modal` expects containment)
- Follow-up: Extract `useContextMenu` hook (DRY)
- Follow-up: Extract ghost button base style to shared (5+ duplicates)
- Follow-up: Context menu keyboard navigation (arrow keys, role="menu")
- Follow-up: Additional test coverage for renderer components
