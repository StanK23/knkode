# PR Badge in Pane Status Bar — Design

**Created:** 2026-03-11

## Overview

When a pane's current git branch has an open GitHub PR, show the PR number (e.g., `#86`) as a clickable badge in the pane status bar. Clicking opens the PR URL in the default browser.

## Data Shape

```typescript
export interface PrInfo {
  number: number
  url: string
  title: string
}
```

- Badge displays `#number` only
- `title` shown on hover via `title` attribute
- `url` used on click to open in browser

## Detection

**Command:** `gh pr view --json number,url,title` run in the pane's cwd.

- Returns JSON for the current branch's PR, or exits non-zero if no PR exists.
- Requires `gh` CLI installed and authenticated.

**Trigger:**
1. **On branch change** — immediate check when `PTY_BRANCH_CHANGED` fires
2. **60-second refresh** — periodic re-check catches PRs opened externally

**Caching:**
- Store last known `PrInfo | null` per pane in `trackedPrs` map (main process)
- On error (gh missing, no auth, network issue): keep stale value, don't clear badge
- On branch change: clear cached PR before re-checking (new branch = different PR)

## IPC Flow

Same unidirectional pattern as branch detection:

```
cwd-tracker.ts (main process)
  ├─ Branch changes → execFile('gh', ['pr', 'view', '--json', 'number,url,title'])
  ├─ 60s refresh interval
  ├─ Fire PTY_PR_CHANGED(paneId, prInfo | null) → safeSend to renderer
  └─ Cache result in trackedPrs map

preload/index.ts
  └─ onPtyPrChanged(cb) → bridge event

App.tsx
  └─ useEffect → listen onPtyPrChanged → updatePanePr(paneId, pr)

store/index.ts
  └─ panePrs: Record<string, PrInfo | null>
  └─ updatePanePr(paneId, pr) action

PaneArea.tsx → Pane.tsx → variant.StatusBar
  └─ pr={panePrs[paneId] ?? null}
```

## Click Handler

New IPC channel `APP_OPEN_EXTERNAL` for safely opening URLs from renderer:

- Renderer calls `window.api.openExternal(url)`
- Main process validates URL (must be `https://`) then calls `shell.openExternal(url)`
- Passed to StatusBar as `onOpenExternal` prop

## Variant Rendering

Each variant renders PR badge next to the branch badge, styled to match:

| Variant group | Badge style |
|---------------|-------------|
| Amber, Matrix | `[PR#86]` in brackets |
| Cyberpunk | Clipped parallelogram shape |
| Vaporwave | Gradient pill on row 2 |
| Default, Dracula, Monokai, etc. | Subtle accent-colored text |
| Nord, Tokyo Night | Low-opacity, hover to reveal |
| Ocean | Inside hidden action group |

All variants share:
- `cursor-pointer` for clickable affordance
- `title={pr.title}` for hover tooltip
- `onClick={() => onOpenExternal(pr.url)}`
- Semantic `<a>` element (external link semantics) or `<button>` with role

## Edge Cases

- **`gh` not installed**: `execFile` fails with ENOENT → log once, no badge, no polling
- **Not authenticated**: `gh` returns error → no badge, keep polling (user might auth later)
- **No PR for branch**: Command exits non-zero → `null`, no badge
- **Multiple PRs**: `gh pr view` returns the PR associated with the current branch (one-to-one)
- **Rate limiting**: GitHub API rate limits rarely hit for `gh pr view` (uses local git context). On failure: keep stale cache.
- **Branch is `main`/`master`**: Likely no PR, but don't special-case — let `gh` answer.

## Security

- `APP_OPEN_EXTERNAL` validates URL starts with `https://` before calling `shell.openExternal()`
- `gh` command uses `execFile` (not `exec`) — no shell injection risk
- PR info is display-only, never used in shell commands
