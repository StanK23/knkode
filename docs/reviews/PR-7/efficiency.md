# PR #7 Efficiency Review

## Summary

The split-pane renderer is well-structured overall, with good use of debouncing for resize persistence and proper Zustand selector granularity. However, there are several unstable references created on every render that will cause unnecessary re-renders in the recursive layout tree, and the `ActiveWorkspace` selector reads deeply into the store without structural sharing, making it fire on any workspace mutation.

## Must Fix

- `SplitPaneLayout.tsx:99` -- `[...path, index]` creates a new array reference on every render for each child. Since `path` is passed as a prop to `LayoutNodeRenderer`, which passes it to `BranchRenderer`, every `BranchRenderer` re-renders whenever any ancestor re-renders, even if nothing changed. For a deeply nested tree this cascades through every node. Fix: memoize the child paths with `useMemo`, or switch to a string-encoded path (e.g. `"0.1.2"`) that is structurally stable.

- `SplitPaneLayout.tsx:86` -- `const defaultSizes = node.children.map(...)` allocates a new array on every render. Because `Allotment` receives a new `defaultSizes` array reference each time, it may reset internal layout state or trigger unnecessary reconciliation. This should be memoized: `const defaultSizes = useMemo(() => node.children.map(c => c.size), [node.children])`.

- `App.tsx:39-44` -- The `tree` and `workspaceColor` selectors in `ActiveWorkspace` derive values by indexing into `s.workspaces[activeWorkspaceId]` on every store update. Zustand uses `Object.is` for selector equality by default. Since `workspaces` is a new object after any workspace mutation (including `updatePaneSizes` during resize drag, which fires at debounce frequency), these selectors will return new references and re-render `ActiveWorkspace` + the entire layout tree for any workspace change, even for workspaces that are not active. Fix: use `useShallow` or a custom equality function, or restructure the selector to pull the workspace once and derive `tree`/`color` from it.

## Suggestions

- `SplitPaneLayout.tsx:42-55` -- `LayoutNodeRenderer` is not memoized with `React.memo`. Since it receives `node`, `path`, `workspaceId`, and `workspaceColor` as props, and `path` is an unstable array (see must-fix above), it re-renders every time its parent re-renders. Wrapping it in `React.memo` (after stabilizing `path`) would short-circuit re-renders for unchanged subtrees.

- `SplitPaneLayout.tsx:66-107` -- `BranchRenderer` is also not memoized. In a multi-level split layout, a resize drag on one split fires `onChange` which updates the store, which triggers a re-render of `ActiveWorkspace`, which cascades through all `BranchRenderer` instances even for branches whose sizes did not change. Adding `React.memo` would let unchanged branches skip re-render.

- `Pane.tsx:23-28` -- The `className` template literal with the ternary creates a new string on every render. More importantly, the `style` prop `isActive ? { borderTopColor: workspaceColor } : undefined` creates a new object on every render when `isActive` is true. While this is a leaf component and the cost is low per pane, for consistency and if pane count grows, memoize the style object: `const headerStyle = useMemo(() => isActive ? { borderTopColor: workspaceColor } : undefined, [isActive, workspaceColor])`.

- `Pane.tsx:14` -- `useWorkspaceStore((s) => s.setActivePane)` returns a stable function reference from Zustand, so this is fine. But the component subscribes to four separate Zustand selectors (`isActive`, `connected`, `error`, `setActivePane`). Each subscription is an independent listener. Consider combining the three state selectors into one with `useShallow` to reduce subscription overhead: `const { isActive, connected, error } = useWorkspaceStore(useShallow((s) => ({ isActive: s.activePaneId === paneId, connected: s.paneTerminals[paneId]?.connected ?? false, error: s.paneTerminals[paneId]?.error ?? null })))`.

- `SplitPaneLayout.tsx:73-84` -- The `useDebouncedCallback(useCallback(...))` nesting works but is fragile. If `updatePaneSizes` or `workspaceId` ever changed identity (unlikely for `workspaceId` but possible for store actions if the store is recreated), the inner `useCallback` would produce a new function, causing `useDebouncedCallback` to also produce a new callback, which would be passed to `Allotment` as a new `onChange` prop. This is fine in practice today but worth documenting or simplifying.

## Nitpicks

- `SplitPaneLayout.tsx:25` -- `path={[]}` creates a new empty array on every render of `SplitPaneLayout`. Since this is the root, it re-renders relatively rarely, but for consistency with the fix above, use a module-level constant: `const ROOT_PATH: readonly number[] = []`.

- `SplitPaneLayout.tsx:111-113` -- `getNodeKey` falls back to `branch-${index}` for branches without leaves. This is positionally-keyed and could cause React to remount subtrees when branches are reordered. Not an efficiency bug today since reordering branches is not yet supported, but worth noting.

- `Pane.tsx:21` -- Using `onMouseDown` for focus tracking means every mouse-down event inside the pane (including those inside the Terminal canvas) will call `handleFocus`. The handler calls `setActivePane` unconditionally without checking if the pane is already active. The store's `setActivePane` calls `set({ activePaneId: paneId })` even when `activePaneId` is already `paneId`, producing a no-op store update that still notifies all subscribers. Adding an `if (get().activePaneId === paneId) return` guard inside `setActivePane` or in the handler would avoid these no-op notifications.
