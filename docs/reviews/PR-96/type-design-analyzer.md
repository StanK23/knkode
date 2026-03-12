# Type Design Review: PR #96

## Summary

This PR splits the monolithic `PaneEffects` component into `PaneBackgroundEffects` (z-0, behind content) and `PaneOverlayEffects` (z-30, above content) so that scanline/noise effects render on top of terminal text. The type design is sound -- both components consume the well-structured `PaneTheme` from shared types, and the split correctly narrows each component's concern. A few minor issues exist around props interface reuse, a stale JSDoc comment, and a z-index collision with the drop-zone overlay.

## Must Fix

- `src/renderer/src/components/PaneEffects.tsx:94` -- JSDoc says "Renders at z-20" but the actual className on line 110 uses `z-30`. The drop-zone overlay in `Pane.tsx:756` uses `z-20`. The code is correct (overlay effects should render above content at z-10 but below drop-zones... wait, z-30 is actually *above* the drop-zone z-20). This means scanline/noise effects will render on top of the drop-zone highlight, which is likely wrong -- the drop-zone indicator should be the topmost visual element so users can see where they are dropping. Either the overlay effects should use `z-20` and the drop-zone should use `z-30`, or vice versa. As it stands, scanlines will obscure the drop feedback.

## Suggestions

- `src/renderer/src/components/PaneEffects.tsx:98` -- `PaneOverlayEffects` uses an inline `{ theme: PaneTheme }` type instead of reusing the existing `PaneEffectsProps` interface (minus `isFocused`). Consider extracting a `PaneOverlayEffectsProps` interface or reusing `Pick<PaneEffectsProps, 'theme'>` to keep prop types named and discoverable. Inline object types for component props make it harder to find all components that depend on a given type when refactoring.

- `src/renderer/src/components/PaneEffects.tsx:100` -- The `mul` helper casts `level` to `unknown` in both components identically. This duplicated closure could be extracted to a module-level utility (e.g., `resolveEffectMultiplier(level: unknown): number`) to reduce duplication and make the pattern reusable. The cast to `unknown` is a defensive measure against partial theme objects, but it would be clearer as a named function with a doc comment explaining why the runtime guard exists.

## Nitpicks

- `src/renderer/src/components/PaneEffects.tsx:94` -- Minor: the JSDoc says "z-20" but the implementation uses `z-30`. Update the comment to match the actual z-index value regardless of the z-index ordering fix above.
