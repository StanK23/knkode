# HANDOFF

## Current State
- Branch: `fix/scroll-jump-debug`
- Working on:
  - Scroll jump investigation (board: "Bug Investigation — Scroll Jump")
  - macOS clipboard hotkey regression fix staged on this branch (board: "Release Bugfixes — v1")

## Completed In This Branch
- Added persistent scroll debug logging via main/preload IPC.
- Scroll lifecycle events now write structured JSONL records to `~/.knkode/logs/scroll-debug.jsonl`.
- Instrumented terminal mount/remount, initial fit, resize observer fit cycles, viewport scroll, `onWriteParsed` scheduling, workspace restore, theme-triggered fit, and scroll-to-bottom actions.
- Identified the active-pane scroll jump root cause from logs in `knktx` first pane:
  - agent redraw batches briefly collapse xterm state to the top (`baseY=0`, `viewportY=0`)
  - the viewport scroll tracker was treating that transient redraw state as a real user scroll
  - once captured, later syncs kept restoring the pane to the top on every new line
- Added a transient redraw-reset guard in terminal scroll tracking:
  - detects active output batches that momentarily reset xterm to the top before rebuilding scrollback
  - ignores those top-of-buffer snapshots unless the pane was already intentionally scrolled to top
  - immediately restores the prior viewport instead of letting the pane get pinned to top
- Identified a second active-pane failure mode in the same `knktx` first-pane logs:
  - during a redraw rebuild, the saved viewport marker can be invalidated (`viewportAnchorLine = -1`) before recovery runs
  - the transient-reset recovery then falls back to distance-from-bottom while the buffer is still only partially rebuilt
  - that fallback clamps to line `0`, so the pane still gets pinned to the top even though the reset was detected
- Updated transient-reset recovery to defer restoring scrolled-up panes until the rebuilt buffer is large enough to restore the prior distance-from-bottom when the original marker has already been invalidated.
- Identified and fixed a third redraw-reset failure mode in the same `knktx` pane logs:
  - the preserved transient-reset flag was being cleared too early by a temporary sync during the `baseY=0`, `viewportY=0` phase
  - once cleared, the next rebuilt `viewportY=0` event was committed as a real top-of-buffer snapshot, even though it was still part of the redraw recovery
  - the fix now preserves a frozen pre-reset snapshot across the recovery window and only completes the transient-reset state after a non-top viewport or bottom-follow has actually been restored
- Added focused unit coverage in `src/renderer/src/utils/terminal-scroll.test.ts` for transient reset detection.
- Added focused unit coverage for deferred transient-reset recovery when the saved marker is gone but the prior viewport should not collapse to the top.
- Added focused unit coverage for frozen pre-reset snapshots and transient-reset completion timing so the logged `writeParsed -> temporary bottom sync -> rebuilt viewportY=0` sequence does not regress.
- Restored native macOS `Cmd+V` by splitting the app menu paste item by platform:
  - macOS now uses Electron's native `role: 'paste'`
  - Windows/Linux keep the custom no-accelerator paste item that avoids double-paste
- Added focused menu regression tests in `src/main/app-menu.test.ts`.
- Verified `bun run build` passes.
- Verified `bun run test src/renderer/src/utils/terminal-scroll.test.ts` passes.
- Verified `bun run test src/main/app-menu.test.ts` passes.
- Rebuilt fresh `1.1.1` macOS package artifacts from the current branch state:
- Bumped the app version to `1.1.2`.
- Rebuilt fresh notarized `1.1.2` macOS package artifacts from the current branch state using `.env` Apple credentials:
  - `dist/knkode-1.1.2-arm64.dmg`
  - `dist/knkode-1.1.2-arm64.dmg.blockmap`
  - `dist/latest-mac.yml`
- Mounted the generated DMG and opened `knkode.app` from `/Volumes/knkode 1.1.2-arm64`.

## Known Gaps
- `bun test` still has pre-existing failures unrelated to this instrumentation:
  - `src/renderer/src/lib/agent-block-parser.test.ts` cannot resolve `./agent-parsers/claude-code`
  - `src/renderer/src/store/index.test.ts` assumes a browser `window` in the current Bun test environment
- No fresh `1.1.2` zip artifact was built in this run because the packaging command was scoped to `--mac dmg --arm64`.

## What To Do Next
- Re-run the logged build in `knktx` and confirm the first pane no longer jumps to the top during streaming agent output.
- If a jump still happens, inspect `~/.knkode/logs/scroll-debug.jsonl` for:
  - `write-parsed-preserved-transient-reset-snapshot`
  - `write-parsed-detected-transient-top-reset`
  - `viewport-scroll-deferred-transient-reset`
  - `viewport-sync-deferred-transient-reset`
  - `viewport-scroll-ignored-transient-reset`
  - `viewport-sync-ignored-transient-reset`
  These should show whether recovery was deferred until the buffer rebuilt far enough, or whether a different path is still corrupting scroll state.
- The separate hidden inactive-workspace resize issue (`rows=1` while invisible) is still present in logs and was not addressed in this fix.
- On macOS, manually verify terminal `Cmd+V` now pastes once and `Cmd+C` still copies selected text.
- If a notarized `1.1.2` zip is also required, rerun packaging with a `zip` target in addition to `dmg`.
