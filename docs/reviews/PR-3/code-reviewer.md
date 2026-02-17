# PR #3 Code Review: feat: keyboard shortcuts & pane focus tracking

## Summary

This PR adds global keyboard shortcuts (Cmd+D/Shift+D for split, Cmd+W for close, Cmd+T for new workspace, Cmd+Shift+[/] for tab switch, Cmd+1-9 for pane focus) and pane focus tracking with a visual accent-border indicator. The split/close logic is cleanly lifted from PaneArea into the Zustand store (DRY win). Overall a solid PR with a few correctness issues to address.

## Must Fix

- **`src/renderer/src/components/Terminal.tsx:96`** -- Adding `onFocus` to the dependency array of the terminal mount effect causes the entire xterm instance to be destroyed and recreated whenever `onFocus` identity changes. Although `Pane` wraps it in `useCallback`, any parent re-render that changes `onFocus`'s identity (e.g. if `setFocusedPane` from Zustand ever returns a new reference) will tear down the terminal, kill the PTY data listeners, and flash the UI. The `onFocus` callback should be read from a ref instead of included in the dependency array, matching the existing pattern where `paneId` is the only mount trigger.

- **`src/renderer/src/components/Terminal.tsx:99-103`** -- The focus effect depends only on `[isFocused]`, not `[isFocused, paneId]`. This means if you focus pane A, then split and the new pane B receives `isFocused=true` on mount, it will correctly focus. But if pane A is already focused (`isFocused` stays `true`) and the user clicks away then clicks back (without `isFocused` toggling to `false` in between), the effect will not re-fire. More critically, the effect has no way to re-trigger focus for an already-focused pane after an action like Cmd+1 pressed twice on the same pane. The `isFocused` boolean is not sufficient as a trigger when the value does not change. Consider using a `focusGeneration` counter or calling `termRef.current.focus()` imperatively from the shortcut handler.

- **`src/renderer/src/hooks/useKeyboardShortcuts.ts:46-55`** -- `Cmd+W` calls `e.preventDefault()` unconditionally, even when the focused pane is the last pane (paneCount === 1) or when `focusedPaneId` is null. This prevents the browser/Electron default for Cmd+W (close window) without performing any action. When there is only one pane or no focused pane, the shortcut should not call `preventDefault()` so the default Electron close-window behavior can proceed.

## Suggestions

- **`src/renderer/src/App.tsx:21-29` / `src/renderer/src/components/TabBar.tsx:35-42`** -- `handleNewWorkspace` in App.tsx duplicates the logic in TabBar.tsx. Both compute a color index and call `createWorkspace` with the same pattern. This violates the DRY rule. Consider extracting this into a single store action (e.g. `createDefaultWorkspace()`) or a shared utility, so both the keyboard shortcut and the tab bar button call the same code.

- **`src/renderer/src/hooks/useKeyboardShortcuts.ts:30-44`** -- The split/close handlers inside the hook already look up `activeWs` to verify the pane belongs to it, but the `shortcutHandlers` in App.tsx (lines 33-43) do a second workspace lookup via `useStore.getState().workspaces.find(...)`. This is redundant work -- the hook already has `activeWs` and could pass the workspace ID to the handlers, or the handlers could trust that the hook only calls them with valid pane IDs from the active workspace. Simplifying would reduce both code and risk of stale-data divergence.

- **`src/renderer/src/store/index.ts:364-405`** -- `splitPane` does not update `focusedPaneId` to the newly created pane. After splitting, the user likely expects focus to move to the new terminal. Consider setting `focusedPaneId: newPaneId` in the returned state.

- **`src/renderer/src/hooks/useKeyboardShortcuts.ts:64,75`** -- The bracket-key detection uses `e.key === '{'` and `e.key === '}'` as alternatives to `e.key === '[' && e.shiftKey`. On macOS with US keyboard layout, Cmd+Shift+[ produces `e.key === '{'`, so the first condition catches it. The fallback (`e.key === '['`) may never fire and adds dead-code confusion. Consider testing on non-US layouts or simplifying to just use `e.code === 'BracketLeft'` / `e.code === 'BracketRight'` with a shift-key check, which is layout-independent.

## Nitpicks

- **`src/renderer/src/components/Pane.tsx:67`** -- The focus indicator uses inline styles merging with `paneContainerStyle`. This 2px border-top appearing/disappearing causes a small layout shift (or reserves 2px of space permanently via `transparent`). This is fine functionally but worth noting -- if you later notice a 2px gap at the top of unfocused panes, this is why.

- **`src/renderer/src/hooks/useKeyboardShortcuts.ts:23`** -- `e.metaKey || e.ctrlKey` means Ctrl+D, Ctrl+W, etc. will also trigger on macOS. This is usually fine for cross-platform consistency, but Ctrl+D in a terminal sends EOF and Ctrl+W deletes a word. Since these events are caught at the window level before reaching xterm, the terminal will never receive these Ctrl sequences. If you intend to support Ctrl+D as EOF in the terminal, you may want to only bind `metaKey` on macOS and `ctrlKey` on Windows/Linux.

- **`src/renderer/src/hooks/useKeyboardShortcuts.ts:86`** -- `Number.parseInt(e.key, 10)` returns `NaN` for non-numeric keys. The subsequent `num >= 1 && num <= 9` check correctly filters `NaN`, but using `Number.parseInt` for single-character digit detection is slightly roundabout. A direct `e.key >= '1' && e.key <= '9'` check followed by `Number(e.key)` would be marginally clearer.
