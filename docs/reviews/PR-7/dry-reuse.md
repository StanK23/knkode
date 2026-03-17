# DRY / Reuse Review -- PR #7 (feature/split-pane-renderer)

## Summary

The PR introduces a split-pane layout system with two new components (Pane, SplitPaneLayout) and refactors App.tsx. The main DRY concern is a hand-rolled `useDebouncedCallback` hook in SplitPaneLayout that duplicates debounce logic already present in Terminal.tsx -- and both could use the `useDebounceCallback` hook from `usehooks-ts`, which is already in the dependency tree as a transitive dep of `allotment`. There are also type-guard bypass patterns and a repeated magic color value.

## Must Fix

- **Hand-rolled `useDebouncedCallback` duplicates existing debounce pattern and available library hook.**
  `src/components/SplitPaneLayout.tsx:116-133` defines a custom `useDebouncedCallback` hook (setTimeout + clearTimeout + useRef + useEffect cleanup). `src/components/Terminal.tsx:144-158` uses the same setTimeout/clearTimeout debounce pattern inline for resize handling. Meanwhile, `usehooks-ts` (already in the dependency tree via `allotment`) exports `useDebounceCallback` (`node_modules/usehooks-ts/dist/index.d.ts:256`) which does exactly this. Both callsites should use the library hook instead of rolling their own, eliminating ~20 lines of code and the risk of subtle cleanup bugs.

## Suggestions

- **Raw `node.type === "leaf"` checks bypass existing type guards.**
  `src/components/SplitPaneLayout.tsx:43` and `src/components/SplitPaneLayout.tsx:112` use `node.type === "leaf"` directly, while `src/types/workspace.ts:83-88` exports `isLayoutLeaf` and `isLayoutBranch` type guards. Every other file in the codebase (layout-tree.ts, layout-presets.test.ts, etc.) uses these guards. The PR should use `isLayoutLeaf(node)` for consistency, type-narrowing safety, and to centralize the discriminant check.

- **Magic color `#1d1f21` repeated across three files with no shared constant.**
  `src/App.tsx:31`, `src/components/Terminal.tsx:209`, and `src/components/Pane.tsx:34` all hardcode `bg-[#1d1f21]`. This is the terminal background color. It should be extracted to either a Tailwind theme extension or a shared constant (e.g., in a `src/lib/constants.ts` or a Tailwind `extend.colors` entry) so the value lives in one place.

## Nitpicks

- **Placeholder text differs between disconnected states.**
  `src/components/Pane.tsx:35` shows `"Connecting..."` as the fallback when there is no error, while the old code in App.tsx (removed in this PR) used `"Terminal disconnected"`. The new Pane.tsx text is arguably better, but it is worth confirming this is intentional since it changes user-visible behavior. `src/App.tsx:48` uses `"No workspace"` for the workspace-level empty state, which is a different concept and fine as-is.

- **`allotment` brings `lodash.debounce` as a direct dependency.** If the team prefers not to take a direct dependency on `usehooks-ts`, `lodash.debounce` is also already available in `node_modules` and could be used instead of the hand-rolled hook (though the React hook from `usehooks-ts` is the cleaner fit for a component context).
