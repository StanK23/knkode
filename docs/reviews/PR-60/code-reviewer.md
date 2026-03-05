# PR #60 Review: feat: alt screen buffer detection

## Summary

Clean, well-structured addition of alternate screen buffer tracking (vim, htop, etc.) via xterm's `onBufferChange` API. The store state, cleanup paths, and tests are all properly implemented with no bugs or guideline violations found.

## Must Fix

None

## Suggestions

- `src/renderer/src/store/index.ts:365-374` (killPtys) and `src/renderer/src/store/index.ts:382-394` (removePtyId): The cleanup block unconditionally allocates a new `Set` for `altScreenPaneIds` and triggers a Zustand `set()` call even when the pane being killed/removed was never in alt screen mode. This is a pre-existing pattern (same applies to `paneAgentTypes` and `paneProcessNames`), so not introduced by this PR, but worth noting for a future optimization pass -- an early-out check could avoid unnecessary re-renders.

## Nitpicks

None
