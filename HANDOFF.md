# knkode — Handoff

## What Was Done
- [in-review] GitHub Actions CI + release workflows (PR #31) — lint/test on PRs, macOS dmg+zip on tags, review fixes applied
- [in-review] Terminal settings (PR #30) — scrollback + cursor style, review fixes applied
- [done] Dynamic window title (PR #29) — "workspace name — knkode" in dock/Mission Control/Cmd+Tab
- [done] Keyboard shortcuts v2 (PR #28) — Cmd+Shift+W close tab, Cmd+Alt+Arrow pane nav
- [done] Terminal addons (PR #27) — SearchAddon + Cmd+F, WebLinksAddon + IPC URL opening
- [done] Release reliability fixes (PR #26) — ErrorBoundary, atomic config writes, CwdInput validation

## Active Decisions
- Tech stack: Electron + React + TypeScript + xterm.js + node-pty + Zustand
- Styling: **Tailwind CSS v4** with @tailwindcss/vite plugin, semantic color tokens in @theme
- Package manager: bun | Linter: Biome | Test runner: Vitest
- Config storage: ~/.knkode/ (JSON files, atomic writes)
- PTY lifecycle: store-managed (ensurePty/killPtys/removePtyId) — decoupled from React mount

## What's Next
- Merge PR #30
- Follow-up: Unit tests for `swapPanes` + `applyPresetWithRemap`
- Follow-up: Extract `usePaneDrag` hook (DRY — 6 callbacks in Pane.tsx)
- Follow-up: Focus trap for SettingsPanel modal
- Follow-up: Extract `useContextMenu` hook (DRY — Pane/Tab)
- Follow-up: IPC `assertWorkspace` per-field theme validation
