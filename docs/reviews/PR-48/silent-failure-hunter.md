# PR #48 Silent Failure Audit

## Summary

The changes in this PR are well-scoped and do not introduce new silent failure patterns. The modified ResizeObserver callback adds dimension deduplication and alternate-buffer detection, both of which are intentional early returns with clear purpose -- not swallowed errors. The pre-existing catch block (`console.warn`) remains appropriate for the expanded try body.

## Must Fix

None

## Suggestions

- `src/renderer/src/components/Terminal.tsx:313-314` -- The pre-existing catch block `catch (err) { console.warn(...) }` is broad: it catches every error type from the try body (which this PR expanded with a second `fitAddon.fit()` call, `scrollToBottom`, and `scrollToLine`). While all of these are terminal rendering operations where warn-and-continue is reasonable, the catch could mask truly unexpected errors (e.g., a TypeError from a null `term.buffer.active` if the terminal was disposed between the `requestAnimationFrame` scheduling and execution). Consider adding a guard at the top of the rAF callback to bail out if the terminal has been disposed (e.g., checking `term.element` or a disposed flag), so the catch block only handles genuine rendering failures rather than use-after-dispose bugs. **Note: this is pre-existing code, not introduced by this PR.**

## Nitpicks

- `src/renderer/src/components/Terminal.tsx:283` -- The `if (!entry) return` guard on `entries[0]` is technically unreachable: the ResizeObserver spec guarantees at least one entry per callback invocation. It is harmless as defensive code, but a comment like `// Defensive: spec guarantees entries.length >= 1` would clarify intent for future readers.
- `src/renderer/src/components/Terminal.tsx:279-280` -- `lastWidth` and `lastHeight` are initialized to `0`. This means the very first ResizeObserver callback will always pass the deduplication guard (real dimensions are never 0 for a visible element). This is correct behavior, but worth noting that if the element starts hidden (0x0) and later becomes visible, the first visibility event will correctly trigger a fit. No action needed.
