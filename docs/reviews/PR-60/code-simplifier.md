# PR #60 Code Simplifier Review

## Summary

Clean, well-scoped PR that adds alt screen buffer detection with proper store state, cleanup, and tests. The `setAltScreen` action has a good no-op optimization. There are no must-fix issues; the suggestions below address minor duplication in cleanup logic.

## Must Fix

None

## Suggestions

- `src/renderer/src/store/index.ts:365-374` and `src/renderer/src/store/index.ts:382-394` — The cleanup blocks in `killPtys` and `removePtyId` now both clone and clean three collections (`paneAgentTypes`, `paneProcessNames`, `altScreenPaneIds`). Each new collection added to cleanup expands the duplication. Consider extracting a helper like `cleanupPaneState(paneIds: string[])` that handles the Map/Set cloning and deletion for all per-pane collections in one place, reducing the surface area for future maintenance (e.g., adding another per-pane collection would require a change in only one place). This is a pre-existing pattern that this PR extends, so it is fair to defer.

## Nitpicks

- `src/renderer/src/store/index.ts:368` — In `killPtys`, the cleanup block unconditionally creates new copies of all three collections and calls `set()` even when none of the killed pane IDs exist in those collections. This is harmless (Zustand shallow-merges and React won't re-render if consumers select unchanged data), but it is worth noting as a minor inefficiency. Same observation applies to the pre-existing `agents`/`procs` pattern, so not specific to this PR.
- `src/renderer/src/store/index.ts:215-221` — The JSDoc comment on `altScreenPaneIds` says "Block parsing must be disabled for these panes." Since this PR does not implement block parsing or any consumer of `altScreenPaneIds`, the comment describes future behavior. This is fine as a design note, but consider marking it as a TODO or removing it until the consumer exists, to avoid confusion about whether this invariant is currently enforced.
