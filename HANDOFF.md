# HANDOFF

## Current State
- Branch: `dev/theming` (theming rework base)
- `dev/agent-workspace` branch preserved with all rendered view work (PRs #58-75)
- Active plan: Theming Rework Phase 2 (knktx board: 6acd4876)

## What Was Done
- PR #84 merged: Tab bar redesign — colored workspace tabs (3px left accent strip + color-mix tint), flex-based dynamic sizing, pane count badges, SVG icons, roving tabindex a11y. 9-agent review, all findings fixed.
- PR #83 merged: 5 new identity themes (Amber, Vaporwave, Ocean, Sunset, Arctic) with full ANSI palettes, effect levels, cursor/selection colors. 5-agent review, all findings fixed.
- PR #82 merged: Rescaled dim/opacity, extracted shared constants
- PR #81 merged: Configurable effect levels with SegmentedButton UI
- PR #80 merged: Visual effects for identity themes — gradients, glow, scanlines
- PR #79 merged: Theming guide for contributors
- PR #78 merged: Theme presets — 11 distinct identities with full ANSI palettes
- PR #77 merged: Theme engine — ANSI 16-color palettes, per-theme accent/glow CSS vars
- PR #76 merged: Settings panel tabs with ARIA compliance
- CI workflow disabled (.github/workflows/ci.yml.disabled)
- PR #75 merged to dev/agent-workspace: Status bar layout (static + dynamic streaming bar), context gauge, token formatting, prompt caching support, isResponding turn-level tracking
- PR #74 merged: Status bar model/tokens + inline block token badges
- PR #73 merged: Full rendered conversation view for Claude Code agent
- PR #71 merged: Generic agent subprocess manager
- PR #58-69 merged: Agent workspace foundation

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

## Theming Rework — Phase 2 (In Progress)
Plan: `docs/plans/2026-03-09-configurable-effects-plan.md`

1. ~~PR #81: `feature/effect-levels` — EffectLevel type, segmented button UI, opacity scaling~~ (merged)
2. ~~PR #82: `fix/effect-rescale-blur` — Rescale dim/opacity, extract shared constants~~ (merged)
3. ~~PR #83: `feature/identity-themes-v2` — 5 new identity themes (Amber, Vaporwave, Ocean, Sunset, Arctic)~~ (merged)
4. ~~Docs update committed directly on `dev/theming` — user overrides + legacy migration sections~~ (done)
5. ~~PR #84: `feature/tab-bar-redesign` — Colored workspace tabs, wider default, dynamic sizing, count badges. 9-agent review, all findings fixed.~~ (merged)
6. PR: `feature/pane-status-bar` — Pane header with cwd path, git branch badge

## Remaining Work
- Fix TUI scroll-jumping-to-top bug

## Previous Work
- PR #58: Translucent pane backgrounds with blur
- PR #57: Fix scroll jump — linesFromBottom approach
- PR #56: Snippet reorder via DnD
- PR #51: Windows support + CI/CD
- PR #50: Dynamic workspace fonts
