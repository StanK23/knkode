# HANDOFF

## Current State
- Branch: `feature/snippet-reorder`
- PR #56: drag-to-reorder snippets — review fixes applied, ready for merge

## What Was Done
- feat: snippet reorder via drag-and-drop in Settings panel
  - `reorderSnippets` store action with console.warn on bad indices
  - HTML5 DnD on snippet rows + keyboard reorder (Alt+Arrow)
  - Full accessibility: `aria-roledescription`, `aria-live` announcements, focus ring
  - Drag handle hidden in edit mode and for single-snippet lists
  - 5 unit tests mirroring `reorderWorkspaceTabs` suite

## Previous Work
- `34fcc09` fix: recover from WebGL context loss
- PR #51: Windows support + CI/CD
- PR #50: Dynamic workspace fonts

## Active Plan
- `docs/plans/2026-03-01-pane-enhancements-plan.md`
- PR #1: snippet reorder (this branch) — done, reviewed, fixes applied
- PR #2: fix pane scroll jump — next
- PR #3: translucent pane backgrounds — after

## Next Steps
1. Merge PR #56, then fix pane scroll jump (PR #2)
2. Follow-up: extract shared `useDragReorder` hook (TabBar + SettingsPanel)
3. Follow-up: expose `process.platform` via preload API
