# Compiled Review — PR #5 `feature/layout-types`

**10/10 agents completed** | Areas: code quality, security, silent failures, code simplification, DRY/reuse, comments, type design, test coverage, TypeScript, efficiency

---

## Must Fix (8 items)

- [ ] **M1** `src/lib/layout-tree.ts:68` — `replaceLeaf` replacer parameter typed `(leaf: LayoutNode) => LayoutNode` but only ever called with `LayoutLeaf`. Should be `(leaf: LayoutLeaf) => LayoutNode`. Callers like `splitAtPane` rely on leaf properties without narrowing. [code-simplifier, comment-analyzer, type-design-analyzer, typescript-reviewer, code-reviewer]

- [ ] **M2** `src/lib/layout-presets.ts:139-146` — `LAYOUT_PRESETS` manually duplicates keys of `PRESET_FACTORIES`. Adding a preset to the record but forgetting the array causes silent omission. Derive it: `Object.keys(PRESET_FACTORIES) as LayoutPreset[]`. [code-simplifier, code-reviewer, dry-reuse, comment-analyzer, typescript-reviewer, security-auditor, efficiency, type-design-analyzer]

- [ ] **M3** `src/lib/__tests__/layout-presets.test.ts:47-49,54-56` — Direction assertions inside `if (isLayoutBranch(...))` guards silently pass when condition is false. A regression making the tree a leaf would be invisible. Add `expect(isLayoutBranch(layout.tree)).toBe(true)` before narrowing. [code-reviewer, pr-test-analyzer, silent-failure-hunter, typescript-reviewer]

- [ ] **M4** `src/types/workspace.ts:12-18` — `LayoutBranch.children` permits empty or single-child arrays. A branch with <2 children is structurally invalid. Use tuple minimum: `readonly children: readonly [LayoutNode, LayoutNode, ...LayoutNode[]]`. [type-design-analyzer, typescript-reviewer, security-auditor, silent-failure-hunter]

- [ ] **M5** `src/lib/layout-presets.ts:3,8,59,81,110,125-130` — Every `PresetFactory` returns a `paneIds` array identical to the leaf IDs already in the tree. Redundant derived state. `createLayoutFromPreset` should call `getPaneIdsInOrder(tree)` instead. [code-simplifier]

- [ ] **M6** `src/lib/__tests__/layout-tree.test.ts:206-224` — `splitAtPane` tests don't verify that the new inner branch inherits the original leaf's `size`. If size inheritance breaks, layout proportions collapse. [pr-test-analyzer]

- [ ] **M7** `src/types/workspace.ts:1` — Comment "Names follow iTerm2 convention" is factually incorrect. iTerm2 uses names like "Tall", "Even Horizontal". Replace with accurate description. [comment-analyzer]

- [ ] **M8** `src/lib/__tests__/layout-tree.test.ts:104-109` — `removeLeaf` nested collapse test should verify promoted child inherits parent's `size` (40), not its original size (50). This is the same size-inheritance invariant critical for rendering. [pr-test-analyzer]

## Suggestions (16 items)

- [ ] **S1** `src/types/workspace.ts:5-18` — `LayoutNode` union lacks a discriminant tag field (`type: "leaf" | "branch"`). Type guards use structural `"paneId" in node` checks which don't narrow in `switch` and could match objects with both properties. Adding a discriminant would enable proper narrowing. [type-design-analyzer, security-auditor, silent-failure-hunter]

- [ ] **S2** `src/lib/layout-tree.ts:56-59,108-111,165-169` — Tree operations spread union-typed nodes producing anonymous object literals, not `LayoutNode`. If a discriminant tag is added (S1), these spreads silently drop it. Introduce `createLeaf`/`createBranch` factory functions. [type-design-analyzer, typescript-reviewer]

- [ ] **S3** `src/lib/layout-tree.ts:30,65,103-104,115,157` — Tree operations silently return unchanged data on invalid input (not-found paneId, mismatched sizes, invalid path). Callers cannot distinguish success from no-op. Consider result types or dev-mode warnings. [silent-failure-hunter]

- [ ] **S4** `src/lib/layout-tree.ts:8-171` — No recursion depth limit on any of the 9 recursive functions. A deeply nested tree from corrupted state or repeated splits could stack-overflow. Add a `MAX_DEPTH` constant. [security-auditor]

- [ ] **S5** `src/types/workspace.ts:49-54` — `Workspace.panes` is decoupled from `layout.tree` with no validation link. A workspace can have orphaned pane IDs. Add a `validateWorkspace` function or JSDoc documenting the referential integrity invariant. [type-design-analyzer]

