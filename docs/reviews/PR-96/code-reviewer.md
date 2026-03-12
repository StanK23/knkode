# PR #96 Review: fix: render scanline/noise effects above terminal text

## Summary

Clean refactor that splits `PaneEffects` into two components (`PaneBackgroundEffects` at z-0 and `PaneOverlayEffects` at z-30) so scanlines and noise render on top of terminal text instead of behind it. The change is well-structured, follows existing patterns, and both Biome and build pass cleanly.

## Must Fix

- `PaneEffects.tsx:94` -- JSDoc comment says "Renders at z-20" but the actual wrapper div on line 110 uses `z-30`. The comment must match the implementation.

## Suggestions

- `Pane.tsx:756` / `PaneEffects.tsx:110` -- The drop zone overlay uses `z-20` while `PaneOverlayEffects` uses `z-30`. During drag-and-drop, the drop zone indicator will render underneath the scanline/noise overlay, making it harder to see on panes with active scanline/noise effects. Consider bumping the drop zone to `z-40` or lowering the overlay effects below it so the drag visual feedback is always clearly visible.

## Nitpicks

None
