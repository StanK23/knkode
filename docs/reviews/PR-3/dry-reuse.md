# DRY / Reuse Analysis -- PR #3 "feat: keyboard shortcuts & pane focus tracking"

## Summary

The PR correctly centralizes `splitPane` and `closePane` into the Zustand store (good DRY refactor from PaneArea), but introduces a duplicate `handleNewWorkspace` implementation in App.tsx that duplicates existing logic in TabBar.tsx. There are also several repeated inline patterns within App.tsx and useKeyboardShortcuts.ts that could be extracted into small helpers.

## Must Fix

- **Duplicate `handleNewWorkspace` logic.** `App.tsx:21-29` duplicates the workspace-creation recipe already present in `TabBar.tsx:35-42`. Both compute `colorIndex = count % WORKSPACE_COLORS.length`, then call `createWorkspace("Workspace N+1", color, 'single')`. The App.tsx version uses `useStore.getState()` while TabBar uses reactive `workspaces` -- but the logic is identical. Extract a single `createDefaultWorkspace()` store action (or a shared callback factory) and import it in both places.
  - `src/renderer/src/App.tsx:21-29` (new in PR)
  - `src/renderer/src/components/TabBar.tsx:35-42` (existing on main)

## Suggestions

- **Repeated "find workspace by paneId" lookup.** The pattern `useStore.getState().workspaces.find((w) => paneId in w.panes)` appears 4 times in `App.tsx` (lines 34, 38, 42, 62). Consider extracting a `findWorkspaceByPaneId(paneId: string)` helper in the store module (or as a store selector/utility) and importing it. This would also benefit `useKeyboardShortcuts.ts:28` which uses a similar pattern (`state.workspaces.find((w) => w.id === state.appState.activeWorkspaceId)` -- different predicate, but both are workspace lookups that could live next to each other).
  - `src/renderer/src/App.tsx:34`
  - `src/renderer/src/App.tsx:38`
  - `src/renderer/src/App.tsx:42`
  - `src/renderer/src/App.tsx:62`

- **Repeated "focused pane guard" pattern in useKeyboardShortcuts.** The check `state.focusedPaneId && activeWs?.panes[state.focusedPaneId]` is repeated verbatim at lines 32, 40, and 50 of `useKeyboardShortcuts.ts`. Extract a local variable (e.g., `const focusedId = state.focusedPaneId; const hasFocus = focusedId && activeWs?.panes[focusedId]`) at the top of the handler to reduce repetition and improve readability.
  - `src/renderer/src/hooks/useKeyboardShortcuts.ts:32`
  - `src/renderer/src/hooks/useKeyboardShortcuts.ts:40`
  - `src/renderer/src/hooks/useKeyboardShortcuts.ts:50`

- **Tab-cycling logic is duplicated within useKeyboardShortcuts.** The previous-tab block (lines 64-72) and next-tab block (lines 75-83) share the same structure: destructure `openWorkspaceIds` and `activeWorkspaceId`, guard on `length < 2`, compute `indexOf`, compute new index, call `setActiveWorkspace`. Consider extracting a `cycleTab(direction: 1 | -1)` helper to DRY the two blocks.
  - `src/renderer/src/hooks/useKeyboardShortcuts.ts:64-72`
  - `src/renderer/src/hooks/useKeyboardShortcuts.ts:75-83`

- **Store actions `splitPane` and `closePane` share a "find-workspace, mutate, save, map-back" pattern** with `updatePaneConfig` (line 445) and `updatePaneCwd` (line 465). All four actions follow: find workspace by ID, bail if missing, build `updated` workspace, fire-and-forget `saveWorkspace`, return mapped workspaces. A private `mutateWorkspace(workspaceId, fn)` helper inside the store would collapse the boilerplate across all four (and future) workspace-mutating actions.
  - `src/renderer/src/store/index.ts:364-406` (`splitPane`)
  - `src/renderer/src/store/index.ts:408-443` (`closePane`)
  - `src/renderer/src/store/index.ts:445-462` (`updatePaneConfig`, existing)
  - `src/renderer/src/store/index.ts:465-483` (`updatePaneCwd`, existing)

## Nitpicks

- `useKeyboardShortcuts.ts:27` reads `useStore.getState()` on every keydown event even when the key is not a shortcut. Moving the `state` read below the `if (!isMod) return` guard is already correct, but getting `activeWs` on line 28 could be deferred into only the branches that need it (split/close/focus-pane) to avoid a `find()` on every modified keydown. Minor perf concern given typical workspace counts.
  - `src/renderer/src/hooks/useKeyboardShortcuts.ts:27-28`
