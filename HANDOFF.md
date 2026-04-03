# Handoff

## Current State

**Version**: 2.3.0 | **Branch**: `fix/alt-screen-and-scrollback` | **Open PRs**: none

Local implementation is complete for the terminal alt-screen/rendering investigation. The branch now contains the bug fix, targeted tests, and handoff updates, but no PR has been opened yet.

## In Progress

### Terminal alt-screen rendering and scrollback fix

Implemented:
1. **Real scrollback wiring** — threaded pane/theme scrollback through the PTY creation path into Rust `PaneTermConfig`, and implemented `scrollback_size()` so the terminal engine uses the configured value.
2. **Higher default scrollback** — raised `DEFAULT_SCROLLBACK` from `5000` to `50000`.
3. **Alt-screen background fix** — default-background cells are now painted opaquely on the alternate screen while normal-screen default backgrounds remain transparent.
4. **Restart-path consistency** — pane restarts from both the pane body and sidebar context menu now reuse the effective merged scrollback value.
5. **Regression coverage** — added frontend tests for spawn-config/background decisions and a Rust unit test for configured scrollback reporting.

Verified locally:
- `bunx tsc --noEmit`
- `bun run test -- src/utils/pane-spawn.test.ts src/utils/terminal-background.test.ts`
- `cargo test --manifest-path src-tauri/Cargo.toml pane_term_config_reports_configured_scrollback`

## What’s Next

1. Manually verify Codex and Claude panes in the app, especially alt-screen redraws during streaming output and context compaction.
2. Open the PR from `fix/alt-screen-and-scrollback` if manual verification matches the intended behavior.

## Important Decisions

- Normal-screen default-background cells remain transparent so pane background effects are preserved.
- Alternate-screen default-background cells must be painted opaquely because TUIs expect a fully owned framebuffer.
- Scrollback remains a user/theme setting, but it is now enforced by the Rust terminal configuration rather than only persisted in app config.
