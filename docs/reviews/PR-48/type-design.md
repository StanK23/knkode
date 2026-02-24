# PR #48 Type Design Review

## Summary

The diff replaces ratio-based scroll preservation with a lines-from-bottom approach and adds ResizeObserver deduplication and alternate-buffer detection. The changes are runtime-logic focused with no new type definitions; type safety of the touched code is sound, with one minor suggestion.

## Must Fix

None

## Suggestions

- `src/renderer/src/components/Terminal.tsx:279-280` -- `lastWidth` and `lastHeight` are declared with `let` and initialized to `0`, which means the very first ResizeObserver callback (where the actual dimensions are nonzero) will always pass the guard and proceed. This is correct behavior, but the implicit `0` sentinel is a weak contract. Consider initializing from `containerRef.current.getBoundingClientRect()` right before `resizeObserver.observe(...)` (line 318) so the initial values reflect reality and the first callback is truly deduplicated against a real measurement rather than a synthetic zero.

- `src/renderer/src/components/Terminal.tsx:295` -- The string comparison `term.buffer.active.type === 'alternate'` is type-safe (xterm types define `type: 'normal' | 'alternate'`), but extracting a named boolean (`const isAlternateBuffer = ...`) would improve readability and make the intent immediately clear at the call site, matching the pattern used two lines later with `isAtBottom`.

## Nitpicks

- `src/renderer/src/components/Terminal.tsx:281-286` -- The `ResizeObserverEntry` array is accessed via `entries[0]` with a manual null guard. Since the spec guarantees at least one entry when the callback fires for an observed element, this guard is purely defensive. Not wrong, but a brief comment (e.g., `// spec guarantees entries[0] exists`) would clarify intent to future readers who might wonder if it can actually be undefined.

- `src/renderer/src/components/Terminal.tsx:300-302` -- `viewportY`, `baseY`, `isAtBottom`, and `linesFromBottom` are all untyped local bindings inferred from `number`. This is fine for simple arithmetic, but adding a brief comment block summarizing the scroll-position model (viewportY = top of visible area, baseY = top of last page, linesFromBottom = distance from end) would help maintainers who are unfamiliar with xterm's buffer coordinate system.
