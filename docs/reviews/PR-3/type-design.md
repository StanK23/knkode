# Type Design Review -- PR #3: Keyboard Shortcuts & Pane Focus Tracking

## Summary

The PR adds keyboard shortcut handling and pane focus tracking with generally sound type usage. The main type-level concerns are: an inline handler object type that should be extracted for reuse and documentation, `focusedPaneId` being a weakly-constrained `string | null` with no validation against actual pane IDs, and the `onFocus` callback in `useKeyboardShortcuts` reaching directly into the store (breaking the abstraction the handler object was meant to provide). There are no discriminated-union or generic misuses -- the existing `LayoutNode` union is narrowed correctly throughout.

## Must Fix

- `src/renderer/src/hooks/useKeyboardShortcuts.ts:64-82` -- The tab-switching shortcuts (`Cmd+Shift+[` / `Cmd+Shift+]`) call `state.setActiveWorkspace(openWorkspaceIds[prev])` and `state.setActiveWorkspace(openWorkspaceIds[next])` without routing through a handler callback. Every other action in this hook delegates to `handlers.*`, but tab switching bypasses the handlers object and calls the store directly. This breaks the stated contract that all mutations flow through the handlers parameter. Either add `onPreviousTab` / `onNextTab` to the handlers type, or document why these are intentionally direct-access. As-is, the type of the `handlers` parameter is misleading because it implies the caller controls all side effects, when in fact it does not.

- `src/renderer/src/components/Terminal.tsx:99-103` -- The `useEffect` that programmatically focuses the terminal depends on `[isFocused]` but will not re-fire when the user clicks away from a pane and then clicks back to the same pane (the value stays `true` throughout). This is not purely a type issue, but the `isFocused: boolean` prop type is too coarse to express the "focus was just requested" semantic. A more precise type would be a monotonically increasing counter or a `focusRequestId: number` that changes on each focus request, so that `useEffect` re-fires correctly. The current boolean creates a silent no-op path that is invisible at the type level.

## Suggestions

- `src/renderer/src/hooks/useKeyboardShortcuts.ts:14-19` -- Extract the inline handler object type into a named `KeyboardShortcutHandlers` interface and export it. The current anonymous `{ onSplitVertical: ..., onSplitHorizontal: ..., ... }` type is used in `useKeyboardShortcuts` and constructed in `App.tsx`, but has no shared named type. A named interface makes it easier to verify conformance at both sites and enables documentation of each handler's expected behavior (e.g., "called with the focused pane ID"). Example:
  ```ts
  export interface KeyboardShortcutHandlers {
    onSplitVertical: (paneId: string) => void
    onSplitHorizontal: (paneId: string) => void
    onClosePane: (paneId: string) => void
    onNewWorkspace: () => void
    onFocusPane: (paneId: string) => void
  }
  ```

- `src/renderer/src/store/index.ts:186` -- `focusedPaneId: string | null` is an unvalidated string with no compile-time relationship to actual pane IDs in the workspace. Consider adding a runtime guard in `setFocusedPane` that verifies the pane ID exists in the active workspace before setting it (similar to how `splitPane` guards with `if (!workspace?.panes[paneId]) return state`). This prevents stale focus state when panes are removed by external actions (e.g., settings changes). The `closePane` action already clears `focusedPaneId` when the closed pane matches, but `splitPane` does not update focus to the newly created pane, which may be surprising.

- `src/renderer/src/store/index.ts:364-405` -- The `splitPane` action returns `{ workspaces: ... }` from inside `set()`, which means it only updates the `workspaces` slice. It does not set `focusedPaneId` to the newly created pane. For consistency with user expectation (split a pane, the new pane gets focus), consider also returning `focusedPaneId: newPaneId` in the state update.

- `src/renderer/src/components/PaneArea.tsx:29` -- The `direction` parameter is typed inline as `'horizontal' | 'vertical'` rather than using the `SplitDirection` type alias imported from shared types. While structurally identical, using the named alias communicates intent and ensures a single source of truth. The shared type `SplitDirection` already exists and is used in the store.

- `src/renderer/src/App.tsx:31-50` -- The `shortcutHandlers` object is wrapped in `useMemo` with `[splitPane, closePane, handleNewWorkspace, setFocusedPane]` as dependencies. However, the handler closures also call `useStore.getState()` at invocation time. This is fine for correctness, but the mix of reactive deps (from `useMemo`) and imperative store reads (from `getState()`) is a subtle pattern. Consider adding a brief comment explaining why `getState()` is used inside the handlers (to get the latest workspace list at call time, not at memo time) to prevent future maintainers from "fixing" it by adding `workspaces` to the dependency array.

## Nitpicks

- `src/renderer/src/hooks/useKeyboardShortcuts.ts:68` -- `activeWorkspaceId ?? ''` silently converts `null` to an empty string for `indexOf`. If `activeWorkspaceId` is `null`, the `indexOf` returns `-1`, and the code navigates to the last tab. This is coincidentally correct behavior but relies on an implicit falsy-to-string coercion. An explicit early return (`if (!activeWorkspaceId) return`) before the `indexOf` call would make the intent clearer and avoid the nullable string gymnastics.

- `src/renderer/src/hooks/useKeyboardShortcuts.ts:38` -- The shift key check for horizontal split uses `e.key === 'D'` (uppercase). On some international keyboard layouts or with caps lock active, `e.key` may not be `'D'` when Shift+D is pressed. Using `e.code === 'KeyD'` combined with `e.shiftKey` would be more reliable across keyboard layouts.

- `src/renderer/src/store/index.ts:396` -- `type: 'custom' as const` is used to satisfy the discriminated union. This is correct but could be simplified by using a helper function like `customLayout(tree: LayoutNode): WorkspaceLayout` that returns `{ type: 'custom', tree }` with the literal type inferred, avoiding the `as const` assertion scattered in multiple places (also on line 432).

- `src/renderer/src/components/Pane.tsx:67` -- The inline style `borderTop: isFocused ? '2px solid var(--accent)' : '2px solid transparent'` causes layout shift depending on focus state. Since both branches are 2px this is fine, but the pattern of conditionally styling via inline ternaries on every render could be extracted to a small helper or CSS class for readability.
