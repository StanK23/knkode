## Summary

Clean split of `PaneEffects` into background and overlay components. The separation is well-motivated (scanlines/noise need to render above terminal text) and the implementation is straightforward. A few minor inconsistencies to address.

## Must Fix

- `PaneEffects.tsx:94`: JSDoc says "Renders at z-20" but the actual wrapper div at line 110 uses `z-30`. The comment must match the code. Since `z-30` is correct (overlay must sit above the drop zone at `z-20` in `Pane.tsx:756`), update the comment to say "z-30".

## Suggestions

- `PaneEffects.tsx:100`: The `mul` helper lambda is duplicated verbatim across `PaneBackgroundEffects` (line 33) and `PaneOverlayEffects` (line 100). Extract it to a module-level function to avoid the duplication:
  ```ts
  function effectMul(level: unknown): number {
    return EFFECT_MULTIPLIERS[isEffectLevel(level) ? level : 'off']
  }
  ```
- `PaneEffects.tsx:11-13`: The `PaneEffectsProps` interface name is now misleading since it only applies to `PaneBackgroundEffects`. Consider renaming it to `PaneBackgroundEffectsProps` to match the component it serves.

## Nitpicks

- `PaneEffects.tsx:113,119`: `pointer-events-none` on the scanline and noise child divs is redundant since the parent wrapper (line 110) already sets `pointer-events-none`. Inherited by default in CSS. Removing them would reduce noise, though keeping them is harmless.
