# PR #7 TypeScript Review -- Split Pane Renderer

## Summary

The PR introduces a split-pane layout system with `SplitPaneLayout`, `Pane`, and `BranchRenderer` components backed by the `allotment` library. TypeScript usage is strong overall: discriminated union narrowing, proper generic constraints on `useDebouncedCallback`, `readonly` array types for immutable paths, and explicit interface definitions for all component props. A few issues around potential stale closures, unnecessary allocations on every render, and a missing type-only import warrant attention.

## Must Fix

- `SplitPaneLayout.tsx:73-84` -- **Stale closure risk in debounced callback composition.** `useDebouncedCallback` captures `fn` in its `useCallback` dependency array, but wrapping `useCallback` _inside_ `useDebouncedCallback` means the debounced wrapper only updates when `fn`'s reference changes. Currently `fn` is itself wrapped in `useCallback` with `[updatePaneSizes, workspaceId]` deps, and it reads `pathRef.current` at call time (correctly), so there is no active bug today. However, the pattern is fragile: if someone later adds a direct capture of `path` (instead of using `pathRef`), the debounced wrapper will silently hold a stale closure. Consider restructuring so the debounced callback always calls through a single `ref.current` function, eliminating the nested `useCallback` entirely. For example:
  ```ts
  const callbackRef = useRef((...args) => { /* use latest values */ });
  callbackRef.current = (sizes: number[]) => { ... };
  const handleChange = useDebouncedCallback(callbackRef, delay);
  ```

## Suggestions

- `SplitPaneLayout.tsx:99` -- **New array allocation `[...path, index]` on every render.** Each call to `BranchRenderer` builds a new `path` array for every child on every render cycle, even when nothing has changed. With deeply nested trees this creates garbage on every size-change event. Consider memoizing child paths with `useMemo`, or switching to a string-based path representation (e.g., `"0.1.2"`) that can be cheaply extended and split.

- `SplitPaneLayout.tsx:86` -- **`defaultSizes` recomputed on every render but only used on mount.** `Allotment`'s `defaultSizes` prop is only consumed on initial mount. The `.map()` call runs every render but produces no effect after the first. Wrapping it in `useMemo(() => node.children.map(c => c.size), [node.children])` would make the intent explicit and avoid the allocation on subsequent renders.

- `SplitPaneLayout.tsx:116-133` -- **`useDebouncedCallback` is a general-purpose hook defined inline.** This custom hook is well-typed with a proper generic constraint (`T extends unknown[]`) and correct cleanup. Consider extracting it to a shared hooks module (e.g., `src/hooks/useDebouncedCallback.ts`) since debounce is a cross-cutting concern likely to be reused. The project already has `lodash.debounce` as a transitive dependency via `allotment` -- if the team prefers, a thin wrapper around `lodash.debounce` with a `useRef`-based latest-callback pattern would also work and reduce custom code.

- `App.tsx:37-55` -- **`ActiveWorkspace` defined in same file as `App` without `memo`.** The three separate `useWorkspaceStore` selectors each subscribe independently. This is correct for minimizing re-renders, but `ActiveWorkspace` will still re-render whenever any of its three subscribed slices changes. Since it receives no props, wrapping it in `React.memo` provides no benefit here (it has no props to shallow-compare), but consider consolidating the three selectors into a single selector returning a tuple or object to reduce subscription overhead:
  ```ts
  const { id, tree, color } = useWorkspaceStore((s) => {
    const id = s.activeWorkspaceId;
    const ws = id ? s.workspaces[id] : undefined;
    return { id, tree: ws?.layout.tree ?? null, color: ws?.color ?? null };
  });
  ```
  Note: this requires a custom equality function (e.g., `shallow` from zustand) to avoid infinite re-renders from object reference changes.

- `SplitPaneLayout.tsx:6` -- **Use `import type` for type-only imports.** `LayoutBranch` and `LayoutNode` are already imported with `import type`, which is correct and consistent with `verbatimModuleSyntax: true` in tsconfig. No action needed -- just confirming this is well done.

## Nitpicks

- `Pane.tsx:23-25` -- **Template literal for conditional class names.** The ternary inside a template literal works but becomes harder to read as conditions grow. Consider a small utility or array-based join pattern for clarity:
  ```ts
  const headerClasses = [
    "flex h-7 shrink-0 items-center border-t-2 px-2 text-xs",
    isActive ? "bg-white/[0.03]" : "border-transparent",
  ].join(" ");
  ```
  This is purely a readability preference.

- `SplitPaneLayout.tsx:111-113` -- **`getNodeKey` fallback uses positional index.** For branch nodes without any leaf descendants (theoretically impossible given the type constraints, but defensively handled by `getFirstPaneId` returning `undefined`), the key falls back to `branch-${index}`. This is fine for correctness but worth a brief comment explaining why the fallback is safe (branches always have at least one leaf descendant in a valid tree).

- `Pane.tsx:13` -- **`error` typed as `string | null` via inference.** The nullish coalescing `s.paneTerminals[paneId]?.error ?? null` correctly narrows to `string | null`, matching the store's `PaneTerminalState.error` type. Clean usage of optional chaining with nullish coalescing under `noUncheckedIndexedAccess`.
