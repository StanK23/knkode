# HANDOFF

## Current State
- Branch: `main`
- Working on: Release Bugfixes v1 (board: "Release Bugfixes — v1")

## Recently Completed
- **PR #99** (merged) — Hide native menu bar + enable maximize button on Windows
- **PR #98** (merged) — Portal context menu + snippet dropdown to escape pane stacking context; xterm viewport-anchor scroll preservation
- Hotfix: snippet dropdown portal click-outside race (`useClickOutside` portalRef param)
- Hotfix: portal menus inherit theme CSS variables (`#portal-root` inside themed container)
- **PR #97** — Removed Solarized Light, added Everforest (preset, variant, tests)
- **PR #96** — Split PaneEffects into background (z-0) and overlay (z-20)
- **PR #95** — Diegetic Pane Frame architecture (27 files)

## What's Next
- PR 3: `fix/windows-spacebar` — Fix spacebar input on Windows
- PR 4: `fix/force-ansi-colors` — Force theme ANSI colors against Oh My Posh overrides
