# Comment Analysis: PR #3 — Keyboard Shortcuts & Pane Focus Tracking

## Summary

The PR adds 7 changed files implementing keyboard shortcuts and pane focus tracking. Comment density is low overall -- most new code has no comments, which is appropriate for straightforward logic. The JSDoc on `useKeyboardShortcuts` and the `getPaneIdsInOrder` utility are the main documentation additions. Two comments are inaccurate or misleading, and several areas of non-obvious logic lack any explanatory comments.

## Must Fix

- **`src/renderer/src/components/Terminal.tsx:99`** — The comment `// Programmatically focus terminal when selected via keyboard shortcut` is misleading. The `isFocused` prop is also set when a user clicks a pane header (via `onMouseDown={handleFocus}` in `Pane.tsx`), not only via keyboard shortcuts. A future maintainer reading this comment would incorrectly believe the effect is keyboard-shortcut-only and might break the click-to-focus path during refactoring. Suggested rewrite: `// Programmatically focus terminal when this pane becomes the focused pane` or simply `// Sync xterm focus with pane focus state`.

- **`src/renderer/src/hooks/useKeyboardShortcuts.ts:5-13`** — The JSDoc header states `Cmd/Ctrl is the modifier` but the code uses `e.metaKey || e.ctrlKey` (line 25), meaning both modifiers are accepted simultaneously on all platforms. On macOS, Ctrl+D sends a different signal than Cmd+D (Ctrl+D is EOF in terminals). This ambiguity is not addressed in the comment. The comment should clarify: on macOS Cmd is the expected modifier; Ctrl is accepted as a fallback for non-macOS platforms. Alternatively, note that Ctrl-based shortcuts may conflict with terminal control sequences.

## Suggestions

- **`src/renderer/src/hooks/useKeyboardShortcuts.ts:63-75`** — The tab-switching shortcuts handle `e.key === '{'` as an alternative to `e.key === '[' && e.shiftKey`. This is because on US keyboards, Shift+`[` produces `{`. The inline comment `// Cmd+Shift+[ -- previous tab` is accurate but does not explain why both key values are checked. A brief note like `// On US layout, Shift+[ emits '{'; other layouts may emit '[' with shiftKey` would prevent a future developer from thinking one branch is dead code and removing it.

- **`src/renderer/src/store/index.ts:362-397`** — The `splitPane` store action contains a recursive `replaceInTree` helper with no comments. This was previously in `PaneArea.tsx` where it had a comment (`// Walk layout tree; when the target leaf is found, replace it with a branch containing the original pane and a new sibling at 50% each.`). That comment was lost during the DRY refactor into the store. Consider adding it back to preserve the explanation of the tree-walking algorithm for future maintainers.

- **`src/renderer/src/store/index.ts:399-436`** — Similarly, `closePane` previously had the comment `// Remove pane from tree. If a branch is left with one child, collapse it upward (promote the child, preserving the parent's size). PTY cleanup is handled by Pane's unmount effect.` This was removed during the move. The collapse-upward behavior and the note about PTY cleanup being elsewhere are both non-obvious and should be restored.

- **`src/renderer/src/store/index.ts:489`** — The comment `/** Get pane IDs in depth-first (left-to-right, top-to-bottom) order. */` claims "left-to-right, top-to-bottom" order. This is only accurate if horizontal splits come before vertical splits in the tree. In practice, the function does a straightforward depth-first traversal of `children` arrays, so the visual ordering depends on how the layout tree is structured (e.g., a vertical split would yield top-to-bottom, a horizontal split would yield left-to-right). The parenthetical "(left-to-right, top-to-bottom)" is an oversimplification. Consider: `/** Get pane IDs in depth-first tree order, matching visual layout reading order. */`

- **`src/renderer/src/components/Terminal.tsx:84-85`** — The comment `// Track focus for keyboard shortcut targeting` has the same issue as the one at line 99: it implies focus tracking exists solely for keyboard shortcuts, when it also serves the visual focus indicator (accent border in `Pane.tsx`). Suggested: `// Track terminal focus to update pane focus state`.

## Nitpicks

- **`src/renderer/src/components/Pane.tsx:87,93,104`** — The button `title` attributes include shortcut hints like `(Cmd+D)`, `(Cmd+Shift+D)`, `(Cmd+W)`. These are macOS-specific. If the app ever targets Windows/Linux, these will be incorrect (should show `Ctrl`). Not a comment-quality issue per se, but worth noting as a hardcoded platform assumption in user-facing strings.

- **`src/renderer/src/components/TabBar.tsx:66`** — Same as above: `title="New workspace (Cmd+T)"` is macOS-only.

- **`src/renderer/src/App.tsx`** — The `shortcutHandlers` `useMemo` block (lines 33-53) builds handler functions that look up workspace by pane ID using `useStore.getState()`. There is no comment explaining why `getState()` is used instead of the reactive `workspaces` selector. This pattern (reading from store imperatively inside callbacks to avoid stale closures or unnecessary re-renders) is a Zustand idiom that deserves a brief note for developers unfamiliar with the pattern.

- **`src/renderer/src/hooks/useKeyboardShortcuts.ts:28-29`** — The line `const state = useStore.getState()` is called on every keydown event. While this is standard Zustand usage, a brief comment noting this is intentional (to avoid stale closure over reactive state) would help maintainers who might try to "optimize" by moving it outside the handler.
