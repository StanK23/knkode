# TypeScript Pro Review — PR #48

## Summary

The diff is small, focused, and type-safe. The new ResizeObserver logic correctly leverages xterm's typed buffer API (`type: 'normal' | 'alternate'`) and introduces no type errors. The change from ratio-based to distance-from-bottom scroll preservation is a sound algorithmic improvement.

## Must Fix

None

## Suggestions

- `Terminal.tsx:279-280` — The `let lastWidth` / `let lastHeight` variables are initialized to `0`, which means the very first resize event (where the container transitions from 0x0 to its actual size) will always pass the guard and fire. This is fine in practice since the initial `fitAddon.fit()` call on line 262 handles the first layout, but a slightly more defensive approach would be to initialize them from `containerRef.current.getBoundingClientRect()` right before creating the observer. This would also prevent a redundant `requestAnimationFrame` + `fit()` call on mount.

- `Terminal.tsx:282-283` — The `entries[0]` access with a manual null-check could be replaced by destructuring in the callback signature for conciseness: `([entry]: ResizeObserverEntry[]) => { if (!entry) return; ... }`. This also adds an explicit type annotation to the parameter, making the entry type self-documenting. Minor stylistic preference.

## Nitpicks

- `Terminal.tsx:301` — The local `isAtBottom` shadows the module-level `isTermAtBottom` helper defined on line 16. Consider reusing the helper here (`const isAtBottom = isTermAtBottom(term)`) to stay consistent with the pattern used in the theme-update effect on line 369 (`const wasAtBottom = isTermAtBottom(termRef.current)`). This keeps a single source of truth for the at-bottom check.

- `Terminal.tsx:279-280` — The `let` declarations for `lastWidth` / `lastHeight` sit inside the mount effect but outside the ResizeObserver callback, relying on closure capture. This is correct and idiomatic, but adding a brief comment (e.g., `// Debounce dimensions — skip no-op resize events`) would make the intent clearer to future readers scanning the effect body.
