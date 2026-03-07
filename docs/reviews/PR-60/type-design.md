# PR #60 Type Design Review: Alt Screen Buffer Detection

## Summary

The PR introduces `altScreenPaneIds: Set<string>` to the Zustand store and a `setAltScreen` action to track which panes are in alternate screen buffer mode (vim, htop, etc.). The type design is clean, follows existing patterns precisely, and the invariant enforcement is solid -- though the cleanup paths in `killPtys` and `removePtyId` unconditionally allocate and set a new `Set` even when no alt-screen state existed for the affected pane, causing unnecessary re-renders.

## Type: `altScreenPaneIds` (Set<string>) + `setAltScreen` action

### Invariants Identified
- `altScreenPaneIds` must only contain IDs of panes that currently have an active PTY (subset of `activePtyIds`).
- When a PTY is killed or exits, its ID must be removed from `altScreenPaneIds` (no stale entries).
- `altScreenPaneIds` must be a new reference on every mutation (Zustand reference-equality requirement).
- `setAltScreen` must be idempotent -- setting the same state twice must not trigger a re-render.

### Ratings

- **Encapsulation**: 7/10
  The `Set<string>` is publicly readable via `useStore.getState().altScreenPaneIds`, allowing external code to mutate the Set in place (though Zustand's immutability convention mitigates this in practice). `setAltScreen` correctly centralizes mutations. The `StoreState` interface is not exported, which limits misuse.

- **Invariant Expression**: 7/10
  The JSDoc comment on `altScreenPaneIds` clearly states the intent ("Block parsing must be disabled for these panes"). The relationship between `altScreenPaneIds` and `activePtyIds` (subset invariant) is not expressed in the type system -- it relies on cleanup code in `killPtys` and `removePtyId`. This is acceptable for a flat Zustand store but worth noting.

- **Invariant Usefulness**: 8/10
  Tracking alt-screen state prevents block parsing corruption when TUI apps (vim, htop, less) are running. The no-op optimization in `setAltScreen` prevents unnecessary re-renders during rapid buffer switches. The cleanup in both `killPtys` and `removePtyId` prevents stale state.

- **Invariant Enforcement**: 7/10
  The `setAltScreen` action correctly enforces idempotency and immutable-reference creation. Cleanup paths exist in both `killPtys` and `removePtyId`. However, the cleanup always allocates a new Set and triggers a `set()` call even when no alt-screen entry existed, which is inconsistent with the idempotency standard set by `setAltScreen` itself.

### Strengths
- Follows the exact same pattern as `paneAgentTypes` and `paneProcessNames` for consistency.
- `setAltScreen` short-circuits with reference equality preservation when state already matches -- well tested.
- The `onBufferChange` listener does not capture a disposable, which is consistent with `term.onData` and `term.onResize` (all cleaned up by `term.dispose()`).
- Thorough test coverage: add, remove, no-op, isolation, and cleanup in both kill paths.

### Concerns
- `killPtys` and `removePtyId` always create `new Set(get().altScreenPaneIds)` and include it in the `set()` call, even when the pane being removed was never in alt-screen mode. This triggers a Zustand state update with a new reference, causing any subscriber of `altScreenPaneIds` to re-render unnecessarily. This is a pre-existing pattern for `paneAgentTypes` and `paneProcessNames` too, but extending it to `altScreenPaneIds` compounds the issue.

## Must Fix

None

## Suggestions

- `src/renderer/src/store/index.ts:365-374` (`killPtys`): The cleanup block unconditionally creates a new `Set` from `altScreenPaneIds` and passes it to `set()` even when no killed pane was in alt-screen mode. Consider conditionally including `altScreenPaneIds` in the `set()` call only when an entry was actually deleted. This would avoid a spurious Zustand re-render for every `killPtys` call. The same optimization applies to `paneAgentTypes` and `paneProcessNames` but is out of scope for this PR.

- `src/renderer/src/store/index.ts:382-394` (`removePtyId`): Same issue as above -- always allocates and sets `altScreenPaneIds` even when the pane had no alt-screen entry. A conditional `if (altIds.delete(paneId))` guard before including it in `set()` would be cleaner.

## Nitpicks

- `src/renderer/src/store/index.ts:218-220`: The JSDoc says "Block parsing must be disabled for these panes" which couples the store's state description to a specific consumer's behavior. Consider rephrasing to describe what the state *is* rather than what a consumer should do with it: e.g. "Pane IDs currently displaying the alternate screen buffer (TUI mode like vim, htop)."
