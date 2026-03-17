# PR-5 TypeScript Review: Layout Tree Types & Operations

## Summary

Well-structured discriminated union types with pure recursive tree operations. The code compiles cleanly under the project's strict tsconfig (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`) and all 41 tests pass. A few type-safety gaps and a missing minimum-children invariant need attention.

## Must Fix

- `src/lib/layout-tree.ts:68` -- `replaceLeaf` parameter `replacer` accepts `(leaf: LayoutNode) => LayoutNode` but conceptually only matches `LayoutLeaf` nodes. The type should be `(leaf: LayoutLeaf) => LayoutNode` so callers get access to `paneId` without a cast or spread-of-union. Currently the only caller (`splitAtPane` at line 163) relies on spreading the leaf to get `paneId` through, which works by coincidence of the spread operator but is not type-safe -- `leaf.size` compiles but `leaf.paneId` does not, so the caller constructs the child via `{ ...leaf, size: 50 }` which silently includes `paneId` only because LayoutLeaf happens to have it. Narrowing the parameter to `LayoutLeaf` makes the contract explicit.

- `src/lib/layout-tree.ts:53-55` -- `removeLeaf` redistributes sizes using a spread on `LayoutNode` union members: `newChildren.map((c) => ({ ...c, size: ... }))`. When `c` is a `LayoutBranch`, spreading it produces an object literal with all branch fields plus the overridden `size`, which TypeScript infers as `{ direction: ...; size: number; children: ...; paneId?: never }` -- an anonymous type, not `LayoutNode`. The result array `resized` is `Array<{...}>`, not `LayoutNode[]`. This compiles today because the return type at line 58 infers structurally, but any future narrowing or explicit return type annotation will break. Prefer narrowing each child before spreading, or use a helper that preserves the discriminant.

- `src/types/workspace.ts:12-18` -- `LayoutBranch.children` is `readonly LayoutNode[]` which permits an empty array. A branch with zero children is structurally invalid (the tree operations in `layout-tree.ts` assume at least one child, e.g., `getFirstPaneId` returns `undefined` for empty branches). Add a branded or tuple-minimum constraint, or at minimum document the invariant and add a runtime assertion. A simple approach: `readonly children: readonly [LayoutNode, LayoutNode, ...LayoutNode[]]` to enforce a minimum of 2 children, which is the actual semantic requirement for a split.

## Suggestions

- `src/lib/layout-tree.ts:117` -- `const [head, ...rest] = path` with `noUncheckedIndexedAccess` makes `head` type `number | undefined`. The code then compares `i === head` at line 121, which works because `undefined !== number` but obscures the intent. Consider asserting non-empty at the top of this branch (e.g., `if (path.length === 0)` is already handled above, so `head` is guaranteed defined here), or use a non-null assertion `path[0]!` with a comment. Alternatively, use `head` in a guarded check: `if (head === undefined) return node;`.

- `src/lib/layout-presets.ts:3` -- `PresetFactory` parameter `ids` is typed as `() => string`. Consider naming the parameter `generateId` to match the public API's parameter name at line 121 for consistency, and adding a TSDoc comment explaining that each call must return a unique ID.

- `src/lib/layout-presets.ts:139-146` -- `LAYOUT_PRESETS` manually duplicates the keys of `PRESET_FACTORIES`. This is a maintenance hazard: adding a new preset to the `LayoutPreset` union and `PRESET_FACTORIES` but forgetting to add it to `LAYOUT_PRESETS` will silently omit it. Derive it instead: `export const LAYOUT_PRESETS = Object.keys(PRESET_FACTORIES) as LayoutPreset[]` (or use a `satisfies`-based pattern to keep the ordering explicit while still being validated).

- `src/types/workspace.ts:51` -- `Workspace.color` is typed as `string` rather than being constrained to `typeof WORKSPACE_COLORS[number]`. This means any arbitrary string is accepted. If the palette is meant to be exhaustive, narrowing the type to the const tuple's member type would catch misuse at compile time.

- `src/lib/layout-presets.ts:123` -- Return type `{ layout: WorkspaceLayout; panes: Record<string, PaneConfig> }` uses a plain `Record<string, PaneConfig>`. Under `noUncheckedIndexedAccess`, consumers indexing into this record will get `PaneConfig | undefined`, which is correct. However, since the function guarantees every pane ID in the tree has a corresponding entry, consider returning a `Map<string, PaneConfig>` or a branded record to communicate this guarantee to callers.

- `src/lib/__tests__/layout-presets.test.ts:47-49,55-57` -- The `if (isLayoutBranch(...))` guards in the 2-column and 2-row tests silently pass when the condition is false, meaning the direction assertion is never reached. These should use `expect(isLayoutBranch(layout.tree)).toBe(true)` before the guarded block (or assert and narrow) so the test actually fails if the tree shape is wrong.

## Nitpicks

- `src/types/workspace.ts:36-45` -- `WORKSPACE_COLORS` is a value export from a file that is otherwise purely types and type guards. Consider moving it to a separate constants file (e.g., `src/lib/constants.ts`) to keep the types module side-effect-free and importable via `import type` everywhere.

- `src/lib/layout-tree.ts:1-2` -- The `type` and value imports from `../types/workspace` are split across two import statements. Under `verbatimModuleSyntax` both forms are correct, but a single combined import would be more concise: `import { isLayoutBranch, isLayoutLeaf, type LayoutBranch, type LayoutNode } from "../types/workspace"`.

- `src/lib/__tests__/layout-presets.test.ts:7-8` -- The `counter` variable and `generateId` closure are defined at describe scope with manual `resetCounter()` calls in each test. Using `beforeEach` to reset the counter would be more idiomatic vitest and less error-prone.

- `src/lib/__tests__/layout-tree.test.ts:100` -- `result.children.reduce((s, c) => s + c.size, 0)` accesses `.size` on elements of `readonly LayoutNode[]`. Under `noUncheckedIndexedAccess` this works because `reduce` iterates actual elements, but the test could more explicitly assert the shape by checking `result.children.length === 2` before the reduce (which it does on the prior line -- good).
