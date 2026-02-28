# HANDOFF

## Current State
- Branch: `feature/snippet-reorder`
- PR pending: drag-to-reorder snippets in Settings

## What Was Done
- feat: snippet reorder via drag-and-drop in Settings panel
  - Added `reorderSnippets(fromIndex, toIndex)` store action (splice-remove + insert, persists)
  - Added HTML5 DnD to snippet rows: drag handle, opacity on drag, accent highlight on drop target
  - Follows same pattern as workspace tab reorder in TabBar

## Previous Work
- `34fcc09` fix: recover from WebGL context loss
- PR #51: Windows support + CI/CD
- PR #50: Dynamic workspace fonts

## Active Plan
- `docs/plans/2026-03-01-pane-enhancements-plan.md`
- PR #1: snippet reorder (this branch) — done
- PR #2: fix pane scroll jump — next
- PR #3: translucent pane backgrounds — after

## Next Steps
1. Merge PR #1, then fix pane scroll jump (PR #2)
2. Follow-up: expose `process.platform` via preload API
3. Follow-up: pin GitHub Actions to commit SHAs
