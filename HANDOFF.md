# Handoff

## Current State

**Version**: 2.3.0 | **Branch**: `investigate/windows-tui-input-lag` | **Open PRs**: none

The Windows TUI input-lag reduction work is implemented locally on this branch and verified with typecheck plus targeted tests. The remaining step is manual validation on the affected Windows machine before opening a PR.

## Recently Completed

### Windows TUI input-lag reduction

Implemented on `investigate/windows-tui-input-lag`.

Included:
1. **Lower terminal snapshot cadence** — reduced Rust PTY snapshot throttling from ~60fps to ~30fps by changing `RENDER_INTERVAL` from `16ms` to `33ms`.
2. **Incremental canvas redraws** — added viewport diffing so streaming terminal updates repaint only changed rows instead of clearing and redrawing the entire visible grid on every snapshot.
3. **Scroll blit fast-path** — when output or user scrolling shifts the viewport by whole rows, the canvas now reuses the existing bitmap and redraws only the newly exposed rows.
4. **Safe fallbacks** — selection-heavy states, link-hover redraws, and image-bearing snapshots still force full redraws so behavior stays correct while the hot path is reduced.
5. **Opt-in perf instrumentation** — added frontend draw logging behind `localStorage["knkode:debug-terminal-perf"]="1"` and backend snapshot logging behind `KNKODE_DEBUG_TERMINAL_PERF=1`.
6. **Regression coverage** — added `src/utils/terminal-render.test.ts` for row-diff/blit decisions and a Rust unit test asserting the 30fps render interval.

Verified locally:
- `bunx tsc --noEmit`
- `bun run test -- src/utils/terminal-render.test.ts src/utils/terminal-background.test.ts src/utils/pane-spawn.test.ts`
- `cargo test --manifest-path src-tauri/Cargo.toml`

## What’s Next

1. Reproduce on the affected Windows machine and compare typing latency while Claude/Codex stream output.
2. If more evidence is needed, enable:
   - frontend logging: `localStorage.setItem("knkode:debug-terminal-perf", "1")`
   - backend logging: launch with `KNKODE_DEBUG_TERMINAL_PERF=1`
3. If the manual pass looks good, open a PR from `investigate/windows-tui-input-lag`.

## Important Decisions

- All pane visual effects remain enabled; the fix targets redraw cost rather than reducing visual quality.
- Incremental redraw is limited to image-free snapshots because terminal image slices are the riskiest case for stale pixels.
- Interaction-driven redraws still force full repaint so selection and hover correctness stays simple.
