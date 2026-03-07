# PR #60 Comment Analysis: Alt Screen Buffer Detection

## Summary

The new and modified comments in this PR are concise, factually accurate, and well-aligned with the actual xterm.js API and store implementation. One comment makes a forward-looking claim about "block parsing" behavior that cannot be verified against any existing code, which should be addressed.

## Must Fix

- `src/renderer/src/store/index.ts:219` -- The JSDoc for `altScreenPaneIds` states "Block parsing must be disabled for these panes." There is no block parsing logic anywhere in the current codebase (confirmed via full-repo search). This comment describes a future intent as if it were an existing invariant. A future maintainer reading this will search for the block parsing code that enforces this rule and find nothing, creating confusion about whether the feature was removed or never implemented. Either remove the sentence entirely (since the comment on line 218 already conveys the purpose), or rewrite it to clearly indicate this is a requirement for future consumers, e.g.: "Consumers that parse terminal output into blocks should skip panes in this set."

## Suggestions

- `src/renderer/src/store/index.ts:365` and `src/renderer/src/store/index.ts:382` -- The updated comments `// Clean up agent detection + alt screen state` and `// Clean up agent detection + alt screen state so dead panes don't show stale data` are accurate. However, both `killPtys` and `removePtyId` unconditionally create a new `Set(get().altScreenPaneIds)` and include it in the `set()` call even when no killed/removed pane was in the alt screen set. This is consistent with how `paneAgentTypes` and `paneProcessNames` are already handled (pre-existing pattern), so no code change is needed, but the comment could note this tradeoff for future optimizers: the unconditional clone trades a minor unnecessary re-render for simpler, consistent cleanup logic.

## Nitpicks

- `src/renderer/src/store/index.ts:223` -- The JSDoc `/** Update alt screen buffer state for a pane. */` on the `setAltScreen` action is correct but could be slightly more informative by mentioning the no-op optimization, e.g.: "Update alt screen buffer state for a pane. No-op if state already matches." This would help callers understand they do not need to guard against redundant calls. Low priority since the implementation itself is simple enough to read.

- `src/renderer/src/components/Terminal.tsx:332` -- The comment `// Track alternate screen buffer transitions (vim, htop, etc.)` is accurate and uses good examples. No change needed. Noted as a positive finding.

- `src/renderer/src/store/index.test.ts:1146` -- The test comment `// Reference equality -- no new Set created` is excellent. It documents the specific assertion intent (reference stability, not just value equality), which is non-obvious from the `toBe` matcher alone. No change needed.
