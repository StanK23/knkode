# Configurable Effects & Identity Themes V2 — Implementation Plan

**Design doc:** docs/plans/2026-03-09-configurable-effects-design.md
**Created:** 2026-03-09

## Tasks

### Task 1: Effect levels — refactor booleans to EffectLevel, add UI controls ✅
- **Branch:** `feature/effect-levels`
- **PR title:** feat: configurable effect levels with segmented button UI
- **Scope:** types, Terminal.tsx, SettingsPanel.tsx, theme-presets, colors.ts, global.css
- **Card:** af28b901
- **Status:** Merged (PR #81)

### Task 2: Five new identity themes — designed with frontend-design skill
- **Branch:** `feature/identity-themes-v2`
- **PR title:** feat: add Amber, Vaporwave, Ocean, Sunset, Arctic identity themes
- **Scope:** theme-presets.ts, theme-presets.test.ts, docs/THEMING.md
- **Card:** f4c84dc8
- **Details:**
  - Use `/frontend-design` skill for each theme — no cookie-cutter formula
  - Amber: vintage phosphor terminal (monochrome amber ANSI, warm glow, scanlines)
  - Vaporwave: 80s synthwave (pink-purple-cyan ANSI, heavy glow, bold gradients)
  - Ocean: deep sea bioluminescent (dark blue-black, cool blue-green ANSI, organic glow)
  - Sunset: golden hour warmth (dark warm base, orange-red-gold ANSI, warm gradient)
  - Arctic: frozen tundra (near-white on deep blue, cool mint ANSI, crystalline glow)
  - Each theme: full 16-color ANSI palette, accent, glow, gradient string, default effect levels
  - All ANSI palettes must pass contrast checks against their background
  - Add tests for new themes (effects present, palette complete)
  - Update THEMING.md effects table with new themes

### Task 3: Theming guide V2 — update docs for levels + new themes
- **Branch:** `docs/theming-guide-v2`
- **PR title:** docs: update theming guide for effect levels and new identity themes
- **Scope:** docs/THEMING.md
- **Card:** 3999a99c
- **Details:**
  - Rewrite effect fields section for EffectLevel system
  - Document segmented button UI and user override behavior
  - Add all 8 identity themes to effects breakdown table
  - Update "Creating a new theme" section with effect level guidance
  - Document migration from boolean fields
  - Update reduced-motion section for level-aware behavior

### Task 4: Tab bar redesign — colored workspace tabs, wider default, dynamic sizing
- **Branch:** `feature/tab-bar-redesign`
- **PR title:** feat: redesign tab bar with colored tabs, badges, and dynamic sizing
- **Scope:** TabBar.tsx, global.css, workspace store
- **Card:** 3cd4bde5
- **Details:**
  - Colored workspace tabs (workspace color as accent/highlight)
  - Default tab width 2x current, dynamic shrinking when many tabs
  - Count badges showing pane count per workspace
  - Close buttons on tabs
  - Replace terminal-style tabs with polished custom React components

### Task 5: Pane status bar — cwd path, git branch badge, polished header
- **Branch:** `feature/pane-status-bar`
- **PR title:** feat: pane status bar with cwd, git branch badge
- **Scope:** Terminal.tsx (or new PaneHeader component), pty cwd tracking integration
- **Card:** 776499ba
- **Details:**
  - Current working directory path (auto-updates via pty cwd tracking)
  - Git branch badge (always visible, styled pill)
  - PR status info in title (if available)
  - Clean, themed design matching workspace theme
