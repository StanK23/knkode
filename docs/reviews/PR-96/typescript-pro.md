# PR #96 Review -- TypeScript / React / Performance

## Summary

Splits the monolithic `PaneEffects` component into `PaneBackgroundEffects` (z-0, behind content) and `PaneOverlayEffects` (z-30, above content) so that scanline and noise effects render over terminal text instead of behind it. The split is clean and the early-return `null` optimization in `PaneOverlayEffects` is a nice touch.

## Must Fix

- **`PaneEffects.tsx:110` / `Pane.tsx:756` -- z-index conflict between overlay effects and drop zone.** `PaneOverlayEffects` renders at `z-30` but the drag-and-drop drop zone overlay renders at `z-20`. When scanlines/noise are active and the user drags a pane, the drop zone highlight will be hidden behind the scanline/noise layer, making it invisible. Either bump the drop zone to `z-40` or lower the overlay effects to something below `z-20` (e.g. `z-[15]`).

## Suggestions

- **`PaneEffects.tsx:11-14` / `PaneEffects.tsx:98` -- inconsistent prop typing between the two components.** `PaneBackgroundEffects` uses the named `PaneEffectsProps` interface (with `theme` and `isFocused`), but `PaneOverlayEffects` uses an inline type `{ theme: PaneTheme }`. Since `PaneOverlayEffects` only needs `theme`, this is technically fine, but it would be cleaner to either (a) define a separate named `PaneOverlayEffectsProps` interface for explicitness, or (b) use `Pick<PaneEffectsProps, 'theme'>` to make the relationship between the two components obvious and keep changes in sync.

- **`PaneEffects.tsx:33` / `PaneEffects.tsx:100` -- duplicated `mul` helper.** The lambda `(level: unknown) => EFFECT_MULTIPLIERS[isEffectLevel(level) ? level : 'off']` is now defined identically in both `useMemo` callbacks. Extract it to a module-level utility function (e.g. `function resolveEffectMul(level: unknown): number`) to avoid the duplication and make the intent clearer. This also avoids re-creating the closure on every render in each component.

- **`PaneEffects.tsx:94-96` -- JSDoc says z-20, component uses z-30.** The doc comment reads "Renders at z-20" but the actual class is `z-30`. Update the comment to match the implementation (or vice versa, once the z-index conflict above is resolved).

## Nitpicks

- **`PaneEffects.tsx:40-45` -- `effectGlow` and `effectGradient` are computed outside `useMemo` in `PaneBackgroundEffects`.** These derive from `theme.glow`, `theme.accent`, and `theme.gradient`, which are object properties that may or may not change between renders. Since `hexToRgba` and the string concatenation are cheap, this is not a real performance issue, but it is inconsistent with the rest of the component's pattern of memoizing derived values. Worth noting for consistency, not urgency.

- **`PaneEffects.tsx:113` / `PaneEffects.tsx:119` -- redundant `pointer-events-none` on children.** Both the scanline and noise child divs have `pointer-events-none`, but their parent wrapper at line 110 already sets `pointer-events-none`. The children inherit this, so the class is redundant. Removing it would reduce class noise.
