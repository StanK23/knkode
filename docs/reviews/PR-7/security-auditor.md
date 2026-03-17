# Security Audit: PR #7 -- Split Pane Renderer

## Summary

This PR introduces a split-pane layout system using the `allotment` library, adding `Pane.tsx` and `SplitPaneLayout.tsx` components and wiring them into `App.tsx`. The changes are low-risk from a security perspective: no raw HTML injection, no user-controlled URLs, no new IPC surface, and no authentication or network changes. The `allotment` dependency is actively maintained, has no known CVEs, and `bun audit` reports zero vulnerabilities.

## Must Fix

None

## Suggestions

- `src/components/Pane.tsx:26` -- The `workspaceColor` prop is applied directly via the `style` attribute (`borderTopColor: workspaceColor`). Although the current type system constrains this to a hardcoded 8-color palette (`WORKSPACE_COLORS` in `src/types/workspace.ts:46-55`), this is a CSS injection surface if the constraint is ever relaxed (e.g., user-configurable colors from settings or IPC). Consider validating the color value at the point of use with a regex like `/^#[0-9a-fA-F]{6}$/` or a sanitization utility to enforce the constraint at runtime, not just at the type level.

- `src/components/Pane.tsx:35` -- The `error` string from `PaneTerminalState` is rendered as text content (`{error ?? "Connecting..."}`). React's JSX text interpolation safely escapes this, so there is no XSS risk. However, the error string is constructed via `formatError(e)` in the store, which calls `String(e)` on unknown values. In adversarial scenarios (e.g., a malicious Tauri plugin or corrupted IPC payload), this could surface verbose internal error messages to the UI. Consider truncating or sanitizing error messages displayed to users to avoid information leakage.

- `src/components/SplitPaneLayout.tsx:111-113` -- The `getNodeKey` function falls back to `branch-${index}` for branches without any leaf. While not a security issue per se, index-based React keys can cause subtle state-retention bugs if the tree is reordered. If a terminal session's state were to "stick" to the wrong pane due to key collisions, it could theoretically expose one terminal's output in another pane's context. The current `MAX_DEPTH` guard (20) in `layout-tree.ts` makes pathological trees unlikely, but the fallback key pattern is worth noting.

## Nitpicks

- `biome.json:37-44` -- Disabling `noStaticElementInteractions` for `Pane.tsx` is appropriately scoped. For defense-in-depth, consider adding `role="group"` or another semantic role to the outer `div` with `onMouseDown` in `Pane.tsx:21` so the override is not needed and the element has semantic meaning for assistive technologies.

- `package.json:18` -- The `allotment` dependency brings in `lodash.clamp` and `lodash.debounce` as transitive dependencies. These are small, stable utility packages with no known vulnerabilities, but they add to the supply chain surface. This is informational only; no action needed unless the project has a strict dependency minimization policy.
