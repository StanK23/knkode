# Type Design Review -- PR #5 (`feature/layout-types`)

## Summary

The layout tree type system is well-structured with good use of `readonly`, discriminated union for `WorkspaceLayout`, and pure functional tree operations. However, the `LayoutNode` union lacks a discriminant tag field, several structural invariants (sibling sizes summing to 100, minimum children count on branches, pane-config referential integrity) are unrepresented in the type system, and tree operations silently produce untyped object literals that widen away from the declared interfaces.

## Must Fix

- `src/types/workspace.ts:5-9,12-18` -- **`LayoutNode` union is not a proper discriminated union.** `LayoutLeaf` and `LayoutBranch` share no common literal discriminant field. The type guards use structural `"paneId" in node` / `"direction" in node` checks, which means TypeScript cannot narrow the union in `switch` statements and any object that accidentally has both `paneId` and `direction` satisfies both branches simultaneously. Add a `readonly type: "leaf"` / `readonly type: "branch"` discriminant to each interface so the union is narrowable via `node.type`.

- `src/lib/layout-tree.ts:56-59` -- **`removeLeaf` produces plain objects that escape the `LayoutBranch` interface.** The `resized` array is built with `...c` spread plus a new `size`, then used in `{ ...node, children: resized }`. Because the spread is on a `LayoutNode` (union), the resulting object literal is `{ direction: ..., size: ..., children: { ... }[] }` -- an anonymous structural type, not explicitly `LayoutBranch`. If a discriminant tag is later added, these spreads will silently drop it unless a constructor/factory function is used. The same issue exists in `splitAtPane` (line 165-169) and `updateSizesAtPath` (line 108-111, 118-120), where raw object literals are returned instead of going through a typed factory. This is not currently broken but becomes a real bug the moment you add the discriminant tag recommended above. Introduce `createLeaf` / `createBranch` factory functions and route all node construction through them.

- `src/types/workspace.ts:12-18` -- **`LayoutBranch.children` permits zero or one children, which violates the tree's structural invariant.** A branch with zero children is meaningless; a branch with one child should have been collapsed (and `removeLeaf` does collapse it, but nothing prevents constructing one). The type should express at minimum 2 children. A simple approach: `readonly children: readonly [LayoutNode, LayoutNode, ...LayoutNode[]]` (a tuple with at least 2 elements). Without this, every consumer that accesses `children[0]` or `children[1]` must do an undefined check that should be unnecessary.

- `src/types/workspace.ts:49-54` -- **`Workspace.panes` is decoupled from `Workspace.layout.tree` with no type-level or runtime link.** A workspace can have pane IDs in its tree that are absent from the `panes` record, or vice versa. This is the most dangerous representable-illegal-state in the design. At minimum, add a runtime validation function `validateWorkspace(ws: Workspace): boolean` that checks referential integrity between tree leaf IDs and pane record keys. Ideally, document this invariant with a JSDoc comment on the `Workspace` interface stating that `Object.keys(panes)` must exactly equal the set of leaf `paneId` values in `layout.tree`.

## Suggestions

- `src/types/workspace.ts:7,15` -- **`size` allows any `number`, but the domain is 0-100 and must be positive.** Consider a branded type `type Percent = number & { readonly __brand: "Percent" }` with a constructor `toPercent(n: number): Percent` that clamps/validates. This prevents negative sizes, sizes above 100, and NaN from propagating through the tree. The existing codebase does not use branded types, so if the cost feels too high, at minimum add a JSDoc `@range` annotation and a runtime assertion in tree-mutating functions.

- `src/types/workspace.ts:5,49` -- **`paneId` and `Workspace.id` are plain `string`, making it easy to accidentally swap them.** Branded ID types (`PaneId`, `WorkspaceId`) are a lightweight way to get compile-time protection against mixing up identically-typed identifiers. Pattern: `type PaneId = string & { readonly __brand: "PaneId" }`. This is especially valuable here because `AppState.openWorkspaceIds` and `AppState.activeWorkspaceId` are also plain strings that must refer to workspace IDs, not pane IDs.

