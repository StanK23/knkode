# PR #48 Code Review — fix: terminal scroll jump on resize or TUI redraw

## Summary

The PR fixes terminal scroll-jump during resize and TUI redraws with three changes: (1) filtering spurious ResizeObserver callbacks by deduplicating on dimensions, (2) skipping scroll management entirely when the alternate screen buffer is active (TUIs), and (3) switching from ratio-based to distance-from-bottom scroll preservation. All three changes are correct and well-reasoned.

## Must Fix

None

## Suggestions

- `src/renderer/src/components/Terminal.tsx:368-376` — The theme-update effect uses `isTermAtBottom` + `scrollToBottom` for scroll preservation during `fit()`, but does not skip alternate buffer or use the new distance-from-bottom approach. If a user changes font size while scrolled up in a normal buffer with long wrapped lines, the theme-update path will lose the scroll position (it only preserves "at bottom" vs "not at bottom", discarding the position entirely when not at bottom). Consider applying the same alternate-buffer check and distance-from-bottom logic here for consistency, or extract a shared helper.

- `HANDOFF.md:8-9` — The entries reference `PR #?? (pending)` for both `feat/deep-theming` and `fix/terminal-resize-jump`. Since this PR is #48, at least that entry should use the real number. The other should be filled in once known.

## Nitpicks

None
