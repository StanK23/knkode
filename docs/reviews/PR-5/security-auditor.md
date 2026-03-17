# PR-5 Security Review: Layout Types & Tree Operations

**Reviewer**: security-auditor
**Date**: 2026-03-17
**Branch**: `feature/layout-types` (base: `main`)

## Summary

This PR introduces pure TypeScript types and recursive tree operations for a layout system. The code is well-structured with `readonly` modifiers and immutable update patterns. No high-severity vulnerabilities were found. The main concerns are (1) unbounded recursion depth in all tree operations, (2) missing runtime validation for `size` values and branch invariants, and (3) the `cwd`/`startupCommand` fields which will eventually touch shell execution and need upstream validation contracts.

## Must Fix

- `src/lib/layout-tree.ts:8-171` -- **No recursion depth limit on any tree function.** All 9 exported functions recurse with no depth guard. A deeply nested tree from corrupted persisted state, a malicious import, or a programmatic split loop could stack-overflow the renderer process. Add a `MAX_DEPTH` constant (e.g., 20) and bail out or throw when exceeded. This is especially relevant for `splitAtPane` which grows tree depth by 1 on every call and could be triggered repeatedly by user actions.

## Suggestions

- `src/lib/layout-tree.ts:96-124` -- **`updateSizesAtPath` accepts unvalidated size values.** NaN, Infinity, or negative numbers pass through silently and would corrupt layout state. Consider clamping values or asserting `sizes.every(s => Number.isFinite(s) && s >= 0)` before applying. The same applies to any future public API that writes `size` into the tree.
- `src/types/workspace.ts:12-18` -- **`LayoutBranch.children` permits empty arrays.** A zero-children branch is an invalid tree state that causes `getFirstPaneId` to return `undefined` and `countPanes` to return 0. Add a branded type, a runtime assertion in the tree functions, or at minimum document the invariant that branches must have >= 2 children (since a 1-child branch is always collapsed by `removeLeaf`).
- `src/types/workspace.ts:70-76` -- **Type guards use `in` operator, which walks the prototype chain.** For plain objects from `JSON.parse` this is safe, but if layout nodes are ever constructed from untrusted sources with prototype-polluted objects, `"paneId" in node` could match via `Object.prototype`. Consider using `Object.hasOwn(node, "paneId")` (or `Object.prototype.hasOwnProperty.call`) for defense-in-depth, especially if workspace state is ever importable from external files.
- `src/types/workspace.ts:29-33` -- **`PaneConfig.cwd` and `startupCommand` are unvalidated strings.** This PR correctly sets `startupCommand` to `null` and passes `cwd` through, but these fields will eventually reach Tauri shell commands. Document the validation contract (e.g., `cwd` must be an absolute path, `startupCommand` must be sanitized) so that downstream consumers know they own input validation. Consider adding branded types or validation functions alongside the type definitions.
- `src/types/workspace.ts:70-76` -- **Type guards are not mutually exclusive at runtime.** An object with both `paneId` and `direction` properties satisfies both `isLayoutLeaf` and `isLayoutBranch`. TypeScript prevents this at compile time, but deserialized JSON or external data could produce such an object. If a validation layer is added (e.g., for workspace import), it should reject ambiguous nodes.

## Nitpicks

- `src/lib/layout-presets.ts:139-146` -- **`LAYOUT_PRESETS` duplicates the keys of `PRESET_FACTORIES`.** Consider deriving it with `Object.keys(PRESET_FACTORIES) as LayoutPreset[]` to avoid the two lists drifting apart. This is a maintenance concern, not a security issue.
- `src/lib/layout-tree.ts:53-56` -- **Division-by-zero guard in `removeLeaf` is good** (`totalSize > 0`), but the fallback `100 / newChildren.length` could still produce non-integer sizes for 3+ remaining children. This is cosmetic and unlikely to cause issues, but worth noting for precision-sensitive layout calculations.
