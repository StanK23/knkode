# HANDOFF

## Current State
- Branch: `main` (stable)
- `dev/agent-workspace` branch preserved with all rendered view work (PRs #58-75)

## What Was Done
- PR #75 merged to dev/agent-workspace: Status bar layout (static + dynamic streaming bar), context gauge, token formatting, prompt caching support, isResponding turn-level tracking
- PR #74 merged: Status bar model/tokens + inline block token badges
- PR #73 merged: Full rendered conversation view for Claude Code agent
- PR #71 merged: Generic agent subprocess manager
- PR #58-69 merged: Agent workspace foundation

## Decision: Rendered View → V2 (On Hold)
The rendered agent view (stream-json parsing, custom chat UI) works but carries ongoing maintenance burden:
- Each provider/model update can break parsers
- Claude TUI gets features instantly (agent trees, thinking modes) that we'd need to reimplement
- Parser compatibility layer is a moving target across providers

**Decision:** Focus on TUI-native experience — multi-pane layout, theming, stability. The rendered view is preserved on `dev/agent-workspace` and can be resumed later if needed.

## Remaining Work (on `main`)
- Rework theming system
- Fix TUI scroll-jumping-to-top bug

## Previous Work
- PR #58: Translucent pane backgrounds with blur
- PR #57: Fix scroll jump — linesFromBottom approach
- PR #56: Snippet reorder via DnD
- PR #51: Windows support + CI/CD
- PR #50: Dynamic workspace fonts
