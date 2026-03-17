# DRY / Reuse Review — PR #5 `feature/layout-types`

## Summary

No overlapping implementations exist in the current codebase (only terminal types/store/renderer); the new layout-tree module is greenfield. Within the PR itself, the preset factories contain a repeated structural pattern (2-child split with equal sizes) that could be extracted, and `countPanes` is a trivial specialization of `getPaneIdsInOrder` that adds a second tree walk where `.length` would suffice.

## Must Fix

None

## Suggestions

- `src/lib/layout-tree.ts:129-131` — `countPanes` duplicates the traversal already implemented by `getPaneIdsInOrder`. It could be defined as `getPaneIdsInOrder(node).length`. The separate recursive implementation is not wrong, but maintaining two independent tree-walk functions that answer the same question invites drift. If the concern is allocation overhead for large trees, add a comment explaining the optimization choice.

- `src/lib/layout-presets.ts:11-38` — The `2-column` and `2-row` factories are structurally identical except for the `direction` string. Consider extracting a shared `twoPane(direction)` helper to eliminate the duplication:
  ```ts
  function twoPane(direction: "horizontal" | "vertical"): PresetFactory {
    return (ids) => {
      const [a, b] = [ids(), ids()];
      return {
        tree: { direction, size: 100, children: [{ paneId: a, size: 50 }, { paneId: b, size: 50 }] },
        paneIds: [a, b],
      };
    };
  }
  ```

- `src/lib/layout-presets.ts:41-82` — Similarly, `3-panel-l` and `3-panel-t` are mirror images of each other (swap horizontal/vertical, swap which child is the leaf vs. the sub-split). A `threePanel(outerDir, innerDir)` helper would reduce these two 20-line factories to two one-liner calls.

- `src/lib/layout-presets.ts:138-146` — `LAYOUT_PRESETS` manually lists the same keys already present as keys of `PRESET_FACTORIES`. This is a second source of truth. Consider deriving it:
  ```ts
  export const LAYOUT_PRESETS = Object.keys(PRESET_FACTORIES) as readonly LayoutPreset[];
  ```
  This ensures the list stays in sync automatically if a preset is added or removed.

## Nitpicks

- `src/lib/layout-tree.ts:8-14` — `getFirstPaneId` is functionally equivalent to `getPaneIdsInOrder(node)[0]` but short-circuits on the first leaf. This is fine as an optimization, but a one-line comment noting the intentional early-return optimization would help future readers understand why both exist.

- `src/lib/layout-presets.ts:3` — The `PresetFactory` type alias is module-private, which is good. Consider co-locating it next to the `PRESET_FACTORIES` const or adding a brief doc comment so future contributors know the contract (must return `size: 100` root, collect all generated IDs).

- `src/lib/__tests__/layout-presets.test.ts:7-11` — The mutable `counter` + `resetCounter()` pattern is repeated before every test. A `beforeEach(resetCounter)` would be more conventional and harder to forget.
