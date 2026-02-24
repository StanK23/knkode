# PR #48 Comment Analysis — `fix/terminal-resize-jump`

## Summary

The PR replaces a ratio-based scroll-position-preservation strategy with a dual approach: skip scroll management entirely for alternate-buffer TUIs, and use distance-from-bottom (instead of ratio) for the normal buffer. It also adds a dimension-dedup guard on the ResizeObserver. The new and modified comments are accurate and well-targeted, with one minor factual gap and a few small improvements possible.

## Must Fix

None

## Suggestions

- `src/renderer/src/components/Terminal.tsx:293-294` -- The comment "Do not attempt to manage scroll if in alternate screen buffer (TUIs). TUIs handle their own redraws." is accurate but could be slightly more precise. The reason scroll management is skipped is not just that TUIs handle their own redraws, but that the alternate buffer has no scrollback (viewportY and baseY are always 0), so there is nothing to preserve. Saying "TUIs handle their own redraws" makes it sound like the TUI itself is responding to the ResizeObserver, when in reality the TUI responds to the PTY resize signal sent by `term.onResize`. Consider: "Skip scroll management for the alternate screen buffer. The alternate buffer has no scrollback, so viewportY/baseY are always 0 and scroll restoration is meaningless. TUI apps (vim, htop) handle their own layout via the PTY resize signal."
- `src/renderer/src/components/Terminal.tsx:309-310` -- The comment "Maintain exact distance from bottom instead of ratio, as wrapping text changes total buffer lines non-linearly" is correct and valuable -- it explains the *why* behind the algorithm change. However, "non-linearly" could be more concrete. When the terminal narrows, a single long line may wrap into 2+ lines, increasing `baseY` by more than the proportional amount a ratio would predict. Consider: "Maintain exact distance from bottom instead of ratio. When the terminal narrows, long lines re-wrap into more rows, inflating baseY disproportionately and causing a ratio-based approach to overshoot."
- `src/renderer/src/components/Terminal.tsx:279-286` -- The dimension-dedup guard (`lastWidth`/`lastHeight`) has no comment explaining *why* it exists. A future maintainer may not know that ResizeObserver fires spurious callbacks with identical dimensions (e.g., on element re-attachment or style recalc). A one-line comment before `let lastWidth = 0` would help: "// ResizeObserver can fire with unchanged dimensions (e.g., on DOM re-attach); skip those to avoid unnecessary fit/scroll cycles."

## Nitpicks

- `src/renderer/src/components/Terminal.tsx:301` -- `const isAtBottom = viewportY >= baseY` reintroduces the `isAtBottom` concept that the old comment block explicitly warned against. This is fine here because the old warning was about using `isAtBottom` as a *persisted flag across async boundaries* (stale during TUI redraws), whereas this usage is a *snapshot read immediately before fit()*. The distinction is subtle but correct. No change needed, but worth noting that the old code's comment has been cleanly superseded.
