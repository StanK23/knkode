# PR #7 Compiled Review — feat: recursive split pane layout with allotment

**6 files reviewed, 9 agents ran** (code-quality, security, simplification, DRY/reuse, comments, type-design, TypeScript, frontend, efficiency)

## Must Fix (4)

- **M1** `SplitPaneLayout.tsx:99` — `[...path, index]` creates a new array every render for each child, causing cascading re-renders through the entire tree. Use `useMemo` or switch to string-encoded paths. [efficiency, frontend, typescript, code-simplifier]

- **M2** `SplitPaneLayout.tsx:86` — `defaultSizes` recomputed via `.map()` every render. Should be `useMemo(() => node.children.map(c => c.size), [node.children])` to signal mount-only intent and avoid allocations. [efficiency, frontend, typescript, code-reviewer]

- **M3** `App.tsx:39-44` — Three separate `useWorkspaceStore` selectors each subscribe independently. The `tree` selector returns a new object reference on any workspace mutation (including `updatePaneSizes` during drag), causing unnecessary re-renders of the entire layout tree. Combine into a single selector with `useShallow`. [efficiency, frontend, typescript, code-simplifier]

- **M4** `SplitPaneLayout.tsx:116-133` — Hand-rolled `useDebouncedCallback` duplicates debounce logic already in `Terminal.tsx:144-158`. Extract to `src/hooks/useDebouncedCallback.ts` for reuse. [dry-reuse, code-simplifier, code-reviewer, typescript, comment-analyzer, frontend]

## Suggestions (8)

- **S1** `SplitPaneLayout.tsx:43,112` — Raw `node.type === "leaf"` checks bypass existing `isLayoutLeaf`/`isLayoutBranch` type guards used everywhere else in the codebase. Use the guards for consistency. [dry-reuse]

- **S2** `SplitPaneLayout.tsx + Pane.tsx` — `workspaceColor` is prop-drilled through 4 component layers but only used in `Pane`. Pane already subscribes to the store for other state — it could derive the color directly, removing the prop from 3 intermediate interfaces. [code-simplifier]

- **S3** `Pane.tsx:26` — Inline `style` for dynamic `borderTopColor`. Use CSS custom property approach: set `--ws-color` via minimal style, reference with `border-t-[var(--ws-color)]` in Tailwind class. Keeps styling layer consistent. [code-reviewer, frontend, security]

- **S4** `SplitPaneLayout.tsx:42-55,66-107` — Neither `LayoutNodeRenderer` nor `BranchRenderer` is wrapped in `React.memo`. After stabilizing `path` (M1), adding memo would short-circuit re-renders for unchanged subtrees. [efficiency, frontend]

- **S5** `Pane.tsx:21` — Add `role="group"` and `aria-label="Terminal pane"` to the container div for screen reader context. Could also remove the biome a11y override. [security, frontend]

- **S6** `SplitPaneLayout.tsx:25` — `path={[]}` creates a new empty array every render. Use a module-level constant: `const ROOT_PATH: readonly number[] = []`. [efficiency]

- **S7** `SplitPaneLayout.tsx:69` — Expand pathRef comment to explain *why*: "path is a new array on every render, so we store it in a ref to keep handleChange stable across renders." [comment-analyzer]

- **S8** `Pane.tsx:21` — `setActivePane` fires unconditionally on every mouseDown, even when pane is already active, producing no-op store updates that notify all subscribers. Add a guard. [efficiency]

## Nitpicks (5)

- **N1** `Pane.tsx:28` — Hardcoded `"Terminal"` label. `PaneConfig` already has a `label` field — read from store, fall back to `"Terminal"`. [code-reviewer, frontend]

- **N2** `SplitPaneLayout.tsx:111-113` — `getNodeKey` fallback `branch-${index}` is positionally-keyed. Add a comment explaining this is safe (branches always have leaf descendants in valid trees). [security, frontend, type-design, typescript]

- **N3** `#1d1f21` repeated in App.tsx, Terminal.tsx, and Pane.tsx — extract to Tailwind theme or shared constant. [dry-reuse]

- **N4** Section divider comments (`// -- ...`) — unusual for React but harmless at 133 lines. [comment-analyzer, code-simplifier]

- **N5** `Pane.tsx:35` — "Connecting..." replaces old "Terminal disconnected" text. Confirm intentional. [dry-reuse]
