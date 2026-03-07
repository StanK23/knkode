# Compiled Review — PR #60: feat: alt screen buffer detection

**Summary:** 3 files reviewed, 7 agents ran (code quality, security, code simplification, DRY/reuse, comment quality, type design, test coverage)

**Result:** No bugs, no security vulnerabilities. All findings are suggestions/nitpicks.

---

## Must Fix (0 items)

None

## Suggestions (4 items)

1. `src/renderer/src/store/index.ts:218-220` — [comment-analyzer, code-simplifier, type-design] The JSDoc on `altScreenPaneIds` says "Block parsing must be disabled for these panes." No block parsing exists in the codebase yet — this describes future intent as a present invariant. Reword to describe state, not consumer behavior: e.g. "Pane IDs currently in alternate screen buffer (TUI mode like vim, htop)."

2. `src/renderer/src/store/index.ts:365-374,382-394` — [code-reviewer, security-auditor, code-simplifier, dry-reuse, type-design] Both `killPtys` and `removePtyId` unconditionally clone `altScreenPaneIds` (new Set + set()) even when the removed pane was never in alt screen. Pre-existing pattern for `paneAgentTypes`/`paneProcessNames`. Extract a `cleanupPaneState(paneIds)` helper to DRY both methods — three collections now make extraction worthwhile.

3. `src/renderer/src/store/index.test.ts` — [test-analyzer] Missing no-op test for `setAltScreen('p1', false)` when pane is already absent. Trivial, symmetric with the existing true-when-already-present test. Add for regression safety.

4. `src/renderer/src/store/index.test.ts` — [test-analyzer] `killPtys alt screen cleanup` block has one test. Add "preserves alt screen state for panes not killed" for symmetry with the parallel agent cleanup block.

## Nitpicks (2 items)

1. `src/renderer/src/store/index.ts:223` — [comment-analyzer] `setAltScreen` JSDoc could mention "No-op if state already matches" to document the optimization for callers.

2. `src/renderer/src/components/Terminal.tsx:333` — [security-auditor] The `onBufferChange` disposable is not stored in `CachedTerminal`, unlike `removeDataListener`/`removeExitListener`. Safe because `term.dispose()` cleans all subscriptions, and `onResize`/`onData` follow the same implicit-dispose pattern. Consistency improvement only.
