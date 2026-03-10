# PR Badge — Implementation Plan

**Design doc:** docs/plans/2026-03-11-pr-badge-design.md
**Created:** 2026-03-11

## Tasks

### Task 1: PR detection IPC + store plumbing
- **Branch:** `feature/pr-badge`
- **PR title:** feat: clickable PR badge in pane status bar
- **Scope:** Full vertical slice — main process detection, preload bridge, store, renderer rendering in all 16 variants
- **Details:**
  - Add `PrInfo` type to `src/shared/types.ts` + new IPC channels (`PTY_PR_CHANGED`, `APP_OPEN_EXTERNAL`)
  - Extend `cwd-tracker.ts`: PR detection on branch change + 60s refresh interval, `trackedPrs` map, fire `PTY_PR_CHANGED`
  - Add `app:open-external` IPC handler in `ipc.ts` with `https://` URL validation
  - Extend preload: `onPtyPrChanged()` listener + `openExternal()` invoke
  - Extend store: `panePrs: Record<string, PrInfo | null>` + `updatePanePr` action
  - Wire listener in `App.tsx`
  - Pass `pr` + `onOpenExternal` through `PaneArea.tsx` → `Pane.tsx` → `StatusBarProps`
  - Update `StatusBarProps` in `pane-chrome/types.ts`: add `pr: PrInfo | null` + `onOpenExternal: (url: string) => void`
  - Update all 16 variant StatusBar components to render clickable PR badge
  - Each variant styles badge to match its aesthetic (brackets for Amber/Matrix, gradient pill for Vaporwave, etc.)
