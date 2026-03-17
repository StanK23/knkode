# PR-5 Test Coverage Review: Layout Tree Types, Operations, and Presets

## Summary

The 41 tests across two suites provide solid foundational coverage for all 9 exported functions and the preset factory. The parameterized preset test (`it.each`) is a strong pattern that validates tree-to-pane-config consistency across all presets. The primary gaps are around `splitAtPane` behavioral contracts (size inheritance, non-existent target), silent-pass assertions in preset direction tests, and missing immutability verification for a tree data structure destined for a Zustand store.

## Must Fix

- `src/lib/__tests__/layout-tree.test.ts:206-224` -- **`splitAtPane` does not verify that the new branch inherits the original leaf's `size`**. When splitting pane "b" (size 50) inside `twoColumn`, the resulting inner branch must have `size: 50` to maintain correct layout proportions. If a future refactor breaks size inheritance, the layout will visually collapse or expand incorrectly. Add an assertion like `expect((result as LayoutBranch).children[1]).toHaveProperty('size', 50)` on the inner branch created by the split. (Criticality: 8/10)

- `src/lib/__tests__/layout-presets.test.ts:43-49` and `src/lib/__tests__/layout-presets.test.ts:51-59` -- **Direction assertions silently pass if tree is not a branch**. The `if (isLayoutBranch(layout.tree))` guards mean that if a regression accidentally makes "2-column" or "2-row" return a leaf node, the direction assertion never executes and the test still passes. Replace the conditional with an explicit `expect(isLayoutBranch(layout.tree)).toBe(true)` assertion before checking direction, or use a type assertion with a preceding guard assertion. (Criticality: 7/10)

## Suggestions

- `src/lib/__tests__/layout-tree.test.ts:206` -- **Add test: `splitAtPane` with non-existent pane ID returns tree unchanged**. In production, a stale pane ID could be passed (e.g., after a concurrent removal). While the underlying `replaceLeaf` handles this, the contract should be tested at the `splitAtPane` level since it is the public API consumers will call. (Criticality: 7/10)

- `src/lib/__tests__/layout-tree.test.ts:88-102` -- **`removeLeaf` redistribution test should verify proportional sizes, not just sum**. After removing "b" from three equal-sized children (33.33 each), the remaining "a" and "c" should each be 50. Currently the test only checks the total sums to 100, which would also pass if sizes were e.g., 80 and 20. Add `expect(result.children[0]?.size).toBeCloseTo(50)`. (Criticality: 6/10)

- `src/lib/__tests__/layout-tree.test.ts:104-109` -- **`removeLeaf` nested collapse should verify promoted child inherits parent's size**. After removing "b" from the `nested` fixture, the inner branch (size 40) collapses and "c" is promoted. The test should verify that the promoted "c" node has `size: 40` (the parent branch's size), not its original `size: 50`. This is the same size-inheritance invariant that matters for layout rendering. (Criticality: 6/10)

- `src/lib/__tests__/layout-tree.test.ts` (general) -- **Add at least one immutability test**. Since these pure functions will feed a Zustand store where accidental mutation causes stale-state bugs, add a test that deep-freezes an input fixture and confirms the function does not throw (proving no mutation). A single test on `removeLeaf` or `splitAtPane` with a frozen input would suffice. (Criticality: 5/10)

- `src/lib/__tests__/layout-tree.test.ts:147-169` -- **`updateSizesAtPath` with out-of-bounds path index**. Passing `path: [5]` on a 2-child branch should return the node unchanged. The current tests cover "leaf at path" and "mismatched sizes length" but not an index that exceeds the children array bounds. The implementation would pass the sizes to a leaf node at index 5 (which does not exist), causing a no-op, but this boundary is worth documenting with a test. (Criticality: 5/10)

- `src/lib/__tests__/layout-presets.test.ts` (general) -- **Assert `LAYOUT_PRESETS` has exactly 6 entries**. If someone adds a new variant to the `LayoutPreset` type union but forgets to add it to the `LAYOUT_PRESETS` array, the `it.each` parametrized test would silently skip it. Add `expect(LAYOUT_PRESETS).toHaveLength(6)` to catch this. (Criticality: 5/10)

## Nitpicks

- `src/lib/__tests__/layout-tree.test.ts:114-129` -- **`replaceLeaf` only tests root leaf and flat branch, not nested tree**. Adding a test that replaces "c" inside the `nested` fixture would complete the coverage symmetry with other functions that all test leaf/branch/nested. (Criticality: 3/10)

- `src/lib/__tests__/layout-tree.test.ts:133-143` -- **`remapTree` should verify structural preservation (direction, sizes)**. The test checks pane IDs are remapped but does not assert that branch directions and sizes are unchanged. A snapshot or structural equality check would catch accidental property drops during the spread. (Criticality: 3/10)

- `src/lib/__tests__/layout-presets.test.ts:8` -- **Counter-based `generateId` with `resetCounter` is fragile across test reordering**. If tests run in a different order or in parallel, the counter state leaks. Consider using `beforeEach` instead of manual `resetCounter()` calls, or use a closure-scoped counter per test. (Criticality: 2/10)
