# DRY / Reuse Review — PR #60 (alt screen buffer detection)

## Summary

The PR introduces minimal new code with no outright duplication of existing codebase logic. The main observation is that the pane-cleanup pattern in `killPtys` and `removePtyId` was already duplicated before this PR, and extending it with a third collection (`altScreenPaneIds`) makes the case for extracting a shared helper slightly stronger.

## Must Fix

None

## Suggestions

- **Extract shared pane-cleanup helper from `killPtys` / `removePtyId`** — Both methods now clone the same three collections (`paneAgentTypes`, `paneProcessNames`, `altScreenPaneIds`), delete entries for the given pane IDs, and call `set()`. This was duplicated before this PR (with 2 collections); adding a third makes a helper worthwhile. A function like `cleanupPaneState(paneIds: string[])` returning the partial state update would keep both callers to a single line.
  - `src/renderer/src/store/index.ts:365-374` (`killPtys` cleanup block)
  - `src/renderer/src/store/index.ts:382-394` (`removePtyId` cleanup block)

## Nitpicks

- **`buf.type === 'alternate'` appears twice** — The expression is used in the new `onBufferChange` handler (`src/renderer/src/components/Terminal.tsx:334`) and in the existing `fitAndPreserveScroll` function (`src/renderer/src/components/Terminal.tsx:47`). These serve different purposes (event-driven store sync vs. point-in-time resize guard), so extracting a shared constant is not warranted. Noting for awareness only.
