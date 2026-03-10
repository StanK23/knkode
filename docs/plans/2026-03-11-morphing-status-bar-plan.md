# Morphing Pane Status Bar — Implementation Plan

**Design doc:** docs/plans/2026-03-11-morphing-status-bar-design.md
**Created:** 2026-03-11

## Tasks

### Task 1: Fix PR #85 review findings and merge plumbing
- **Branch:** `feature/pane-status-bar` (existing)
- **PR:** #85 (existing, update)
- **Scope:** Fix the 3 must-fix + 5 suggestion items from 9-agent review
- **Details:**
  - Clean up `paneBranches` entries in `closePane`, `removeWorkspace`, `closeWorkspaceTab`
  - Add ENOENT logging in `getGitBranch` bare catch, update JSDoc
  - Add `role="status"` and `aria-label` to branch badge
  - Add pane existence guard in App.tsx branch listener
  - Simplify callback to pass `updatePaneBranch` directly
  - Update polling comment to mention git cost
  - Use Tailwind classes for SVG sizing
  - Update JSDoc comments for accuracy
  - Push, merge into `dev/theming`

### Task 2: Variant architecture + PaneChrome integration
- **Branch:** `feature/pane-chrome-variants`
- **PR title:** feat: morphing pane status bar with 16 theme variants
- **Scope:** Create the variant system, refactor Pane.tsx and Terminal.tsx, implement all 16 variants
- **Details (atomic commits):**
  1. Create `pane-chrome/types.ts` — StatusBarProps, ScrollButtonProps, PaneVariant interface
  2. Create `pane-chrome/DefaultVariant.tsx` — fallback variant (clean, matches current look)
  3. Create `pane-chrome/index.ts` — VARIANT_REGISTRY, PaneChrome wrapper, ScrollButton wrapper
  4. Refactor `Pane.tsx` — replace inline header with PaneChrome, keep context menu + drag
  5. Refactor `Terminal.tsx` — replace inline scroll button with variant ScrollButton
  6. Implement `MatrixVariant.tsx` — CRT shell prompt aesthetic
  7. Implement `CyberpunkVariant.tsx` — neon HUD with glow + clip-path
  8. Implement `SolanaVariant.tsx` — crypto dashboard with gradient badge
  9. Implement `AmberVariant.tsx` — IBM phosphor terminal, ALL CAPS
  10. Implement `VaporwaveVariant.tsx` — 2-row synthwave maximalism
  11. Implement `OceanVariant.tsx` — bioluminescent depths, ghost buttons
  12. Implement `SunsetVariant.tsx` — golden hour editorial
  13. Implement `ArcticVariant.tsx` — crystalline precision, sharp corners
  14. Implement `DefaultDarkVariant.tsx` — clean modern baseline
  15. Implement `DraculaVariant.tsx` — gothic purple elegance
  16. Implement `TokyoNightVariant.tsx` — Japanese minimal, hidden actions
  17. Implement `NordVariant.tsx` — Scandinavian minimalism
  18. Implement `CatppuccinVariant.tsx` — soft pastel comfort
  19. Implement `GruvboxVariant.tsx` — retro earthy warmth
  20. Implement `MonokaiVariant.tsx` — classic hacker, color-coded actions
  21. Implement `SolarizedVariant.tsx` — warm light theme
