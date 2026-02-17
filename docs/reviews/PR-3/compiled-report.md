# PR #3 Compiled Review — Keyboard Shortcuts & Pane Focus Tracking

**8 files changed, 9 agents ran** (code-reviewer, security-auditor, silent-failure-hunter, code-simplifier, dry-reuse, comment-analyzer, type-design, frontend-design, typescript-pro)

---

## Must Fix (7 items)

### MF-1: Terminal remount risk — onFocus in mount effect deps
`src/renderer/src/components/Terminal.tsx:96`
[code-reviewer, frontend-design, typescript-pro, code-simplifier, security-auditor]

Adding `onFocus` to the terminal mount effect dependency array means the entire xterm instance, PTY listeners, and resize observer are torn down and re-created if the callback identity changes. Although `Pane.tsx` wraps it in `useCallback`, this is fragile. **Fix:** Use a ref for `onFocus` (like `themeRef` already used for theme), remove from deps array.

### MF-2: isFocused boolean can't re-trigger focus
`src/renderer/src/components/Terminal.tsx:99-103`
[code-reviewer, typescript-pro, type-design, frontend-design]

The `useEffect([isFocused])` won't re-fire when pane A is already focused and user presses Cmd+1 again (value stays `true`). Also, after `splitPane`, `focusedPaneId` is never set to the new pane. **Fix:** Replace `isFocused: boolean` with `focusGeneration: number` (incremented on each focus request), and have `splitPane` set `focusedPaneId` to the new pane.

### MF-3: Silent no-ops + preventDefault when no focused pane
`src/renderer/src/hooks/useKeyboardShortcuts.ts:30-55`
[code-reviewer, silent-failure-hunter]

When `focusedPaneId` is null, Cmd+D/Shift+D/W call `preventDefault()` but do nothing. This swallows the Electron default (Cmd+W = close window) with zero feedback. **Fix:** Auto-focus the first pane in the active workspace when no pane is focused; only call `preventDefault()` when the shortcut will actually do something.

### MF-4: handleNewWorkspace unhandled promise rejection
`src/renderer/src/App.tsx:21-29`
[silent-failure-hunter]

`handleNewWorkspace` is async but called as a keyboard shortcut handler (fire-and-forget). If `createWorkspace` rejects, the promise floats as an unhandled rejection. **Fix:** Wrap in try-catch with console.error.

### MF-5: Duplicate handleNewWorkspace logic
`src/renderer/src/App.tsx:21-29` / `src/renderer/src/components/TabBar.tsx:35-42`
[dry-reuse, code-simplifier, code-reviewer, frontend-design]

Both compute `colorIndex = count % WORKSPACE_COLORS.length` and call `createWorkspace("Workspace N+1", color, 'single')`. **Fix:** Extract a `createDefaultWorkspace()` store action.

### MF-6: Tab switching bypasses handlers contract
`src/renderer/src/hooks/useKeyboardShortcuts.ts:64-82`
[type-design]

Tab-switching shortcuts call `state.setActiveWorkspace()` directly instead of routing through the handlers object. Every other action delegates to `handlers.*`. **Fix:** Route through handlers or call store directly for all shortcuts (remove the handlers indirection entirely since the hook already accesses the store).

### MF-7: Focus indicator border stacking
`src/renderer/src/components/Pane.tsx:67`
[frontend-design]

The `borderTop: 2px` stacks with the header's 1px bottom border, creating a 3px visual artifact. **Fix:** Use `boxShadow: isFocused ? 'inset 0 2px 0 var(--accent)' : 'none'` instead.

---

## Suggestions (14 items)

### S-1: Platform-aware modifier key
`src/renderer/src/hooks/useKeyboardShortcuts.ts:23`
[code-reviewer, security-auditor, frontend-design, comment-analyzer]

`e.metaKey || e.ctrlKey` on macOS means Ctrl+D (terminal EOF), Ctrl+W (delete word) are intercepted. Use only `metaKey` on macOS, `ctrlKey` on Windows/Linux.

### S-2: splitPane should focus new pane
`src/renderer/src/store/index.ts:364-405`
[code-reviewer, type-design, frontend-design]

After splitting, set `focusedPaneId: newPaneId` so focus moves to the new terminal.

### S-3: Simplify shortcut hook — remove handlers indirection
`src/renderer/src/App.tsx:31-51` + `useKeyboardShortcuts.ts`
[code-simplifier, dry-reuse, code-reviewer, frontend-design]

The hook already calls `useStore.getState()` internally. The `shortcutHandlers` useMemo in App.tsx adds redundant workspace lookups (4x `find()`). Refactor the hook to call store actions directly, eliminating the handlers parameter.