- [ ] **S6** `src/types/workspace.ts:51` — `Workspace.color` typed `string` but should be `(typeof WORKSPACE_COLORS)[number]` to enforce the palette at compile time. [type-design-analyzer, typescript-reviewer, code-simplifier]

- [ ] **S7** `src/lib/layout-presets.ts:11-38,41-82` — `2-column`/`2-row` are near-duplicates (differ only in direction). Same for `3-panel-l`/`3-panel-t`. Extract `twoPane(direction)` and `threePanel(outerDir, innerDir)` helpers. [dry-reuse, code-simplifier]

- [ ] **S8** `src/lib/layout-tree.ts:129-131` — `countPanes` duplicates the traversal of `getPaneIdsInOrder`. Could be `getPaneIdsInOrder(node).length`. [dry-reuse]

- [ ] **S9** `src/lib/layout-tree.ts:74-77` and `40-60` — `replaceLeaf` and `removeLeaf` rebuild every branch even when the target pane isn't in that subtree. Add referential equality short-circuit: if no child changed, return original node. [code-reviewer, efficiency]

- [ ] **S10** `src/lib/layout-tree.ts:147` — `findPanePath` builds path via `[i, ...subPath]` spread at each level, creating O(d²) intermediate arrays. Use push-based accumulator. [efficiency]

- [ ] **S11** `src/lib/layout-tree.ts:96-124` — `updateSizesAtPath` accepts NaN, Infinity, or negative sizes without validation. Add `sizes.every(s => Number.isFinite(s) && s >= 0)` guard. [security-auditor, silent-failure-hunter]

- [ ] **S12** `src/lib/__tests__/layout-tree.test.ts:88-102` — `removeLeaf` redistribution test checks sum=100 but not proportional sizes. Should verify each child's size individually. [pr-test-analyzer]

- [ ] **S13** `src/lib/__tests__/layout-tree.test.ts` — Missing immutability test. Deep-freeze an input fixture and confirm pure functions don't throw. Critical since these feed a Zustand store. [pr-test-analyzer]

- [ ] **S14** `src/lib/__tests__/layout-tree.test.ts` — Missing test: `splitAtPane` with non-existent pane ID should return tree unchanged. [pr-test-analyzer]

- [ ] **S15** `src/lib/layout-presets.ts:3,121` — `PresetFactory` param `ids` should be `generateId` or `nextId` to match calling convention and clarify it returns one ID per call. [comment-analyzer, typescript-reviewer]

- [ ] **S16** `src/lib/layout-tree.ts:91-94` — JSDoc says "sizes should sum to 100" but this isn't checked. Clarify it's a caller contract: "callers must ensure they sum to 100; no normalization is performed." [comment-analyzer]

## Nitpicks (8 items)

- [ ] **N1** `src/types/workspace.ts:13` — `direction` naming (`"horizontal"` = side-by-side) is counterintuitive. The existing parenthetical comment is excellent — keep it. [type-design-analyzer]

- [ ] **N2** `src/types/workspace.ts:70-76` — Type guards in `types/` file mix runtime code with type declarations. Consider co-locating with tree operations. [type-design-analyzer]

- [ ] **N3** `src/lib/layout-tree.ts:47-48` — `if (!only) return undefined` after `length === 1` is unreachable. Harmless but adds noise. [type-design-analyzer]

- [ ] **N4** `src/lib/layout-tree.ts:1-2` — Type and value imports from same module split across two statements. Combine into one. [typescript-reviewer, code-simplifier]

- [ ] **N5** `src/lib/__tests__/layout-presets.test.ts:7-11` — Mutable `counter` + manual `resetCounter()` calls. Use `beforeEach(resetCounter)` instead. [pr-test-analyzer, dry-reuse, code-simplifier]

- [ ] **N6** `src/lib/layout-tree.ts:110` — `sizes[i] ?? child.size` has dead fallback (length check on L104 guarantees `sizes[i]` exists). The `??` is only for `noUncheckedIndexedAccess`. [efficiency, silent-failure-hunter]

- [ ] **N7** `src/types/workspace.ts:30-33` — `PaneConfig.label` has no JSDoc about what it represents. [type-design-analyzer]

- [ ] **N8** `src/types/workspace.ts:36-45` — `WORKSPACE_COLORS` is a runtime value in a `types/` file. Consider moving to constants file. [typescript-reviewer, code-reviewer]

*Review ran: code-reviewer, security-auditor, silent-failure-hunter, code-simplifier, dry-reuse, comment-analyzer, type-design-analyzer, pr-test-analyzer, typescript-reviewer, efficiency*
