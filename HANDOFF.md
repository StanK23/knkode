# HANDOFF

## Current State
- Branch: `fix/pane-scroll-jump`
- PR #57 open: fix pane scroll jumping to top on large output

## What Was Done
- PR #56 merged: snippet reorder via DnD + keyboard, full a11y, 5 unit tests
- PR #57 created: fix scroll jump — removed term.onScroll, switched to linesFromBottom
- PR #57 review fixes applied: extracted getLinesFromBottom helper, SavedScroll interface, clamped at save time, improved comments

## Active Plan
- `docs/plans/2026-03-01-pane-enhancements-plan.md`
- PR #1: snippet reorder — merged (PR #56)
- PR #2: fix pane scroll jump — PR #57 (review fixes applied)
- PR #3: translucent pane backgrounds — after

## Previous Work
- PR #51: Windows support + CI/CD
- PR #50: Dynamic workspace fonts

## Next Steps
1. Merge PR #57
2. Translucent pane backgrounds (PR #3)
3. Follow-up: extract shared `useDragReorder` hook
