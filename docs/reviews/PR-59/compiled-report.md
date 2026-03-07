# Compiled Review Report — PR #59: Agent Process Detection Layer

**Reviewed by:** 6 agents (code-reviewer, security-auditor, silent-failure-hunter, type-design-analyzer, pr-test-analyzer, comment-analyzer)
**Files reviewed:** 10 changed files
**Areas:** main process, renderer store, shared types, IPC, preload, UI components, tests

---

## Must Fix (10 items)

### 1. `execFileSync` blocks Electron main process event loop
**File:** `src/main/pty-manager.ts:152`
**Agents:** code-reviewer
`getDeepestChild` calls `execFileSync('ps', ...)` synchronously inside a `setInterval` callback (2s). With N panes open, this blocks the main process for up to N seconds (each `ps` has a 1s timeout). For 4 panes, the main process could freeze for up to 4s every 2s, causing UI stuttering and input lag. Use async `execFile` or run all `ps` queries in a single call.

### 2. `ps -g` has wrong/inconsistent semantics across platforms
**File:** `src/main/pty-manager.ts:152`
**Agents:** code-reviewer, security-auditor, silent-failure-hunter, comment-analyzer
On macOS, `-g <pgid>` selects by process group ID. On Linux, `-g <gid>` selects by session leader — different behavior. Also, children that call `setsid`/`setpgrp` are invisible. Use `pgrep -P <pid>` or `ps ax -o pid=,ppid=,comm=` filtered by ppid in-process.

### 3. Bare `catch {}` blocks swallow all errors silently
**File:** `src/main/pty-manager.ts:137, 180`
**Agents:** silent-failure-hunter
Both `getChildProcessInfo` and `getDeepestChild` have bare catch blocks that swallow ENOENT (binary missing), EACCES (permission denied), timeout, and parsing bugs. These run every 2s — a persistent unexpected error fires 30 times/minute with zero visibility. Distinguish expected process-exit errors from unexpected system errors and log the latter.

### 4. `removePtyId` does not clean up agent detection maps
**File:** `src/renderer/src/store/index.ts:359-365`
**Agents:** type-design-analyzer, security-auditor
When a PTY exits naturally (via `removePtyId`), the `paneAgentTypes` and `paneProcessNames` maps retain stale entries. Only `killPtys` cleans them. This causes stale agent badges on dead panes and unbounded map growth.

### 5. `PROCESS_TO_AGENT` Record type lies about undefined returns
**File:** `src/shared/types.ts:106`
**Agents:** type-design-analyzer
Typed as `Record<string, AgentType>` — any lookup returns `AgentType`, never `undefined`. The guard `if (agentType)` in the store works at runtime but TypeScript can't help catch missing guards. Change to `Partial<Record<string, AgentType>>` or use a lookup function.

### 6. Windows `wmic` CSV parsing broken + tool deprecated
**File:** `src/main/pty-manager.ts:126-135`
**Agents:** security-auditor
Naive `split(',')` breaks on process names containing commas. Also, `wmic` is deprecated on Windows 10 21H1+ and removed on some Windows 11 builds. Use PowerShell `Get-CimInstance` or `tasklist` as replacement.

### 7. `getChildProcessInfo` name and JSDoc are factually wrong
**File:** `src/main/pty-manager.ts:105-112`
**Agents:** comment-analyzer, code-reviewer, silent-failure-hunter
Function name says "getChildProcessInfo" and JSDoc says "lists child processes", but `ps -p <pid>` returns info about the PID itself, not its children. Only the Windows `wmic` path queries children. Rename to `getProcessInfo` or fix the ps flags.

### 8. `onPtyProcessChanged` listener never unsubscribed — leak risk
**File:** `src/renderer/src/store/index.ts:416-418`
**Agents:** security-auditor, code-reviewer, silent-failure-hunter, type-design-analyzer
The IPC listener's unsubscribe function is discarded. If `init()` runs twice (tests, error recovery), listeners stack. Store the unsubscribe or guard `init()` against double-registration.

### 9. No tests for `setPaneProcess` store action
**File:** `src/renderer/src/store/index.ts`
**Agents:** pr-test-analyzer
The central store action that maps process info to agent types has zero tests. Needed: known agent sets both maps, unknown process clears agentType, null clears both, cross-pane isolation.

### 10. No tests for `killPtys` agent state cleanup
**File:** `src/renderer/src/store/index.ts`
**Agents:** pr-test-analyzer
New cleanup code in `killPtys` for agent maps is untested. Regression risk: cleanup lines accidentally removed during refactoring.

