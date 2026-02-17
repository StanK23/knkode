# PR #3 Code Simplification Review

## Summary

The keyboard shortcuts and focus tracking feature is well-structured overall. The major win is the DRY refactor moving `splitPane`/`closePane` into the store. The main simplification opportunities are in `App.tsx` where the `shortcutHandlers` object introduces unnecessary indirection, and in `useKeyboardShortcuts.ts` where duplicated workspace-lookup and tab-switch logic could be consolidated.

## Must Fix

- **`src/renderer/src/App.tsx:31-51`** — The `shortcutHandlers` useMemo creates a layer of indirection that adds complexity without benefit. Each handler does a `useStore.getState().workspaces.find(...)` lookup to find the workspace, but the hook *already* calls `useStore.getState()` internally (line 27 of `useKeyboardShortcuts.ts`) and has access to the active workspace. The hook should call store actions directly instead of routing through callback props — this would eliminate the entire `shortcutHandlers` object, the workspace-find duplication (done 3 times in the handlers *and* again inside the hook), and the `useMemo`/`useCallback` wrappers in App.tsx. The current design means the workspace is looked up twice per shortcut: once in the hook (to get `focusedPaneId` and validate the pane exists) and once in the handler (to find which workspace the pane belongs to).

- **`src/renderer/src/App.tsx:21-29`** — `handleNewWorkspace` duplicates the workspace creation logic already present in `TabBar.tsx:35-42`. Both compute a color index from `workspaces.length % WORKSPACE_COLORS.length` and call `createWorkspace` with the same args. This violates DRY. Extract this into a store action (e.g., `createDefaultWorkspace`) or a shared utility so both callsites use the same function.

## Suggestions

- **`src/renderer/src/hooks/useKeyboardShortcuts.ts:63-83`** — The previous-tab and next-tab handlers are nearly identical (same destructuring, same length check, same indexOf call) with only the index arithmetic differing. Extract a shared `switchTab(delta: number)` helper inside the effect to consolidate the two blocks into one.

- **`src/renderer/src/hooks/useKeyboardShortcuts.ts:30-44`** — The `onSplitVertical` and `onSplitHorizontal` blocks are structurally identical (same guard, same `e.preventDefault()`, same `focusedPaneId` check). Consider a single split handler that determines direction from `e.shiftKey`, reducing the two blocks to one.

- **`src/renderer/src/hooks/useKeyboardShortcuts.ts:14-19`** — Define a named `ShortcutHandlers` interface/type for the handlers parameter instead of an inline object type. This improves readability and allows reuse if the type is needed elsewhere (e.g., for testing).

- **`src/renderer/src/components/Terminal.tsx:86`** — `const onTermFocus = () => onFocus()` is a trivial wrapper. Since `onFocus` is already a zero-arg callback (from `Pane.tsx:61`), you can pass `onFocus` directly to `addEventListener` instead of wrapping it.

- **`src/renderer/src/components/Terminal.tsx:96-103`** — Adding `onFocus` to the mount effect's dependency array (`[paneId, onFocus]`) means the entire terminal (XTerm instance, ResizeObserver, PTY listeners) is torn down and rebuilt whenever `onFocus` changes reference. Since `onFocus` is a `useCallback` in `Pane.tsx` with `[paneId, onFocus]` deps, it should be stable in practice, but this is fragile. Consider using a ref for `onFocus` (like `themeRef` is already used for the theme) to keep `onFocus` out of the effect dependency array and prevent accidental remounts.

- **`src/renderer/src/components/Terminal.tsx:98-103`** — The `isFocused` effect fires on every render where `isFocused` is true, even if the terminal is already focused. This is harmless but wasteful. Consider guarding with `document.activeElement !== termRef.current.textarea` or similar check to skip the focus call when already focused.

- **`src/renderer/src/store/index.ts:364-406` and `408-443`** — Both `splitPane` and `closePane` share a pattern: find workspace, mutate tree, build updated workspace, fire-and-forget save, return new workspaces array. Consider extracting a small helper like `updateWorkspaceTree(state, workspaceId, transformFn)` to reduce the boilerplate in both actions.

## Nitpicks

- **`src/renderer/src/App.tsx:46-48`** — `onFocusPane: (paneId: string) => { setFocusedPane(paneId) }` is just a wrapper around `setFocusedPane`. Pass `setFocusedPane` directly if keeping the handlers object pattern.

- **`src/renderer/src/hooks/useKeyboardShortcuts.ts:38`** — Checking `e.key === 'D'` (uppercase) with `e.shiftKey` is redundant since Shift+D always produces 'D'. The `e.shiftKey` check is unnecessary but harmless. Pick one or the other for clarity.

- **`src/renderer/src/hooks/useKeyboardShortcuts.ts:64`** — The bracket-matching logic `e.key === '{' || (e.key === '[' && e.shiftKey)` handles two ways the same keypress manifests across platforms, which is correct, but a brief inline comment explaining *why* both checks exist would help future readers.

- **`src/renderer/src/components/Pane.tsx:65-68`** — Inline style spread with conditional `borderTop` on every render. Consider extracting focused/unfocused styles as static objects to avoid creating a new style object each render.

- **`src/renderer/src/components/PaneArea.tsx:4`** — `PaneConfig` is imported but only used as a type in `handleUpdateConfig`. Ensure it uses `import type` for clarity (it currently uses a value import).
