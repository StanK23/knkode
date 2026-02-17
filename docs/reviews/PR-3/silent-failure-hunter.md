# PR #3 Silent Failure Audit: Keyboard Shortcuts & Pane Focus Tracking

## Summary

This PR introduces keyboard shortcuts and pane focus tracking with generally acceptable error handling for new code. However, it contains two must-fix issues: a fire-and-forget async call with no error handling in `App.tsx`, and silent no-ops in `useKeyboardShortcuts.ts` when shortcuts fail to find their target. It also carries forward two pre-existing empty catch blocks (in `Pane.tsx` and `Terminal.tsx`) that should be addressed.

## Must Fix

- **`src/renderer/src/App.tsx:21-29`** -- `handleNewWorkspace` is an `async` function called as a keyboard shortcut handler (`onNewWorkspace`) at line 59 of `useKeyboardShortcuts.ts`. The `await state.createWorkspace(...)` call can reject (IPC failure to `saveWorkspace` or `saveAppState`), but `handleNewWorkspace` has zero error handling. Since it is invoked from a synchronous `keydown` handler, the returned promise is discarded (fire-and-forget), meaning any rejection becomes an unhandled promise rejection. The user presses Cmd+T, nothing happens, no error is shown, and the only signal is a console warning from the runtime about an unhandled rejection.

  ```typescript
  // Current (no error handling):
  const handleNewWorkspace = useCallback(async () => {
      const state = useStore.getState()
      const colorIndex = state.workspaces.length % WORKSPACE_COLORS.length
      await state.createWorkspace(
          `Workspace ${state.workspaces.length + 1}`,
          WORKSPACE_COLORS[colorIndex],
          'single',
      )
  }, [])
  ```

  **Fix:** Wrap the body in try-catch and log the error. Since the keyboard shortcut handler at `useKeyboardShortcuts.ts:59` calls `handlers.onNewWorkspace()` without awaiting, the promise floats. Either add `.catch()` at the call site or add try-catch inside `handleNewWorkspace`.

- **`src/renderer/src/hooks/useKeyboardShortcuts.ts:30-36,38-44,46-55`** -- When `state.focusedPaneId` is null (no pane focused) and the user presses Cmd+D, Cmd+Shift+D, or Cmd+W, the shortcut silently does nothing. `e.preventDefault()` fires (line 31, 39, 47), suppressing the browser/Electron default behavior, but no action occurs and no feedback is given. The user sees their keypress eaten with zero response. This is a silent no-op that will confuse users -- they will press the shortcut repeatedly wondering why nothing happens.

  **Fix:** When `focusedPaneId` is null and a pane-targeting shortcut is pressed, either (a) auto-focus the first pane in the active workspace and proceed, or (b) do not call `e.preventDefault()` so the native behavior is preserved, or (c) provide a visual hint (e.g., flash the pane area) that no pane is focused. Option (a) is the best UX -- fall forward to the first pane.

## Suggestions

- **`src/renderer/src/hooks/useKeyboardShortcuts.ts:86-96`** -- `Number.parseInt(e.key, 10)` on non-numeric keys returns `NaN`, which correctly falls through the `num >= 1 && num <= 9` guard. This is fine, but when a user presses Cmd+5 and there are only 2 panes, the shortcut silently does nothing (line 92: `if (targetId)` fails). Consider providing feedback or simply not calling `e.preventDefault()` when the target pane index exceeds the pane count. Currently `e.preventDefault()` fires at line 88 before the pane count is checked, so native behavior is suppressed even when the shortcut has no effect.

- **`src/renderer/src/hooks/useKeyboardShortcuts.ts:64-83`** -- When `openWorkspaceIds.length < 2` (line 67, 78), the tab-switching shortcuts silently return. `e.preventDefault()` has already been called (line 65, 76), so the native shortcut is eaten. With only one workspace, the user's Cmd+Shift+[ keypress is swallowed silently. Consider not calling `e.preventDefault()` when there is nothing to switch to.

- **`src/renderer/src/components/Terminal.tsx:85-87`** -- `term.textarea?.addEventListener('focus', onTermFocus)` uses optional chaining. If `term.textarea` is null at mount time (which can happen if xterm.js initialization is delayed or fails), the focus listener silently never attaches. The user would then click a terminal, focus tracking would not work for that pane, and keyboard shortcuts (Cmd+D etc.) would target the wrong pane or nothing. This would be extremely confusing to debug. Consider logging a warning if `term.textarea` is null.

- **`src/renderer/src/components/Terminal.tsx:99-103`** -- The `isFocused` effect only runs when `isFocused` changes. If two terminals both have `isFocused=false` and one gets set to `true`, it works. But if a user switches between panes, the *previous* pane's `isFocused` goes from `true` to `false` and the effect fires with `isFocused=false` -- this is fine, it just does nothing. However, if `termRef.current` is null (terminal unmounted or not yet mounted) when `isFocused` becomes `true`, the focus silently fails. No error, no log, no feedback. The user presses Cmd+1 and nothing happens.

- **`src/renderer/src/store/index.ts:399-401,435-437`** -- The `.catch` handlers on `window.api.saveWorkspace(updated)` inside `splitPane` and `closePane` log the error but do not revert the optimistic state update. If the save fails, the UI shows the split/close happened but the persisted state is stale. On next app restart, the pane layout will revert to the pre-split/pre-close state, which will confuse the user ("I closed that pane yesterday, why is it back?"). This is a known pattern across the store, not introduced by this PR, but the new actions copy it. Consider tracking a `saveFailed` flag so the user knows persistence is broken.

- **`src/renderer/src/App.tsx:33-43`** -- The `onSplitVertical`, `onSplitHorizontal`, and `onClosePane` handlers silently no-op when `useStore.getState().workspaces.find(...)` returns undefined (i.e., the pane's workspace is not found). This would indicate a serious state inconsistency, but it passes silently. A `console.error` here would help catch store corruption bugs.

## Nitpicks

- **`src/renderer/src/components/Pane.tsx:44`** -- Pre-existing, not introduced by this PR, but worth noting: `window.api.killPty(paneId).catch(() => {})` is an empty catch block. If killing the PTY fails (e.g., the main process crashed, IPC is broken), there is zero indication. This was flagged in PR #2 review but persists. At minimum, log the error.

- **`src/renderer/src/components/Terminal.tsx:63`** -- Pre-existing: `window.api.writePty(paneId, data).catch(() => {})` is an empty catch block. Every keystroke the user types could silently fail. If the PTY is dead and `writePty` rejects, the user types into the void with no feedback. At minimum, log the error or display a "disconnected" indicator.

- **`src/renderer/src/components/Terminal.tsx:77`** -- Pre-existing: `window.api.resizePty(paneId, cols, rows).catch(() => {})` is another empty catch block. Resize failures would cause visual glitches (content wrapping wrong) with no hint as to why.

- **`src/renderer/src/hooks/useKeyboardShortcuts.ts:22-97`** -- The entire `handler` function has no top-level try-catch. If any handler callback throws (e.g., `handlers.onSplitVertical` throws), the error propagates up to the `keydown` event and is swallowed by the browser event loop. It would appear as an uncaught exception in the console but the user gets no feedback. Consider wrapping the body in a try-catch with a `console.error` to make debugging easier.
