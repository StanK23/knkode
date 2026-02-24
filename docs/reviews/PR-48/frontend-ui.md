# PR #48 — Frontend/UI Review

## Summary

Solid fix that addresses terminal scroll jumps during resize and TUI redraws through three targeted changes: filtering spurious ResizeObserver events via dimension caching, skipping scroll management for alternate-buffer TUIs, and switching from ratio-based to distance-from-bottom scroll restoration. All three changes are correct and well-motivated.

## Must Fix

None

## Suggestions

- `Terminal.tsx:300-301` — The `isAtBottom` check (`viewportY >= baseY`) duplicates the module-level `isTermAtBottom()` helper defined at line 16. Consider reusing it for consistency and to avoid drift if the threshold logic ever changes:
  ```ts
  const atBottom = isTermAtBottom(term)
  const linesFromBottom = term.buffer.active.baseY - term.buffer.active.viewportY
  ```

- `Terminal.tsx:368-372` — The pre-existing theme-update effect uses the simple `isAtBottom` pattern without the alternate-buffer guard introduced here. If a font-size change occurs while a TUI is active, `fit()` + `scrollToBottom()` may interfere. Consider extracting the resize-aware scroll restoration (alternate check + linesFromBottom) into a shared helper that both the ResizeObserver callback and the theme effect can call, keeping the logic in one place.

## Nitpicks

- `Terminal.tsx:279-280` — `lastWidth` and `lastHeight` are initialized to `0`, which means the very first ResizeObserver callback always passes through. This is correct behavior (the first callback should always trigger a fit), but a brief comment noting the intentional zero-init would clarify intent for future readers.