### S-4: DRY tab-switching logic
`src/renderer/src/hooks/useKeyboardShortcuts.ts:63-83`
[code-simplifier, dry-reuse]

Previous-tab and next-tab blocks are nearly identical. Extract a `cycleTab(delta)` helper.

### S-5: DRY split handler blocks
`src/renderer/src/hooks/useKeyboardShortcuts.ts:30-44`
[code-simplifier, dry-reuse]

Split vertical and horizontal blocks are structurally identical. Merge into one with direction from `e.shiftKey`.

### S-6: Extract focused pane guard variable
`src/renderer/src/hooks/useKeyboardShortcuts.ts:32,40,50`
[dry-reuse]

`state.focusedPaneId && activeWs?.panes[state.focusedPaneId]` repeated 3 times. Extract to a local variable.

### S-7: Use term.onFocus API instead of textarea listener
`src/renderer/src/components/Terminal.tsx:87`
[security-auditor, silent-failure-hunter]

`term.textarea?.addEventListener` relies on xterm internals. Use `term.onFocus` (xterm.js v5+ built-in API) for resilience.

### S-8: Extract mutateWorkspace helper in store
`src/renderer/src/store/index.ts:364-483`
[dry-reuse, code-simplifier]

`splitPane`, `closePane`, `updatePaneConfig`, `updatePaneCwd` all share the find-workspace/mutate/save/map-back pattern. Extract a private helper.

### S-9: Clear focusedPaneId on workspace switch
`src/renderer/src/store/index.ts:216,313`
[frontend-design, type-design]

`setFocusedPane` has no validation; `setActiveWorkspace` doesn't reset focus. Stale focus IDs can reference panes from another workspace.

### S-10: Extract named KeyboardShortcutHandlers interface
`src/renderer/src/hooks/useKeyboardShortcuts.ts:14-19`
[type-design, typescript-pro, code-simplifier]

The inline handler type should be a named, exported interface for reuse and documentation.

### S-11: Restore comments lost in DRY refactor
`src/renderer/src/store/index.ts:362-436`
[comment-analyzer]

`replaceInTree` and `removeFromTree` previously had descriptive comments in PaneArea.tsx. They were dropped during the move to the store.

### S-12: Don't preventDefault when shortcut is a no-op
`src/renderer/src/hooks/useKeyboardShortcuts.ts:64-96`
[silent-failure-hunter]

Tab-switch with < 2 workspaces, and Cmd+N for non-existent pane index, both call `preventDefault()` before discovering there's nothing to do. Move `preventDefault()` after validation.

### S-13: Add console.error for workspace-not-found
`src/renderer/src/App.tsx:33-43`
[silent-failure-hunter]

The `onSplit*`/`onClosePane` handlers silently no-op when workspace lookup fails.

### S-14: Use SplitDirection type alias in PaneArea
`src/renderer/src/components/PaneArea.tsx:29`
[type-design]

Inline `'horizontal' | 'vertical'` should use the named `SplitDirection` alias.

---

## Nitpicks (9 items)

- **N-1** `useKeyboardShortcuts.ts:64,75` — Add comment explaining why both `{`/`}` and `[`+shiftKey are checked (US vs non-US layouts) [code-simplifier, comment-analyzer, typescript-pro, frontend-design]
- **N-2** `Pane.tsx:87,93,104` / `TabBar.tsx:66` — Hardcoded "Cmd" in tooltips; should use platform-aware modifier string [comment-analyzer, frontend-design]
- **N-3** `useKeyboardShortcuts.ts:38` — Redundant `e.shiftKey` + `e.key==='D'` (Shift always produces uppercase) [code-simplifier, type-design]
- **N-4** `useKeyboardShortcuts.ts:86` — `Number.parseInt(e.key, 10)` → simpler `e.key >= '1' && e.key <= '9'` [code-reviewer, security-auditor, typescript-pro]
- **N-5** `Pane.tsx:67` / `Terminal.tsx` — Extract focused/unfocused style objects to avoid new object per render [code-simplifier, typescript-pro]
- **N-6** `useKeyboardShortcuts.ts:68` — `activeWorkspaceId ?? ''` implicit fallback; use explicit early return if null [type-design]
- **N-7** `store/index.ts:490` — `getPaneIdsInOrder` could live in `shared/types.ts` [frontend-design, typescript-pro]
- **N-8** `PaneArea.tsx:4` — Use `import type` for PaneConfig [code-simplifier]
- **N-9** `Terminal.tsx:99` / `Terminal.tsx:84` — Misleading comments say "keyboard shortcut" but focus also comes from click [comment-analyzer]
