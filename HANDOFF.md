# HANDOFF

## Current State
- Branch: `main` (stable, v1.0.0)
- `dev/agent-workspace` branch preserved with all rendered view work (PRs #58-75)

## What Was Done
- PR #93 merged: Fix PR badge not showing — PATH resolution for gh CLI in Electron (Homebrew dirs), unified retry logic (ghMissingSince/gitMissingSince), error logging with dedup. 7-agent review, all 12 findings addressed.
- PR #92 merged: Theming engine, UI chrome, and bugfixes — v1.0.0. Full theming system (16 presets, ANSI palettes, effects), morphing pane chrome, tab bar redesign, PR/branch badges, scroll hardening. 10-agent review, all 28 findings addressed including factory refactor (-772 lines).
- PR #91 merged: Harden passive terminal scroll sync
- PR #90 merged: Restore terminal pane inner padding
- PR #89 merged: Preserve pane sizes when splitting
- PR #88 merged: Passive TUI scroll jump hardening
- PR #87 merged: Clickable PR badge in pane status bar
- PR #86 merged: Morphing pane status bar — 16 theme variants
- PR #84 merged: Tab bar redesign — colored workspace tabs
- PR #83 merged: 5 new identity themes (Amber, Vaporwave, Ocean, Sunset, Arctic)
- PR #82 merged: Rescaled dim/opacity, extracted shared constants
- PR #81 merged: Configurable effect levels with SegmentedButton UI
- PR #80 merged: Visual effects for identity themes — gradients, glow, scanlines
- PR #79 merged: Theming guide for contributors
- PR #78 merged: Theme presets — 11 distinct identities with full ANSI palettes
- PR #77 merged: Theme engine — ANSI 16-color palettes, per-theme accent/glow CSS vars
- PR #76 merged: Settings panel tabs with ARIA compliance
- CI workflow disabled (.github/workflows/ci.yml.disabled)
- PRs #58-75 merged: Agent workspace foundation, rendered view, status bar (on dev/agent-workspace)

## Decision: Rendered View → V2 (On Hold)
The rendered agent view (stream-json parsing, custom chat UI) works but carries ongoing maintenance burden:
- Each provider/model update can break parsers
- Claude TUI gets features instantly (agent trees, thinking modes) that we'd need to reimplement
- Parser compatibility layer is a moving target across providers

**Decision:** Focus on TUI-native experience — multi-pane layout, theming, stability. The rendered view is preserved on `dev/agent-workspace` and can be resumed later if needed.

## Theming Rework — Phase 1 (Complete)
1. ~~PR #76: Settings tabs~~ (merged)
2. ~~PR #77: Theme engine — ANSI palettes, accent, glow~~ (merged)
3. ~~PR #78: Theme presets — 11 distinct identities~~ (merged)
4. ~~PR #79: Theming guide~~ (merged)
5. ~~PR #80: Visual effects — gradients, glow, scanlines~~ (merged)

## Theming Rework — Phase 2 (Complete)
Plan: `docs/plans/2026-03-09-configurable-effects-plan.md`

1. ~~PR #81: `feature/effect-levels` — EffectLevel type, segmented button UI, opacity scaling~~ (merged)
2. ~~PR #82: `fix/effect-rescale-blur` — Rescale dim/opacity, extract shared constants~~ (merged)
3. ~~PR #83: `feature/identity-themes-v2` — 5 new identity themes (Amber, Vaporwave, Ocean, Sunset, Arctic)~~ (merged)
4. ~~Docs update committed directly on `dev/theming` — user overrides + legacy migration sections~~ (done)
5. ~~PR #84: `feature/tab-bar-redesign` — Colored workspace tabs, wider default, dynamic sizing, count badges. 9-agent review, all findings fixed.~~ (merged)
6. ~~PR #85: `feature/pane-status-bar` — Git branch IPC plumbing, paneBranches store, badge in pane header. 9-agent review, all findings fixed.~~ (merged)
7. ~~PR #86: `feature/pane-chrome-variants` — Morphing status bar with 16 theme variants + scroll buttons. 9-agent review, all findings fixed.~~ (merged)
8. ~~PR #87: `feature/pr-badge` — Clickable PR badge in pane status bar. 9-agent review, all findings fixed.~~ (merged)

## Active Plan — Theme Polish & Status Bar Improvements
Board: `adbe0470-30b2-48cc-afa6-767a47912565`

1. ~~PR #93: `fix/pr-badge` — Fix PR badge not showing~~ (merged)
2. PR #94: `feature/theme-backgrounds` — Unique pane backgrounds per identity theme (review complete, fixing)
3. PR #3: `feature/status-bar-polish` — Tinted backgrounds, gradient separators
4. PR #4: `feature/flip-status-bar` — Status bar top/bottom toggle

## What's Next
- Theme backgrounds, status bar polish, flip setting (PRs 2-4 above)
- Future: interactive branch switching dropdown + cwd click-to-navigate

## Bugfixes — Post-Theming
Board: `13106f68-3789-458a-b9d2-5eb644b7e0ee`
- ~~PR #89: Fix pane split resetting sizes~~ (merged)
- ~~PR #90: Restore terminal pane inner padding~~ (merged)

## Remaining Work
- Manually verify long passive-output and workspace-tab-switch scenarios
- Future: interactive branch switching dropdown + cwd click-to-navigate (new IPC features)

## Previous Work
- PR #58: Translucent pane backgrounds with blur
- PR #57: Fix scroll jump — linesFromBottom approach
- PR #56: Snippet reorder via DnD
- PR #51: Windows support + CI/CD
- PR #50: Dynamic workspace fonts
