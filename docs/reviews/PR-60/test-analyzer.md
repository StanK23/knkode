# PR #60 Test Coverage Analysis: Alt Screen Buffer Detection

## Summary

Test coverage for the store-side changes is thorough and well-structured. The `setAltScreen` action, its no-op optimization, multi-pane isolation, and cleanup paths through both `killPtys` and `removePtyId` are all properly tested. The Terminal.tsx integration (wiring `onBufferChange` to `setAltScreen`) is inherently untestable in a unit test context and is appropriately left to manual/E2E verification.

## Must Fix

None

## Suggestions

- `src/renderer/src/store/index.test.ts`: The `setAltScreen('p1', false)` no-op case (calling `setAltScreen` with `false` when the pane is already absent from the set) is not explicitly tested. While the `isAlt === has` early return on line `index.ts:301` covers this, a test would guard against regressions where the early return is accidentally removed and a spurious `set()` call fires, causing unnecessary re-renders. Criticality: 4/10 -- the current code is correct and the optimization is simple, but adding this test would be trivial and symmetric with the existing `true`-when-already-present test.

- `src/renderer/src/store/index.test.ts`: The `killPtys` alt screen cleanup test only covers the case where the killed pane IS in `altScreenPaneIds`. There is no test verifying that `killPtys` works correctly when the killed pane is NOT in `altScreenPaneIds` (i.e., the pane was on the normal buffer when killed). This is implicitly tested by the existing `killPtys` tests that don't set `altScreenPaneIds`, but an explicit assertion that `altScreenPaneIds` remains unchanged when killing a non-alt-screen pane would make intent clearer. Criticality: 3/10 -- low risk, existing tests cover this implicitly.

- `src/renderer/src/store/index.test.ts`: The `closePane` and `closeWorkspaceTab` paths go through `killPtys` for cleanup, and `removeWorkspace` also calls `killPtys`. These are tested for agent cleanup but not explicitly for alt screen cleanup. Since they delegate to `killPtys` (which IS tested), the risk is minimal, but a single integration-style test for `closePane` with an alt-screen pane would document the contract. Criticality: 3/10 -- `killPtys` is the single cleanup funnel and is already tested.

## Nitpicks

- `src/renderer/src/store/index.test.ts:1160-1171`: The `killPtys alt screen cleanup` describe block has only one test case. For consistency with the parallel `killPtys agent cleanup` block (which has two tests: one for cleanup and one for preservation), consider adding a "preserves alt screen state for panes not killed" test. This is purely about test suite symmetry and readability. Criticality: 2/10.
