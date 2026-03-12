# PR #96 Comment Analysis: fix: render scanline/noise effects above terminal text

## Summary

The PR splits `PaneEffects` into `PaneBackgroundEffects` (z-0) and `PaneOverlayEffects` (z-30), moving scanlines and noise above terminal content. Comments are mostly accurate but contain one factual error in a z-index reference and one imprecise claim about CSS containment coverage.

## Must Fix

- `src/renderer/src/components/PaneEffects.tsx:94` -- The JSDoc for `PaneOverlayEffects` states "Renders at z-20" but the actual wrapper div on line 110 uses `className="... z-30 ..."`. This is a direct factual contradiction. The comment should read "Renders at z-30". Leaving this as-is will mislead any developer reasoning about z-index stacking order, especially since the drop zone overlay in `Pane.tsx:756` actually uses `z-20` -- someone could incorrectly conclude these two layers share the same z-index.

## Suggestions

- `src/renderer/src/components/PaneEffects.tsx:21` -- The JSDoc for `PaneBackgroundEffects` states "Uses `contain: layout paint style` on each layer for GPU compositing." This is inaccurate: the glow layer (line 82-87, z-[2]) does NOT set `contain` in its inline styles, while the gradient and decoration layers do. Either add `contain` to the glow layer's style object for consistency, or amend the comment to say something like "Uses `contain: layout paint style` on gradient and decoration layers for GPU compositing." The current wording implies all three child layers have containment, which is false.

- `src/renderer/src/components/PaneEffects.tsx:16-21` -- Now that the component has been split in two, consider adding a brief note to the `PaneBackgroundEffects` JSDoc mentioning its sibling `PaneOverlayEffects` and the overall z-index stacking across the Pane (z-0 background, z-10 content, z-20 drop zone, z-30 overlay). This full-picture comment would help a future maintainer understand the layering without needing to read `Pane.tsx`. The current comment only documents the internal stacking (z-0, z-[1], z-[2]) within the background layer.

## Nitpicks

- None
