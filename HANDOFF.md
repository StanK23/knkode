# Handoff

## Current State

**Version**: 2.3.1 | **Branch**: `fix/codex-resize-redraw-history-loss` | **Open PRs**: none

PR #80 is merged into `main`. Current work is implemented on `fix/codex-resize-redraw-history-loss` and is ready to be committed/pushed as the next PR.

## Recently Completed

### Codex resize redraw history loss

Implemented on `fix/codex-resize-redraw-history-loss`.

Included:
1. **Fresh post-resize snapshots** — `resize_pty` now returns a new `GridSnapshot` at the current scroll offset immediately after PTY/terminal geometry changes, instead of returning only success/failure.
2. **Immediate pane snapshot install** — `Pane.handleResize()` now applies that returned snapshot right away, updates scroll refs, and replaces any stale pending snapshot so Codex panes do not stay stuck on clipped pre-resize content.
3. **No stale redraw after real geometry changes** — `CanvasTerminal` no longer repaints stale pre-resize rows into the resized canvas. On a real geometry change it now clears/invalidates and waits for the fresh snapshot.
4. **Reduced resize artifact window** — canvas resize debounce was reduced from `100ms` to `16ms` to cut the visible stale-bitmap shrink/stretch effect during live resize.
5. **Regression coverage** — added `src/components/CanvasTerminal.resize.test.tsx` to pin the geometry-changing resize invalidation behavior, and updated the existing focus test harness so the canvas tests run cleanly under `bun x vitest`.

Verified locally:
- `bun x vitest run`
- `bun x tsc --noEmit`
- `cargo check --manifest-path src-tauri/Cargo.toml`

### Windows TUI input-lag reduction

Implemented on `investigate/windows-tui-input-lag`.

Included:
1. **Lower terminal snapshot cadence** — reduced Rust PTY snapshot throttling from ~60fps to ~30fps by changing `RENDER_INTERVAL` from `16ms` to `33ms`.
2. **Incremental canvas redraws** — added viewport diffing so streaming terminal updates repaint only changed rows instead of clearing and redrawing the entire visible grid on every snapshot.
3. **No runtime scroll blitting** — the experimental bitmap blit path caused visual corruption during TUI scrolling, so runtime now keeps blitting disabled and falls back to safe redraw behavior for shifted viewports.
4. **Safe fallbacks** — selection-heavy states, link-hover redraws, and image-bearing snapshots still force full redraws so behavior stays correct while the hot path is reduced.
5. **Opt-in perf instrumentation** — added frontend draw logging behind `localStorage["knkode:debug-terminal-perf"]="1"` and backend snapshot logging behind `KNKODE_DEBUG_TERMINAL_PERF=1`.
6. **Regression coverage** — added `src/utils/terminal-render.test.ts` for row-diff/runtime-no-blit decisions and a Rust unit test asserting the 30fps render interval.

### Terminal focus retention

Verified locally:
- `bunx tsc --noEmit`
- `bun run test -- src/components/CanvasTerminal.focus.test.tsx src/utils/terminal-render.test.ts src/utils/terminal-background.test.ts src/utils/pane-spawn.test.ts`
- `cargo test --manifest-path src-tauri/Cargo.toml`

Implemented on `investigate/windows-tui-input-lag`.

Included:
1. **Launch-time focus restore** — the terminal container now takes DOM focus when a pane mounts in the focused state, so starting Claude/Codex/Gemini no longer requires a follow-up click before typing.
2. **Same-pane re-focus support** — pane focus now propagates the store’s monotonic `focusGeneration` token through `PaneArea` and `Pane`, so re-selecting an already highlighted pane re-focuses the active TUI.
3. **Focused regression coverage** — added `src/components/CanvasTerminal.focus.test.tsx` to pin both mount-time focus and same-pane re-focus behavior.

### Pane toolbar button regression

Implemented on `investigate/windows-tui-input-lag`.

Included:
1. **Interactive-target guard on pane mouse focus** — pane-level `onMouseDown` no longer re-focuses the terminal when the user clicks toolbar controls such as quick commands, session history, close, or split buttons.
2. **Header drag guard for toolbar controls** — the pane-header drag/focus handler now ignores interactive targets too, so toolbar clicks are not intercepted by drag startup or terminal refocus.
3. **Preserved TUI focus behavior** — clicks on pane body/background still restore terminal keyboard focus, so the TUI fix remains intact without swallowing toolbar clicks.

### Session-history resume focus restore

Implemented on `investigate/windows-tui-input-lag`.

Included:
1. **Post-resume pane refocus** — after resuming a session from the history modal, the app now re-focuses the target pane on the next animation frame once the modal has closed.
2. **Consistent terminal activation** — restoring Claude/Codex/Gemini sessions from history now returns keyboard focus to the terminal without requiring an extra click.

## What’s Next

1. Commit, push, and open the PR from `fix/codex-resize-redraw-history-loss`.
2. Manually validate on the affected machine:
   - resize a Codex pane narrower and shorter repeatedly
   - confirm the newest visible output remains visible after resize
   - confirm the stale shrink/stretch artifact no longer sticks until later output
3. Verify scrolled-up panes still preserve scrollback position across resize.
4. Verify normal shell panes still repaint correctly after resize.
5. If any remaining resize issue appears, check whether it is a secondary wrap/reflow problem rather than the stale-snapshot bug fixed here.

## Important Decisions

- All pane visual effects remain enabled; the fix targets redraw cost rather than reducing visual quality.
- Incremental redraw is limited to image-free snapshots because terminal image slices are the riskiest case for stale pixels.
- Interaction-driven redraws still force full repaint so selection and hover correctness stays simple.
- Runtime scroll blitting stays disabled until there is a proven corruption-free implementation; the helper can still model blit plans in tests, but the live renderer does not use them.
