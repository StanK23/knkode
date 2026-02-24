# Security Audit: PR #48 — fix: terminal scroll jump on resize or TUI redraw

## Summary

This PR modifies the `ResizeObserver` callback in `Terminal.tsx` to deduplicate spurious resize events, skip scroll management for alternate screen buffers (TUI mode), and switch from ratio-based to distance-from-bottom scroll restoration. All changes are confined to renderer-side DOM/xterm.js logic with no new IPC calls, no new external data handling, and no changes to the security boundary. No security issues found.

## Must Fix

None

## Suggestions

None

## Nitpicks

- `src/renderer/src/components/Terminal.tsx:279-280` — The `lastWidth` and `lastHeight` closure variables are initialized to `0`, meaning the very first resize event will always pass the deduplication check even if the container has zero dimensions. This is functionally harmless (the `clientWidth` guard on line 291 catches zero-width containers), but initializing from the observed element's current dimensions at creation time would be marginally more precise.
