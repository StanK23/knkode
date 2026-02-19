# knkode — Handoff

## What Was Done
- [done] v0.1.0 released — signed DMG/ZIP on GitHub, not yet notarized
- [done] CI workflow — `ci.yml` runs lint/test on PRs (ubuntu, free tier)
- [done] Release workflow removed — macOS runner burned through free tier, build locally instead
- [done] Fixed node-pty missing from packaged app (`electron-builder.json` files pattern)
- [done] Terminal settings (PR #30) — scrollback + cursor style
- [done] Dynamic window title (PR #29)
- [done] Keyboard shortcuts v2 (PR #28)

## Pending: Apple Notarization

Submission ID: `REDACTED_SUBMISSION_ID`

Apple's notarization queue is backed up (we submitted 15 times during CI debugging).
Check status periodically — when "Accepted", staple and re-upload:

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

If it stays "In Progress" for days, submit fresh:
```bash
bun run build && bun x electron-builder --arm64 --publish never
xcrun notarytool submit dist/knkode-0.1.0-arm64.dmg \
  --apple-id "REDACTED_EMAIL" \
  --password "REDACTED_PASSWORD" \
  --team-id "REDACTED_TEAM_ID" \
  --wait
```

## Active Decisions
- Tech stack: Electron + React + TypeScript + xterm.js + node-pty + Zustand
- Styling: **Tailwind CSS v4** with @tailwindcss/vite plugin, semantic color tokens in @theme
- Package manager: bun | Linter: Biome | Test runner: Vitest
- Config storage: ~/.knkode/ (JSON files, atomic writes)
- PTY lifecycle: store-managed (ensurePty/killPtys/removePtyId) — decoupled from React mount
- Releases: build locally, no CI release workflow

## What's Next
- Check notarization status (see above)
- Follow-up: Unit tests for `swapPanes` + `applyPresetWithRemap`
- Follow-up: Extract `usePaneDrag` hook (DRY — 6 callbacks in Pane.tsx)
- Follow-up: Focus trap for SettingsPanel modal
- Follow-up: Extract `useContextMenu` hook (DRY — Pane/Tab)
- Follow-up: IPC `assertWorkspace` per-field theme validation
