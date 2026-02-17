# Security Audit: PR #3 — Keyboard Shortcuts & Pane Focus Tracking

## Summary

This PR adds keyboard shortcut handling, pane focus tracking, and refactors split/close logic into the Zustand store. The changes are renderer-only and low-risk from a security perspective -- no new IPC channels, no DOM injection, no user-controlled HTML rendering. The code follows existing security patterns (typed preload bridge, no raw `innerHTML`, proper event cleanup). There are no must-fix security issues; findings are limited to suggestions and nitpicks for defense-in-depth hardening.

## Must Fix

None

## Suggestions

- `src/renderer/src/hooks/useKeyboardShortcuts.ts:86` -- `Number.parseInt(e.key, 10)` on arbitrary `KeyboardEvent.key` values: while not exploitable here (result is bounds-checked 1-9 and only used as an array index), consider adding an explicit regex guard (`/^[1-9]$/.test(e.key)`) before parsing. This makes the intent clearer and avoids `parseInt` returning `NaN` on multi-character key names like `F1`, which would pass the `>= 1 && <= 9` check if `NaN` somehow coerced (it does not in practice, but explicit guards are more maintainable).

- `src/renderer/src/hooks/useKeyboardShortcuts.ts:64-82` -- Tab-switching shortcuts call `state.setActiveWorkspace(openWorkspaceIds[prev])` where `prev`/`next` are computed indices. If `openWorkspaceIds` were somehow empty or `indexOf` returned -1 (when `activeWorkspaceId` is not in the array), the fallback logic could pass `undefined` to `setActiveWorkspace`. The `openWorkspaceIds.length < 2` guard helps, but an additional check that the computed index yields a defined value (`if (openWorkspaceIds[prev]) state.setActiveWorkspace(...)`) would add a safety net.

- `src/renderer/src/components/Terminal.tsx:87` -- `term.textarea?.addEventListener('focus', onTermFocus)`: the `textarea` reference is grabbed at effect setup time. If xterm.js re-creates its internal textarea (e.g., during certain addon loads or re-renders), the listener would be attached to a stale element. This is unlikely with current xterm.js behavior but could cause a silent focus-tracking failure. Consider using xterm.js's built-in `term.onFocus` API (available since xterm.js v5) instead of directly accessing the internal textarea DOM element, which is more resilient and does not depend on implementation details.

- `src/renderer/src/store/index.ts:364-405` -- The `splitPane` action performs unbounded recursive tree walking via `replaceInTree`. With a deeply nested layout tree (e.g., a user rapidly splitting dozens of times), this could hit stack depth limits. While not a security vulnerability per se, it is a denial-of-service vector for the renderer process. Consider adding a maximum split depth guard (e.g., reject splits beyond depth 10-15).

## Nitpicks

- `src/renderer/src/hooks/useKeyboardShortcuts.ts:23` -- `const isMod = e.metaKey || e.ctrlKey`: on macOS, `ctrlKey` means the physical Control key, which may conflict with terminal control sequences (Ctrl+D sends EOF, Ctrl+W sends word-delete). Since this is an Electron app primarily targeting macOS (evidenced by `Cmd+` labeling throughout), consider using only `e.metaKey` on macOS and only `e.ctrlKey` on other platforms. Otherwise, pressing Ctrl+W in the terminal to delete a word backward will also trigger the close-pane shortcut, intercepting the terminal input.

- `src/renderer/src/store/index.ts:399` -- `window.api.saveWorkspace(updated).catch(...)` is fire-and-forget inside a synchronous `set()` callback. If the save fails, the in-memory state diverges from persisted state silently. This is an existing pattern in the codebase (not introduced by this PR), but the new `splitPane`/`closePane` actions increase the surface area. Consider a centralized save-failure handler that surfaces errors to the user or retries.

- `src/renderer/src/components/Terminal.tsx:96` -- The `useEffect` dependency array includes `onFocus`, which means the entire terminal will be torn down and re-created if the `onFocus` callback identity changes. The `handleFocus` in `Pane.tsx:61` is memoized with `useCallback`, so this should be stable in practice, but it is fragile -- any change to the memoization dependencies would cause unnecessary terminal remounts. Consider using a ref for the `onFocus` callback inside the effect to decouple terminal lifecycle from callback identity.

- `src/renderer/src/components/Terminal.tsx:99-103` -- The `isFocused` effect calls `termRef.current.focus()` but does not include `paneId` in its dependency array. If the component were ever reused with a different `paneId` (it is not currently), the focus behavior could be stale. Minor, but worth noting for future-proofing.

- `src/renderer/src/App.tsx:79` -- `{initError}` is rendered directly into JSX. React's JSX escapes strings by default so this is safe (no XSS), but the error string originates from `String(err)` in the store init, which could contain verbose stack traces or internal paths. Consider truncating or sanitizing error display for production builds.
