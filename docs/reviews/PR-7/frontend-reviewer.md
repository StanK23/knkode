## Summary

Solid split-pane implementation with clean recursive tree rendering, good Allotment integration, and well-structured component decomposition. A few re-render hazards from array allocations on every render and one inline style that could be replaced with a CSS custom property or data attribute approach.

## Must Fix

- `SplitPaneLayout.tsx:86` — `defaultSizes` is recomputed via `.map()` on every render, producing a new array reference each time. However, since Allotment only reads `defaultSizes` on mount (it is an uncontrolled prop), this is not a functional bug. **Promote to a `useMemo` anyway** to signal intent and prevent confusion if Allotment's behavior ever changes, and to avoid unnecessary allocations during frequent re-renders triggered by `onChange` size persistence updates:
  ```tsx
  const defaultSizes = useMemo(() => node.children.map((child) => child.size), [node.children]);
  ```

- `SplitPaneLayout.tsx:99` — `[...path, index]` creates a new array on every render for every child. When the tree re-renders (e.g., during resize debounce or any store update that touches the tree), this forces all `LayoutNodeRenderer` instances to receive new `path` prop references, defeating any future `React.memo` optimization. Consider memoizing or using a stable path representation (e.g., a string like `"0.1.2"` that can be split when needed):
  ```tsx
  const childPath = useMemo(() => [...path, index], [path, index]);
  ```
  Or pass path as a string and parse in `BranchRenderer`.

## Suggestions

- `Pane.tsx:26` — The inline `style` for `borderTopColor` is justified here since the color is dynamic (comes from workspace config and is user-selectable from a palette). However, consider using a CSS custom property via inline style on the outermost container (`style={{ '--ws-color': workspaceColor } as React.CSSProperties}`) and then referencing it in the Tailwind class with `border-t-[var(--ws-color)]`. This keeps the styling layer consistent and avoids mixing `className` and `style` on the same element. Low priority since the current approach works and the color is genuinely dynamic.

- `SplitPaneLayout.tsx:42-54` — `LayoutNodeRenderer` is not memoized. Since it receives `path` (new array each render) and `node` (new reference when tree updates), every store update that modifies the tree will re-render the entire tree from root to leaves. Consider wrapping `LayoutNodeRenderer` and `BranchRenderer` in `React.memo` with a custom comparator (or use stable path strings) to limit re-renders to the affected subtree. This matters more as pane counts grow (e.g., 2x2 grid = 7 component instances all re-rendering on a single resize drag).

- `Pane.tsx:21` — The `onMouseDown` handler on a `div` triggers the biome a11y override (`noStaticElementInteractions: off`). This is acceptable for a pane-focus-activation pattern, but consider adding `role="group"` and `aria-label="Terminal pane"` to the container div to give screen readers some context about what this region is. The current div is semantically invisible.

- `App.tsx:37-55` — `ActiveWorkspace` is defined as a function in the same file as `App` but outside the `App` component, which is fine. However, the three separate `useWorkspaceStore` selectors (`activeWorkspaceId`, `tree`, `workspaceColor`) each subscribe independently. The `tree` and `workspaceColor` selectors do a conditional lookup that depends on `activeWorkspaceId`, meaning they will re-run on every store change. Consider combining them into a single selector that returns a tuple or object, with a custom equality function, to reduce subscription overhead.

## Nitpicks

- `SplitPaneLayout.tsx:2` — `import "allotment/dist/style.css"` is a side-effect CSS import. This is standard for allotment but worth noting: if this component is ever lazy-loaded, the CSS will only load at that point. If the app needs the allotment styles before the component mounts (e.g., for SSR or skeleton rendering), move this import to the app entry point. Not a concern for this Tauri app currently.

- `SplitPaneLayout.tsx:113` — `getNodeKey` falls back to `branch-${index}` for branches with no leaves. This could theoretically cause key collisions if two sibling branches are both empty (unlikely in practice since branches must have >= 2 children and empty branches are collapsed). Acceptable for now but worth a comment.

- `Pane.tsx:28` — The label is hardcoded to `"Terminal"`. The `PaneConfig` type already has a `label` field. Consider reading from the store (`s.workspaces[workspaceId]?.panes[paneId]?.label`) and falling back to `"Terminal"` when empty, so the system is ready for future pane types or user-renamed panes.

- `SplitPaneLayout.tsx:116-133` — The custom `useDebouncedCallback` hook is well-implemented but `allotment` already pulls in `lodash.debounce` as a transitive dependency (visible in the lockfile). Consider reusing it rather than maintaining a custom implementation, unless bundle-size control is a priority.
