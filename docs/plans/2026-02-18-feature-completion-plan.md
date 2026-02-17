# Feature Completion — Implementation Plan

**Design doc:** docs/plans/2026-02-18-feature-completion-design.md
**Created:** 2026-02-18

## Tasks

### Task 1: PTY lifecycle — lazy loading & tab persistence
- **Branch:** `feature/pty-lifecycle`
- **PR title:** feat: PTY lifecycle — lazy tab loading & terminal persistence
- **Scope:** Store, App.tsx
- **Details:**
  - Add `visitedWorkspaceIds: string[]` to store state
  - Update `setActiveWorkspace` to add workspace id to visitedWorkspaceIds
  - Update `closeWorkspaceTab` to remove workspace id from visitedWorkspaceIds
  - On `init`, auto-add activeWorkspaceId to visitedWorkspaceIds
  - Refactor App.tsx to render PaneArea for all visited workspaces with CSS show/hide
  - Active workspace: `display: flex`, inactive: `display: none`
  - Add store tests for visitedWorkspaceIds behavior
  - Verify existing store tests still pass

### Task 2: Context menus & closed workspaces
- **Branch:** `feature/context-menus`
- **PR title:** feat: tab & pane context menus, closed workspaces menu
- **Scope:** Tab.tsx, TabBar.tsx, Pane.tsx, store
- **Details:**
  - **Tab context menu**: add right-click handler to Tab.tsx with menu items:
    - Rename (trigger inline edit)
    - Change Color (show color palette from WORKSPACE_COLORS)
    - Duplicate (clone workspace with new IDs, open as new tab)
    - Close (delegate to existing closeWorkspaceTab)
  - Add `duplicateWorkspace(id: string)` action to store
  - **Closed workspaces menu**: add dropdown button in TabBar.tsx (visible when closed workspaces exist)
    - Shows workspaces where id is NOT in openWorkspaceIds
    - Click reopens via existing `openWorkspace` action
  - **Pane context menu enhancements**: extend existing context menu in Pane.tsx:
    - "Change Directory" — inline text input, updates paneConfig.cwd
    - "Set Startup Command" — inline text input, updates paneConfig.startupCommand
    - "Theme Override" — small popover with bg/fg color inputs + fontSize + Reset button
  - Reuse existing useInlineEdit hook pattern where applicable
  - Use existing shared context menu styles

### Task 3: Launch, test & fix
- **Branch:** `fix/launch-and-integration`
- **PR title:** fix: app launch & end-to-end terminal integration
- **Scope:** Any files as needed
- **Details:**
  - Debug and fix the empty window issue (app currently renders blank)
  - Check electron-vite config, renderer entry point, React mount
  - Verify terminal data pipeline: keystrokes → IPC → node-pty → IPC → xterm.js
  - Test workspace creation, tab switching, pane splitting, pane closing
  - Test config persistence: create workspace, quit, relaunch, verify state restored
  - Test CWD tracking: cd in terminal, verify pane header updates
  - Fix any runtime bugs discovered during testing
  - Ensure `bun run lint` and `bun run test` pass
