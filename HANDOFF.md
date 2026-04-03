# Handoff

## Current State

**Version**: 2.3.0 | **Branch**: `investigate/windows-tui-input-lag` | **Open PRs**: [#80](https://github.com/knkenko/knkode/pull/80)

PR #80 now contains the Windows TUI input-lag reduction work plus follow-up fixes for terminal focus retention and pane-toolbar button regressions. The branch is verified locally with typecheck and targeted tests. The remaining step is manual validation on the affected Windows machine.

## Recently Completed

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

## What’s Next

1. Reproduce on the affected Windows machine and compare typing latency while Claude/Codex stream output.
2. If more evidence is needed, enable:
   - frontend logging: `localStorage.setItem("knkode:debug-terminal-perf", "1")`
   - backend logging: launch with `KNKODE_DEBUG_TERMINAL_PERF=1`
3. Validate that launching a TUI and switching back to an already-selected pane restores keyboard focus without requiring a click.
4. Validate that quick commands and session history buttons work normally again after the focus changes.
5. If the manual pass looks good, merge PR #80.

## Important Decisions

- All pane visual effects remain enabled; the fix targets redraw cost rather than reducing visual quality.
- Incremental redraw is limited to image-free snapshots because terminal image slices are the riskiest case for stale pixels.
- Interaction-driven redraws still force full repaint so selection and hover correctness stays simple.
- Runtime scroll blitting stays disabled until there is a proven corruption-free implementation; the helper can still model blit plans in tests, but the live renderer does not use them.
