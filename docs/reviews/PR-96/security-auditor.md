# PR #96 Security Review: Render scanline/noise effects above terminal text

## Summary

This PR splits `PaneEffects` into two components (`PaneBackgroundEffects` at z-0, `PaneOverlayEffects` at z-30) so that scanline and noise CSS effects render on top of terminal text rather than behind it. The change is purely presentational, involves no user-supplied input, no IPC, no network calls, and no `dangerouslySetInnerHTML`. No security vulnerabilities were found.

## Must Fix

None

## Suggestions

- `PaneEffects.tsx:110` / `Pane.tsx:756` -- The overlay effects render at `z-30` while the drop-zone indicator sits at `z-20`. During a drag-and-drop operation, if scanline/noise effects are active, the overlay will paint over the drop-zone highlight. This is not a security issue, but the `pointer-events-none` on the overlay means users cannot visually confirm where they are dropping panes when effects are intense. Consider raising the drop-zone `z-index` to `z-40` or lowering the overlay to `z-[15]` to ensure the interactive drop-zone hint is always visible above decorative effects.

## Nitpicks

- `PaneEffects.tsx:94` -- The JSDoc comment says "Renders at z-20" but the actual class is `z-30`. Update the comment to match.
- `PaneEffects.tsx:98` -- `PaneOverlayEffects` accepts `{ theme: PaneTheme }` as an inline type instead of reusing `PaneEffectsProps` (minus `isFocused`). A dedicated `Pick<PaneEffectsProps, 'theme'>` or a named interface would be slightly more maintainable, though this is cosmetic.
