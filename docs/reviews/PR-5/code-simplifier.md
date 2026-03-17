# PR #5 Code Simplifier Review

## Summary

Clean, well-structured pure functional tree module with good test coverage. The main simplification opportunities are eliminating redundant derived state (`paneIds` in preset factories, `LAYOUT_PRESETS` duplicating `PRESET_FACTORIES` keys) and tightening a callback parameter type.

## Must Fix

- `src/lib/layout-presets.ts:139-146` — `LAYOUT_PRESETS` manually duplicates the keys of `PRESET_FACTORIES`. If someone adds a preset to the record but forgets the array (or vice versa), they silently diverge. Derive it: `export const LAYOUT_PRESETS = Object.keys(PRESET_FACTORIES) as LayoutPreset[]`. This also eliminates the maintenance hazard of two sources of truth for the set of valid presets.

- `src/lib/layout-presets.ts:3,8,59,81,110,125-130` — Every `PresetFactory` returns a `paneIds` array that is always identical to the leaf IDs already in the tree. This is redundant derived state. `createLayoutFromPreset` can call `getPaneIdsInOrder(tree)` instead, removing the `paneIds` field from `PresetFactory`'s return type and from every factory body. This eliminates 6 hand-maintained arrays that could drift from their trees.

- `src/lib/layout-tree.ts:68` — `replaceLeaf`'s replacer parameter is typed `(leaf: LayoutNode) => LayoutNode` but the function only invokes it when `isLayoutLeaf(node)` matched and `paneId` matched, so the argument is always a `LayoutLeaf`. The parameter should be `(leaf: LayoutLeaf) => LayoutNode` for type accuracy. Callers like `splitAtPane` already treat it as a leaf (accessing `leaf.size`), so the narrower type documents the actual contract.

## Suggestions

- `src/types/workspace.ts:50` — `Workspace.color` is typed `string` but `WORKSPACE_COLORS` defines the valid palette. Consider `color: (typeof WORKSPACE_COLORS)[number]` to prevent arbitrary color strings and keep the type in sync with the palette constant.

- `src/lib/layout-presets.ts:11-38` — The `2-column` and `2-row` factories are near-duplicates differing only in `direction`. A small helper like `function twoPane(direction, ids)` could build both, reducing ~28 lines to ~10. Same applies to `3-panel-l` / `3-panel-t` which are mirror images (swap horizontal/vertical, swap variable names). Whether the reduction is worth the indirection is a judgment call; the current form is readable but fragile if split ratios change.

- `src/lib/layout-tree.ts:44-48` — The `if (!only) return undefined` guard after `newChildren.length === 1` is only needed to satisfy `noUncheckedIndexedAccess`. A non-null assertion (`const only = newChildren[0]!`) would be clearer about intent since the length check makes it provably safe.

## Nitpicks

- `src/lib/layout-tree.ts:110` — `sizes[i] ?? child.size` has a dead fallback branch: line 104 already guards `sizes.length !== node.children.length`, so `sizes[i]` is always defined within the map. The `??` is only needed for the `noUncheckedIndexedAccess` compiler check, but a comment noting the fallback is unreachable would prevent future confusion.

- `src/lib/__tests__/layout-presets.test.ts:7-12` — The `counter` / `resetCounter` pattern uses shared mutable state across tests. A `beforeEach(resetCounter)` hook would be more conventional and harder to forget in new tests. Alternatively, create a fresh `generateId` closure inside each test.

- `src/lib/layout-tree.ts:1-2` — The type import and value import from the same module could be combined into a single import statement: `import { isLayoutBranch, isLayoutLeaf, type LayoutBranch, type LayoutNode } from "../types/workspace"`.
