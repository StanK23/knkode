# Frontend Design Review — PR #3: Keyboard Shortcuts & Pane Focus Tracking

## Summary

Solid implementation of keyboard shortcuts and focus tracking with good DRY refactoring (split/close logic lifted to store). The main concerns are a terminal remount bug caused by `onFocus` in the effect dependency array, a missing focus indicator on initial load, and layout shift from the border-based focus indicator.

## Must Fix

- **`src/renderer/src/components/Terminal.tsx:96`** — `onFocus` is in the dependency array of the terminal mount `useEffect`. Because `onFocus` is derived from `handleFocus` in `Pane.tsx` (which is a `useCallback` depending on `onFocus` prop + `paneId`), if the parent's `onFocus` reference ever changes (e.g. store selector identity shift), the entire terminal gets torn down and re-created — killing the PTY session and losing scrollback. Fix: remove `onFocus` from the dependency array and use a ref to hold the latest callback, e.g.:
  ```ts
  const onFocusRef = useRef(onFocus)
  onFocusRef.current = onFocus
  // inside the effect:
  const onTermFocus = () => onFocusRef.current()
  ```

- **`src/renderer/src/components/Terminal.tsx:99-103`** — The `isFocused` effect calls `termRef.current.focus()` but only depends on `[isFocused]`. When splitting a pane (Cmd+D), the new pane is created but `focusedPaneId` is never updated to point to the new pane — so the user must manually click to focus it. After `splitPane` in the store, `focusedPaneId` should be set to the new pane's ID so the cursor lands there automatically. This requires `splitPane` in `store/index.ts:364` to also set `focusedPaneId: newPaneId`.

- **`src/renderer/src/components/Pane.tsx:67`** — The focus indicator uses `borderTop: '2px solid var(--accent)'` vs `'2px solid transparent'`. This is fine for avoiding layout shift (both always 2px), but the 2px top border eats into the pane's usable space unconditionally. Since `paneContainerStyle` has no `boxSizing: 'border-box'` override and the global reset sets `box-sizing: border-box`, this means the terminal area shrinks by 2px. This is acceptable in isolation, but the border overlaps with the `paneHeaderStyle` bottom border (1px solid), creating a 3px visual stack at the boundary. Use `outline` or `box-shadow` instead to avoid stacking:
  ```ts
  boxShadow: isFocused ? 'inset 0 2px 0 var(--accent)' : 'none'
  ```
  This avoids consuming layout space entirely and eliminates the stacking artifact.

## Suggestions

- **`src/renderer/src/hooks/useKeyboardShortcuts.ts:23`** — `isMod = e.metaKey || e.ctrlKey` means on macOS, Ctrl+D (which is typically "send EOF to terminal") gets intercepted and triggers a split instead of reaching the PTY. This breaks a fundamental terminal interaction. The hook should distinguish platforms: use `metaKey` on macOS and `ctrlKey` on Windows/Linux. Detect platform via `navigator.platform` or `process.platform` (available in Electron renderer with nodeIntegration or via preload).

- **`src/renderer/src/hooks/useKeyboardShortcuts.ts:46-55`** — Cmd+W closes only panes, not workspace tabs. Users coming from any browser or terminal emulator (iTerm, VS Code) expect Cmd+W to close the current tab when there is only one pane. Currently it silently does nothing when `paneCount <= 1`. Consider either: (a) closing the workspace tab when only one pane remains, or (b) showing a brief flash/toast to communicate "cannot close last pane."

- **`src/renderer/src/store/index.ts:216`** — `setFocusedPane` has no validation. Calling `setFocusedPane('nonexistent-id')` sets an invalid focus. Add a guard that the pane actually exists in the active workspace before setting, or at minimum clear `focusedPaneId` when switching workspaces (`setActiveWorkspace` at line 313 should reset `focusedPaneId: null`).

- **`src/renderer/src/App.tsx:33-43`** — The `shortcutHandlers` object computes `useStore.getState().workspaces.find(...)` inside each handler to locate the workspace for a given paneId. This linear scan runs on every shortcut invocation. It works fine with a handful of workspaces, but it is also redundant: the shortcut hook already looks up `activeWs` (line 28 of the hook). Consider passing the workspace ID through from the hook instead of re-deriving it in the handler.

- **`src/renderer/src/App.tsx:21-29`** — `handleNewWorkspace` is duplicated from `TabBar.tsx:35-42`. Both compute `workspaces.length % WORKSPACE_COLORS.length` and call `createWorkspace` with the same args. Extract this into a store action (e.g. `createDefaultWorkspace`) to avoid the duplication.

- **`src/renderer/src/components/Pane.tsx:67`** — The focus indicator only appears on the top edge. For horizontally-split panes stacked side by side, a top-only accent is less visible because it blends with the header background. Consider using a left-edge accent for horizontal splits or a full-perimeter subtle glow:
  ```ts
  boxShadow: isFocused ? '0 0 0 1px var(--accent)' : 'none'
  ```

## Nitpicks

- **`src/renderer/src/hooks/useKeyboardShortcuts.ts:64,75`** — The bracket matching checks both `e.key === '{'` and `(e.key === '[' && e.shiftKey)`. On most US keyboard layouts Shift+`[` produces `{`, so `e.key` will be `{` and the second condition is unreachable. On non-US layouts (e.g. German, French) the keys are entirely different. The current approach works for US layout but is fragile for internationalization. Document this limitation or use `e.code` (e.g. `e.code === 'BracketLeft'` with `e.shiftKey`) for layout-independent matching.

- **`src/renderer/src/components/TabBar.tsx:66`** — The tooltip `"New workspace (Cmd+T)"` hardcodes "Cmd" which is macOS-only. On Windows/Linux it should read "Ctrl+T". Same issue in `Pane.tsx:87,95,104`. Use a helper like `const mod = navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'` and interpolate it.

- **`src/renderer/src/store/index.ts:490-494`** — `getPaneIdsInOrder` is defined as a plain function after the store `create()` call but exported alongside store utilities. Since it is a pure utility operating on `LayoutNode`, it would be cleaner living in `shared/types.ts` alongside `isLayoutBranch`.

- **`src/renderer/src/components/PaneArea.tsx:58`** — `onFocus={setFocusedPane}` passes the store action directly as a prop. This works because `setFocusedPane` accepts `string | null` and `onFocus` in `Pane` expects `(paneId: string) => void`. The type mismatch (`string | null` vs `string`) is not caught because the prop signature is narrower — it is safe at runtime but could confuse future readers. A thin wrapper `(id: string) => setFocusedPane(id)` would make the intent explicit.