---

## Suggestions (8 items)

### 1. Combine parallel maps into single map
**File:** `src/renderer/src/store/index.ts:215-217`
**Agents:** type-design-analyzer
`paneAgentTypes` + `paneProcessNames` → single `paneProcessState: Map<string, { processName: string; agentType: AgentType | null }>`. Eliminates desync bugs structurally.

### 2. Derive `AgentType` from `PROCESS_TO_AGENT` for compile-time safety
**File:** `src/shared/types.ts:95-114`
**Agents:** type-design-analyzer
Use `as const satisfies` + derive type from values so adding an AgentType with no mapping is a compile error.

### 3. Add error isolation in polling loop
**File:** `src/main/pty-manager.ts:195-207`
**Agents:** silent-failure-hunter
If `safeSend` or `sessions.get` throws, the entire polling interval dies. Wrap the loop body in try-catch per pane.

### 4. Move `AGENT_LABELS` to shared types
**File:** `src/renderer/src/components/Pane.tsx:18-25`
**Agents:** type-design-analyzer
Display metadata should live near the type definition for maintainability.

### 5. Return cached process info from IPC handler instead of live query
**File:** `src/main/ipc.ts:200-203`
**Agents:** security-auditor
`PTY_GET_PROCESS_INFO` runs live `ps` per call with no rate limiting. The polling already provides data every 2s — return `session.lastProcessName` instead.

### 6. Start/stop poll timer lazily based on session count
**File:** `src/main/pty-manager.ts:192-208`
**Agents:** security-auditor
Timer runs even with zero sessions. Start on first `createPty`, stop when sessions empty.

### 7. Add tests for `getDeepestChild` tree-walking logic
**File:** `src/main/pty-manager.ts`
**Agents:** pr-test-analyzer
Depth limit of 10, self-referential PID guard, tree walk order — all worth testing. Extract parsing into pure function for testability.

### 8. Verify `onPtyProcessChanged` listener registration in init test
**File:** `src/renderer/src/store/index.ts`
**Agents:** pr-test-analyzer
After `init()`, verify `mockApi.onPtyProcessChanged` was called and callback updates store correctly.

---

## Nitpicks (10 items)

1. `src/main/pty-manager.ts:106` — `getChildProcessInfo` exported but only used internally. Unexport to reduce surface. (security-auditor)
2. `src/main/pty-manager.ts:165` — Path basename extraction on `comm=` output is redundant (already bare name). Add clarifying comment. (security-auditor)
3. `src/shared/types.ts:117-120` — `ProcessInfo.pid` can be `NaN` on Windows path. Add runtime assertion. (security-auditor)
4. `src/main/pty-manager.ts:193-208` — Restart after stop emits spurious `PTY_PROCESS_CHANGED` events. (security-auditor)
5. `src/renderer/src/store/index.test.ts:60` — `resetStore` doesn't reset `paneAgentTypes`/`paneProcessNames`. (pr-test-analyzer)
6. `src/renderer/src/store/index.ts:966-973` — `reorderSnippets` whitespace-only change unrelated to PR. (code-reviewer)
7. `src/shared/types.ts:94` — Section comment `// Agent detection` could be more descriptive. (comment-analyzer, type-design-analyzer)
8. `src/renderer/src/store/index.ts:215` — JSDoc says "null" but actual representation is Map key absence. (comment-analyzer)
9. `src/renderer/src/store/index.ts:217` — JSDoc says "for debugging / display" but process name is not displayed. (comment-analyzer)
10. `src/shared/agent-detection.test.ts` — No test for case sensitivity behavior. (pr-test-analyzer)

---

## Priority Order for Fixes

1. **Make process detection async** — blocks main thread (Must Fix #1)
2. **Fix `ps` flags for cross-platform** — wrong results on Linux, edge cases on macOS (Must Fix #2)
3. **Add error discrimination in catch blocks** — silent failures (Must Fix #3)
4. **Clean agent maps in `removePtyId`** — stale state bug (Must Fix #4)
5. **Fix `PROCESS_TO_AGENT` type** — type safety hole (Must Fix #5)
6. **Fix Windows `wmic` path** — broken on modern Windows (Must Fix #6)
7. **Fix function name/JSDoc** — misleading documentation (Must Fix #7)
8. **Store listener unsubscribe** — leak risk (Must Fix #8)
9. **Add `setPaneProcess` tests** — critical untested path (Must Fix #9)
10. **Add `killPtys` cleanup tests** — untested cleanup (Must Fix #10)
