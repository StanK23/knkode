# knkode — Handoff

## What Was Done
- [done] Bugfix round (PRs #32–#40):
  - PTY login shell — `gh`, `bun` etc. now on PATH (#32)
  - Terminal scroll preservation — workspace switch, resize, pane swap (#33, #38, #39, #40)
  - Shift+Enter sends LF instead of CR (#34)
  - Terminal padding + theme-aware padding background (#34, #36)
  - Restart Pane context menu + focus/resize fix (#35, #37)
  - Scroll-to-bottom button when scrolled up (#40)
- [done] v0.1.0 released — signed DMG/ZIP, notarization still "In Progress"

## Pending: Apple Notarization

Submission ID: `REDACTED_SUBMISSION_ID` — status: **In Progress** (as of 2026-02-20)

```bash
# Check status
xcrun notarytool info REDACTED_SUBMISSION_ID \
  --apple-id "REDACTED_EMAIL" \
  --password "REDACTED_PASSWORD" \
  --team-id "REDACTED_TEAM_ID"

# If Accepted — staple and re-upload
xcrun stapler staple dist/knkode-0.1.0-arm64.dmg
gh release upload v0.1.0 dist/knkode-0.1.0-arm64.dmg --clobber
```

If still "In Progress" after 48+ hours, submit fresh (see git history for full command).

## Active Decisions
- Tech stack: Electron + React + TypeScript + xterm.js + node-pty + Zustand
- Styling: **Tailwind CSS v4** with @tailwindcss/vite plugin, semantic color tokens in @theme
- Package manager: bun | Linter: Biome | Test runner: Vitest
- Config storage: ~/.knkode/ (JSON files, atomic writes)
- PTY lifecycle: store-managed (ensurePty/killPtys/removePtyId) — decoupled from React mount
- Releases: build locally, no CI release workflow

## What's Next
- Pane reorder orientation change (drag-drop to change split direction — deferred, complex)
- Check notarization status
- Follow-up: Unit tests for `swapPanes` + `applyPresetWithRemap`
- Follow-up: Extract `usePaneDrag` hook (DRY — 6 callbacks in Pane.tsx)
- Follow-up: Focus trap for SettingsPanel modal
- Follow-up: Extract `useContextMenu` hook (DRY — Pane/Tab)