- `src/types/workspace.ts:51` -- **`Workspace.color` is `string` but should be constrained to `typeof WORKSPACE_COLORS[number]`.** The color palette is defined as a const tuple on line 36-44, but the `Workspace` interface accepts any string. Use `(typeof WORKSPACE_COLORS)[number]` as the type for `color` to enforce the palette at compile time. If custom colors are intended in the future, use a union: `(typeof WORKSPACE_COLORS)[number] | \`#${string}\``.

- `src/lib/layout-tree.ts:97-122` -- **`updateSizesAtPath` silently returns the original node when the path is invalid or sizes length mismatches.** This fail-silent behavior can mask bugs. Consider returning a result type (e.g., `{ ok: true; node: LayoutNode } | { ok: false; reason: string }`) or at minimum logging a warning in development. The function's JSDoc says "sizes should sum to 100" but this is not checked.

- `src/lib/layout-tree.ts:66-67` -- **`replaceLeaf`'s `replacer` callback parameter is typed `(leaf: LayoutNode) => LayoutNode` but will only ever be called with a `LayoutLeaf`.** The parameter type should be `(leaf: LayoutLeaf) => LayoutNode` to give callers accurate type information about what they receive. Currently `splitAtPane` (line 163) uses `leaf.size` which works structurally since both union members have `size`, but the intent is clearly to receive a leaf.

- `src/types/workspace.ts:23-26` -- **`WorkspaceLayout` discriminated union is good but the `preset` variant carries redundant state.** When `type` is `"preset"`, both `preset` (the preset name) and `tree` are stored. If the tree is modified after creation (e.g., a pane is resized), the layout should transition to `"custom"`, but nothing enforces this. Document whether a `"preset"` layout's tree is guaranteed to match the preset's factory output, or whether it can drift.

- `src/lib/layout-presets.ts:3` -- **`PresetFactory` type alias is module-private but useful.** Export it so consumers can write their own preset factories (e.g., for user-defined layouts), or at least document why it is intentionally private.

- `src/lib/layout-presets.ts:139-146` -- **`LAYOUT_PRESETS` array duplicates the `LayoutPreset` union members manually.** If a new variant is added to the union type but not to this array, there is no compile-time error. Derive the array from the `PRESET_FACTORIES` keys: `export const LAYOUT_PRESETS = Object.keys(PRESET_FACTORIES) as LayoutPreset[]` -- or add a type-level exhaustiveness check.

## Nitpicks

- `src/types/workspace.ts:13` -- The JSDoc for `direction` says `'horizontal' = side-by-side (vertical divider)` which is correct but counterintuitive. Consider renaming the values to `"split-h"` / `"split-v"` or adding an inline comment at every usage site. The current naming will confuse contributors who think "horizontal" means "horizontal divider".

- `src/types/workspace.ts:70-76` -- The type guard functions are fine but placing them in the types file mixes runtime code with type declarations. Consider co-locating them with the tree operations in `layout-tree.ts`, or in a dedicated `layout-guards.ts` module, so the types file remains a pure type declaration module (important if you ever move to `.d.ts` generation).

- `src/lib/layout-tree.ts:47-48` -- In the `removeLeaf` single-child collapse path, `const only = newChildren[0]; if (!only) return undefined;` -- the `!only` check is unreachable because we already verified `newChildren.length === 1`. The check is harmless but adds noise; a non-null assertion (`newChildren[0]!`) or a preceding length guard makes the intent clearer.

- `src/types/workspace.ts:30-33` -- `PaneConfig.label` is `string` with no documentation about what it represents (user-visible tab label? internal name?). A brief JSDoc would help.

- `src/types/workspace.ts:57-63` -- `AppState.windowBounds` is an inline anonymous type. If this will be reused (e.g., for saving/restoring multiple window positions), extract it to a named `WindowBounds` interface.
