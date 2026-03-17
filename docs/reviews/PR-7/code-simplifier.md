# PR-7 Code Simplification Review

## Summary

The split pane layout introduces clean recursive rendering with good separation between `SplitPaneLayout`, `BranchRenderer`, and `Pane`. The main simplification opportunities are: (1) `workspaceColor` is prop-drilled through four component layers when each `Pane` could read it directly from the store, (2) a custom `useDebouncedCallback` hook duplicates `useDebounceCallback` already available via `usehooks-ts` (a transitive dependency of `allotment`), and (3) the `ActiveWorkspace` component uses two separate selectors where one combined selector would be clearer.

## Must Fix

None

## Suggestions

- `SplitPaneLayout.tsx:15,39,63` / `Pane.tsx:7` -- `workspaceColor` is threaded as a prop through `SplitPaneLayout -> LayoutNodeRenderer -> BranchRenderer -> Pane`, four levels deep. Only `Pane` uses it (line 26 for the active border color). Since `Pane` already subscribes to the workspace store for `isActive`, `connected`, and `error`, it could derive `workspaceColor` itself via a selector like `useWorkspaceStore((s) => s.workspaces[s.activeWorkspaceId!]?.color)` (or accept `workspaceId` and look it up). This would remove `workspaceColor` from three intermediate interface definitions and their render calls, eliminating parameter sprawl through the tree.

- `SplitPaneLayout.tsx:116-133` -- The custom `useDebouncedCallback` hook re-implements debouncing that is already available as `useDebounceCallback` from `usehooks-ts`, which is a transitive dependency of `allotment` (already installed). Replacing the custom hook with the library version eliminates 18 lines of handwritten timer management and leverages a well-tested implementation. If you prefer not to import from a transitive dependency, this is fine to keep, but consider extracting it to a shared `hooks/` directory since debouncing is a general-purpose utility.

- `App.tsx:38-44` -- `ActiveWorkspace` uses two separate store selectors that both depend on `activeWorkspaceId`: one for `tree` and one for `workspaceColor`. These could be combined into a single selector returning a tuple or object, reducing the number of subscriptions and making the null-check simpler: `const workspace = useWorkspaceStore((s) => s.activeWorkspaceId ? s.workspaces[s.activeWorkspaceId] ?? null : null)`, then destructure `workspace.layout.tree` and `workspace.color` after the null guard.

- `SplitPaneLayout.tsx:99` -- `path={[...path, index]}` creates a new array on every render for every child node. While this is not a performance concern at current scale, the `pathRef` pattern already used in `BranchRenderer` (line 70-71) shows awareness of reference stability. Consider using `useMemo` for the child paths, or passing `parentPath` and `index` as separate props so the child can construct the path only when needed (inside the debounced callback), avoiding allocations during render.

## Nitpicks

- `SplitPaneLayout.tsx:33,57,109` -- The section-divider comments (`// -- Node renderer ...`, `// -- Branch renderer ...`, `// -- Helpers --`) are fine for navigation in a longer file, but at 133 lines the component interfaces and function names already communicate the structure clearly. These could be removed without loss of clarity.

- `Pane.tsx:23-25` -- The conditional className string uses template-literal interpolation with a ternary, which is readable here but would benefit from extracting the two variants into named constants if the header bar styling grows more complex (e.g., when tab labels or close buttons are added).

- `SplitPaneLayout.tsx:18-31` -- `SplitPaneLayout` is a pass-through component that does nothing except forward props to `LayoutNodeRenderer` with `path={[]}`. It exists solely as the public API entry point. This is fine from an encapsulation perspective, but if `LayoutNodeRenderer` were exported directly (or renamed to `SplitPaneLayout`), it would remove one layer of indirection. The empty array `[]` could be a module-level constant to avoid re-allocation on each render.
