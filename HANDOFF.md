# Handoff

## Current State

**Version**: 2.3.1 | **Branch**: `main` | **Open PRs**: none

PR #83 (`feat: multi-workspace settings with master-detail layout`) is merged to `main` as `00b9653`.

The shipped settings flow now includes:
1. Multi-workspace master-detail settings layout.
2. Safe workspace draft switching with explicit flush-on-selection-change.
3. Shared vs per-workspace snippet separation with shared controller wiring.
4. Unified workspace creation flow across settings, sidebar, and keyboard shortcuts.
5. Scrollback input that allows free retyping and clamps only when the edit is committed.

## Verification

- `bun x vitest run src/components/SettingsPanel.test.tsx src/components/WorkspaceList.test.tsx src/components/SnippetPanels.test.tsx src/store/workspace-pane-actions.test.ts src/store/layout-tree.test.ts`
- `bun x vitest run src/components/WorkspaceDetail.test.tsx src/components/SettingsPanel.test.tsx`
- `bun x tsc --noEmit`

## What’s Next

1. If desired, rerun `pr-swarm` against `main` or against the next open PR instead of the now-merged settings branch.
2. Return later to the separate Codex resize/history-loss bug from a clean `main` baseline.

## Important Decisions

- The settings redesign stayed in a single PR and absorbed both the blocking review findings and the cleanup suggestions.
- Workspace draft ownership remains inside `SettingsPanel`, but the draft/UI boundary is now explicit via `WorkspaceSettingsDraft`.
- The scrollback field now keeps a local text draft and only snaps to `MIN_SCROLLBACK` / `MAX_SCROLLBACK` on blur or Enter.
