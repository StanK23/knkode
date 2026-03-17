# PR #7 Type Design Review -- Split Pane Renderer

## Summary

The split pane layout types are well-structured: `LayoutNode` is a proper discriminated union enabling exhaustive pattern matching, the tree is fully immutable via `readonly` modifiers, and factory/validation functions keep construction honest. The main weaknesses are (1) `createBranch` does not enforce the documented 2-child minimum, (2) the `size` field accepts any `number` with no domain constraint, and (3) several component prop types use bare `string` where a branded/opaque type would prevent ID mix-ups.

## Must Fix

- `src/types/workspace.ts:100-106` -- `createBranch` documents "Children must contain at least 2 nodes" but performs zero validation. A single-child or empty-child branch can be silently created, violating the stated invariant. Add a runtime guard (`if (children.length < 2) throw ...`) or, at minimum, a dev-only assertion.

- `src/types/workspace.ts:93-95` -- `createLeaf` accepts any `number` for `size` with no validation. Negative values, `NaN`, and `Infinity` are all representable. The `size` field is documented as "0-100" but nothing enforces it. Same issue applies to `createBranch` at line 100. At least clamp/reject invalid values in factory functions.

- `src/components/SplitPaneLayout.tsx:86` -- `defaultSizes` is computed from `node.children.map(child => child.size)` on every render but passed to `<Allotment defaultSizes>`. Because `defaultSizes` is a React prop name prefixed with "default", Allotment only reads it on mount. If the tree's sizes change in the store (e.g., via `updatePaneSizes`), the component will silently ignore them after the initial render. This is not a type design bug per se, but it is a semantic mismatch between the layout tree's mutable-in-store sizes and the "mount-once" prop contract that will manifest as stale pane sizes after any programmatic resize.

## Suggestions

- `src/types/workspace.ts:6-10,16-23` -- `paneId` and workspace `id` are both `string`. This makes it trivially easy to pass a workspace ID where a pane ID is expected (or vice versa). Consider introducing branded types (`type PaneId = string & { readonly __brand: 'PaneId' }`) for `paneId`, `workspaceId`, and `terminalId`. This is the single highest-leverage type safety improvement available -- it would catch a class of silent ID confusion bugs at compile time.

- `src/types/workspace.ts:9,20` -- The `size` field (percentage 0-100) is typed as plain `number`. A narrower type (e.g., a branded `Percentage` type or at least a JSDoc `@range` annotation consistently applied) would make the domain constraint visible at usage sites, not just in the doc comment.

- `src/components/SplitPaneLayout.tsx:12-16` -- `SplitPaneLayoutProps` passes `workspaceId: string`, `tree: LayoutNode`, and `workspaceColor: string` as three separate props. Since these three values always travel together and are always derived from the same `Workspace` object, consider passing a single prop (`workspace: Workspace`) and letting the component destructure what it needs. This would eliminate the risk of passing a mismatched color/tree/id triple, at the cost of slightly broader store subscriptions in the parent.

- `src/components/Pane.tsx:5-8` -- `PaneProps` uses `paneId: string` and `workspaceColor: string`. The color prop is a plain `string` rather than `Workspace['color']` (which is constrained to the 8-color palette via `typeof WORKSPACE_COLORS[number]`). Using the narrower type would propagate the palette constraint to the component boundary and prevent arbitrary color values from being passed.

- `src/components/SplitPaneLayout.tsx:116-133` -- The `useDebouncedCallback` hook is a general-purpose utility placed inside a component file. It has no dependency on split pane logic and would benefit from extraction to a shared hooks directory (e.g., `src/hooks/useDebouncedCallback.ts`). This is a code organization concern rather than a type design concern, but it affects discoverability and reuse.

## Nitpicks

- `src/components/SplitPaneLayout.tsx:37` -- `path: readonly number[]` is a good use of `readonly` for immutability signaling. However, the spread at line 99 (`[...path, index]`) creates a mutable `number[]` that is then passed as a `readonly number[]` -- this works because mutable arrays are assignable to readonly arrays, but it means the created array is not actually frozen. This is fine in practice but worth noting for consistency.

- `src/components/SplitPaneLayout.tsx:111-113` -- `getNodeKey` falls back to `branch-${index}` for branches with no leaves. This key is index-based and will cause React reconciliation issues if branches are reordered. In practice this fallback should be unreachable (a branch with no leaves should be collapsed), but adding a dev warning on this path would catch tree corruption early.

- `src/components/SplitPaneLayout.tsx:69-71` -- The `pathRef` pattern (storing `path` in a ref to avoid dependency array churn) is a valid optimization but creates a subtle contract: the callback always uses the "latest" path, not the path captured at callback creation time. This is correct here because the debounced callback should use the current path, but a brief comment explaining why a ref is preferred over a dependency would help future readers.

- `src/types/workspace.ts:22` -- `children: readonly LayoutNode[]` allows an empty array at the type level. Combined with the missing runtime check in `createBranch`, this means the type permits states the documentation calls illegal (branches with 0 or 1 children). The type and the factory function should agree on the minimum child count.

- `src/App.tsx:39-44` -- The `ActiveWorkspace` selectors independently read `layout.tree` and `color` from the same workspace entry. If the store updates workspace fields non-atomically (which Zustand's `set` does not -- it is atomic), these could theoretically diverge. As written this is safe, but selecting the full `Workspace` object and destructuring would make the atomicity guarantee more obvious.
