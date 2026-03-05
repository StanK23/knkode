# PR #60 Security Audit: Alt Screen Buffer Detection

## Summary

This PR adds client-side tracking of which terminal panes are in alternate screen buffer mode (e.g., vim, htop). The changes are minimal, well-scoped, and confined to renderer-side Zustand state management with no IPC, no DOM injection, and no user-controlled string interpolation. No security vulnerabilities were found.

## Must Fix

None

## Suggestions

- `src/renderer/src/store/index.ts:368-374` (`killPtys`): A new `Set` is always cloned from `altScreenPaneIds` even when no pane in the kill list is in alt screen mode. While not a security issue, this mirrors the same unconditional-clone pattern already present for `paneAgentTypes` and `paneProcessNames`. If a future consumer subscribes to `altScreenPaneIds` for rendering, unnecessary reference changes could cause spurious re-renders. Consider guarding the clone with a check (e.g., only create `altIds` if any killed pane is actually in the set). Same applies to `removePtyId` at lines 385-393.

## Nitpicks

- `src/renderer/src/components/Terminal.tsx:333-335`: The `onBufferChange` disposable is not explicitly stored in `CachedTerminal`, unlike `removeDataListener` and `removeExitListener`. This is safe because `term.dispose()` cleans up all xterm.js event subscriptions, and `onResize`/`onData` (line 287, 326) follow the same implicit-dispose pattern. However, for consistency and defensive coding, consider storing the disposable and calling it in `disposeTerminal`. This would protect against a hypothetical future change where disposal order matters or where the terminal is partially cleaned up.
