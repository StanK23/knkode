# PR #96 — Compiled Review Report

**PR:** fix: render scanline/noise effects above terminal text
**Files:** 2 (Pane.tsx, PaneEffects.tsx)
**Agents:** 6 (code-reviewer, security-auditor, code-simplifier, comment-analyzer, type-design-analyzer, typescript-pro)

## Must Fix (2)

1. **`PaneEffects.tsx:94` — JSDoc says z-20, implementation uses z-30** [ALL 6 agents]
   The JSDoc comment reads "Renders at z-20" but the wrapper div uses `z-30`.

2. **`PaneEffects.tsx:110` / `Pane.tsx:756` — z-index conflict: overlay z-30 vs drop zone z-20** [code-reviewer, security-auditor, type-design-analyzer, typescript-pro]
   `PaneOverlayEffects` at z-30 renders above the drop zone indicator at z-20. During drag-and-drop, scanlines/noise will obscure the drop feedback. Fix: bump drop zone to z-40.

## Suggestions (4)

3. **`PaneEffects.tsx:33,100` — Duplicated `mul` helper closure** [code-simplifier, type-design-analyzer, typescript-pro]
   The `(level: unknown) => EFFECT_MULTIPLIERS[...]` lambda is identical in both components. Extract to module-level utility.

4. **`PaneEffects.tsx:98` — Inline type for PaneOverlayEffects props** [security-auditor, type-design-analyzer, typescript-pro]
   Uses inline `{ theme: PaneTheme }` instead of named interface or `Pick<PaneEffectsProps, 'theme'>`.

5. **`PaneEffects.tsx:21` — JSDoc claims `contain` on all layers but glow layer lacks it** [comment-analyzer]
   The JSDoc says "Uses `contain: layout paint style` on each layer" but glow (z-[2]) doesn't set it.

6. **`PaneEffects.tsx:16-21` — Missing cross-reference to sibling PaneOverlayEffects** [comment-analyzer]
   JSDoc for PaneBackgroundEffects should mention PaneOverlayEffects and the full z-index stacking.

## Nitpicks (2)

7. **`PaneEffects.tsx:113,119` — Redundant pointer-events-none on children** [code-simplifier, typescript-pro]
   Parent wrapper already sets pointer-events-none; children inherit it.

8. **`PaneEffects.tsx:40-45` — effectGlow/effectGradient outside useMemo** [typescript-pro]
   Inconsistent with rest of component's pattern, though the computation is cheap.
