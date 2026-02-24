# UI Glass Polish Plan
Date: 2026-02-24

## Objective
Push the UI from functional to "premium/crafted" by combining a strict typographic grid for settings with a modern "floating glass" native aesthetic and mechanical motion curves.

## Scope & Tasks

### PR #1: `feat/ui-glass-polish`
**Branch:** `feat/ui-glass-polish`

1. **SettingsPanel Layout Refactor:**
   - Redesign `SettingsPanel.tsx` into a strict two-column typographic grid.
   - Left column: Labels (uppercase, tracked out, muted).
   - Right column: Interactive inputs aligned perfectly.
2. **Floating Glass Modal:**
   - Convert the solid modal background to translucent (`bg-canvas/80` or `bg-elevated/80`).
   - Apply `backdrop-blur-xl` filter.
   - Add a subtle 1px border (`border-white/10` or `border-edge`) to define edges against the blurred background.
3. **Mechanical Motion & CSS Tweaks:**
   - Update `global.css` with custom `cubic-bezier` keyframes for `animate-panel-in`.
   - Update hover transitions to feel snappier (mechanical overshoot/spring).
4. **TabBar & Consistency Touches:**
   - Ensure `TabBar.tsx` aligns with the new glass/mechanical feel.
   - Standardize hover decay and active states across the UI.

## Execution
- Create branch `feat/ui-glass-polish`.
- Implement changes in `global.css`, `SettingsPanel.tsx`, and `TabBar.tsx`.
- Commit, push, and submit for PR review.
