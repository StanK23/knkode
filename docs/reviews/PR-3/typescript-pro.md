# PR #3 TypeScript Review: Keyboard Shortcuts & Pane Focus Tracking

## Summary

The PR is well-structured with good DRY refactoring (split/close logic moved to store), proper Zustand patterns, and clean type annotations. There are a few type safety gaps and React hook dependency issues that could cause subtle runtime bugs, plus some opportunities to strengthen typing.

## Must Fix

- **`src/renderer/src/components/Terminal.tsx:96`** — The `onFocus` callback is in the dependency array of the terminal mount effect, which means every time the parent re-renders with a new `onFocus` reference, the entire terminal (xterm instance, PTY listeners, resize observer) will be torn down and re-created. Although the parent (`Pane.tsx:61`) wraps `handleFocus` in `useCallback`, this is fragile: any future change to `Pane` that breaks `useCallback` memoization will cause full terminal remounts. Consider either (a) using a `useRef` to hold `onFocus` and reading it from the ref in the event listener, or (b) removing `onFocus` from the dep array and using a ref-based approach so the mount effect only depends on `paneId`.

- **`src/renderer/src/components/Terminal.tsx:99-103`** — The `isFocused` effect calls `termRef.current.focus()` but only depends on `[isFocused]`. This means if the user clicks pane A (focused), then clicks pane B, then clicks pane A again, `isFocused` stays `true -> true` and the effect will NOT re-fire because the value did not change. The terminal will not regain programmatic focus on the second click. This is a correctness issue for the Cmd+1-9 scenario where you press Cmd+1 on an already-focused pane (it will do nothing). Consider using an incrementing counter or a timestamp in the store to force re-triggering, or call `.focus()` imperatively from `setFocusedPane`.

- **`src/renderer/src/hooks/useKeyboardShortcuts.ts:14-19`** — The `handlers` parameter is an inline object type. Since the `useEffect` depends on `[handlers]`, if the caller passes a non-memoized object, the effect will re-register on every render. While `App.tsx` does use `useMemo`, this is a latent footgun. Extract the handler type to a named interface (e.g., `KeyboardShortcutHandlers`) and document in TSDoc that the object must be referentially stable (or accept individual callbacks instead).

## Suggestions

- **`src/renderer/src/hooks/useKeyboardShortcuts.ts:64,75`** — The key checks for `{`/`}` and `[`+shiftKey are both needed because different OS keyboard layouts produce different `e.key` values for Cmd+Shift+[/]. This is correct but should have a brief inline comment explaining why both forms are checked, since it looks like dead code otherwise. Also consider using `e.code` (e.g., `BracketLeft`, `BracketRight`) which is layout-independent and would simplify the check to a single condition each.

- **`src/renderer/src/hooks/useKeyboardShortcuts.ts:38`** — Checking `e.key === 'D'` with `e.shiftKey` works on macOS but the uppercase `D` is produced only because Shift changes the key value. On some keyboard layouts/OS combos, `e.key` might still be `d` even with Shift held. A safer check would be `e.key === 'd' && e.shiftKey` (lowercase, same as the non-shift version but with the shiftKey guard).

- **`src/renderer/src/App.tsx:33-43`** — The `onSplitVertical`, `onSplitHorizontal`, and `onClosePane` handlers all have the identical pattern of looking up the workspace via `useStore.getState().workspaces.find(...)`. This lookup is also done inside `useKeyboardShortcuts.ts:28` for `activeWs`. Consider either (a) extracting a `findWorkspaceByPaneId` utility, or (b) having the shortcuts hook pass the `workspaceId` directly since it already knows the active workspace.

- **`src/renderer/src/store/index.ts:364-405` and `408-443`** — The `splitPane` and `closePane` store actions call `window.api.saveWorkspace(updated).catch(...)` inside `set()`. This is a side effect inside a synchronous Zustand updater. While it works, it diverges from the pattern used elsewhere in the store (e.g., `updateWorkspace` which does `await` then `set`). For consistency and testability, consider making these actions `async` or at minimum extracting the save call outside the `set()` block.

- **`src/renderer/src/store/index.ts:189`** — `setFocusedPane` accepts `string | null` but is exposed to `PaneArea` which passes it directly as `onFocus={setFocusedPane}`. The `Pane` component's `onFocus` prop type is `(paneId: string) => void` (no `null`). This works because `string` is assignable to `string | null`, but the types diverge in intent. Consider narrowing `setFocusedPane`'s store-level type or adding a wrapper in PaneArea so the types match precisely.

- **`src/renderer/src/hooks/useKeyboardShortcuts.ts:86`** — `Number.parseInt(e.key, 10)` will return `NaN` for non-numeric keys, and then the `num >= 1 && num <= 9` check correctly filters it out. This is fine but `Number(e.key)` or a simple `e.key >= '1' && e.key <= '9'` comparison would be clearer intent and avoids the intermediate `NaN`.

## Nitpicks

- **`src/renderer/src/hooks/useKeyboardShortcuts.ts:1-13`** — The JSDoc comment lists all shortcuts, which is helpful, but the shortcut-to-key mappings are only evident from reading the implementation. Consider co-locating a `SHORTCUTS` constant map (key description to key combo) that both the JSDoc and the runtime logic reference, which would also make it easy to render a help overlay later.

- **`src/renderer/src/components/Pane.tsx:67`** — The inline style `borderTop: isFocused ? '2px solid var(--accent)' : '2px solid transparent'` creates a new object on every render (since the spread of `paneContainerStyle` is already a new object). This is minor but could be extracted to two pre-computed style objects (`focusedContainerStyle` / `unfocusedContainerStyle`) to avoid object allocation on each render.

- **`src/renderer/src/App.tsx:21-29`** — `handleNewWorkspace` has an empty dependency array `[]`, which means `WORKSPACE_COLORS.length` is captured once. Since `WORKSPACE_COLORS` is `as const` and never changes, this is technically correct, but the linting rule for exhaustive deps might flag it if `useStore.getState` usage patterns change. Consider adding a comment explaining the intentional empty deps.

- **`src/renderer/src/store/index.ts:490-494`** — `getPaneIdsInOrder` is defined as a plain function after the store creation and then exported. This is fine, but since it only operates on `LayoutNode` and uses `isLayoutBranch`, it is pure utility logic that could live in `shared/types.ts` alongside the type definitions, making it reusable from both renderer and main process if ever needed.
