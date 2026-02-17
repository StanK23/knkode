# knkode Feature Completion — Design

**Date**: 2026-02-18
**Status**: Approved

## Goal

Complete all remaining features from the original design doc to make knkode functionally complete before first launch testing.

## What's Already Built

- Main process: window management (with bounds persistence), PTY manager, config store, CWD tracker, IPC handlers with validation, app-quit cleanup
- Renderer: all UI components (TabBar, Tab, Pane, PaneArea, Terminal, SettingsPanel, LayoutPicker)
- Store: full workspace CRUD, split/close pane, keyboard shortcuts, drag-to-reorder tabs
- 44 store tests with vitest

## What's Missing

### 1. PTY Lifecycle — Lazy Loading & Tab Persistence

**Problem**: App.tsx renders only the active workspace's `<PaneArea>`. Switching tabs unmounts the old one (killing PTYs) and mounts the new one (spawning fresh PTYs). Terminal state (scrollback, running processes) is lost on every tab switch.

**Solution**: Render all "visited" workspaces simultaneously, hide inactive ones with CSS.

- Add `visitedWorkspaceIds: string[]` to store — tracks tabs activated at least once this session
- `setActiveWorkspace` adds the id to `visitedWorkspaceIds`
- App.tsx renders `<PaneArea>` for every visited workspace with `display: none` on inactive
- First activation = mount = PTY spawn (lazy loading per design doc)
- Tab switch = toggle CSS visibility (PTYs stay alive, scrollback preserved)
- Tab close = remove from visited → PaneArea unmounts → PTYs killed via Pane cleanup effect
- On init, the active workspace is automatically added to visited

### 2. Tab Context Menu

Right-click on a tab opens a context menu with:
- **Rename** — inline text edit (reuse existing `useInlineEdit` hook)
- **Change Color** — submenu/popover with the predefined `WORKSPACE_COLORS` palette
- **Duplicate** — creates a new workspace cloning layout, panes (cwds, labels), and theme. New UUIDs for workspace and pane IDs. Opens as new tab.
- **Close** — same as clicking the tab X button

### 3. Closed Workspaces Menu

A dropdown/popover accessible from the tab bar area (e.g., a `⋯` or `↓` button) showing workspaces that exist in `workspaces.json` but are NOT in `openWorkspaceIds`. Clicking one re-opens it (adds to open tabs and activates). If no closed workspaces exist, the button is hidden or disabled.

### 4. Pane Context Menu Enhancements

Current pane context menu has: Split Vertical, Split Horizontal, Rename, Close.

Add three new actions:
- **Change Directory** — opens a small inline input (text field) pre-filled with current cwd. User types/pastes new path and presses Enter. Updates pane config cwd. Does NOT affect the running PTY (the terminal's cwd is managed by the shell). The saved cwd is used on next PTY spawn.
- **Set Startup Command** — same pattern: inline text input pre-filled with current startupCommand (or empty). Updates pane config.
- **Theme Override** — small popover with inputs for background color, foreground color, and font size. Null values inherit from workspace theme. A "Reset" button clears the override.

### 5. Launch, Test & Fix

After features are code-complete:
- Debug the empty window issue (app renders blank)
- Fix any build or runtime errors
- Verify end-to-end terminal flow: type commands, see output, resize, split, close
- Verify config persistence across app restarts

## Architecture Notes

- No new IPC channels needed — all store actions use existing `saveWorkspace`/`saveAppState` calls
- No new dependencies — everything uses existing React, Zustand, and shared types
- `visitedWorkspaceIds` is session-only state (not persisted) — correct behavior per design doc's lazy-loading spec
- Duplicate workspace uses `crypto.randomUUID()` for new IDs, same as existing workspace creation
