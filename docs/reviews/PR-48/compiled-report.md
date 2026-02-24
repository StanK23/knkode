# PR #48 Compiled Review — fix: terminal scroll jump on resize or TUI redraw

**8 agents ran:** code-reviewer, security-auditor, silent-failure-hunter, code-simplifier, comment-analyzer, type-design, frontend-ui, typescript-pro

---

## Must Fix

None

---

## Suggestions

1. **`Terminal.tsx:301` — `isAtBottom` duplicates the existing `isTermAtBottom()` helper**
   `viewportY >= baseY` reimplements the module-level `isTermAtBottom(term)` helper on line 16. Use the helper to stay DRY and avoid drift if the threshold logic changes.
   *Flagged by: code-simplifier, frontend-ui, typescript-pro*

2. **`Terminal.tsx:368-376` — Theme-update effect lacks alternate-buffer guard and distance-from-bottom logic**
   The theme-update path uses `isTermAtBottom` + `scrollToBottom` but doesn't skip alternate buffer or use the new distance-from-bottom approach. If a user changes font size while scrolled up with long wrapped lines, scroll position is lost. Consider extracting a shared scroll-preservation helper.
   *Flagged by: code-reviewer, frontend-ui*

3. **`Terminal.tsx:279-286` — Dimension-dedup guard has no explanatory comment**
   `lastWidth`/`lastHeight` filter spurious ResizeObserver callbacks but no comment explains *why* (ResizeObserver fires with unchanged dimensions on DOM re-attach, style recalc). Add a one-liner.
   *Flagged by: comment-analyzer, typescript-pro, frontend-ui*

4. **`Terminal.tsx:293-294` — Alternate-buffer comment could be more precise**
   "TUIs handle their own redraws" implies the TUI responds to the ResizeObserver, but it actually responds to the PTY resize signal. The real reason is that the alternate buffer has no scrollback (viewportY/baseY always 0). Clarify.
   *Flagged by: comment-analyzer*

5. **`Terminal.tsx:309-310` — "non-linearly" in comment could be more concrete**
   Explain that narrowing wraps long lines into more rows, inflating baseY disproportionately and causing ratio to overshoot.
   *Flagged by: comment-analyzer*

6. **`Terminal.tsx:295` — Extract `isAlternateBuffer` boolean for readability**
   `term.buffer.active.type === 'alternate'` is type-safe but extracting a named boolean would match the `isAtBottom` pattern.
   *Flagged by: type-design*

---

## Nitpicks

7. **`Terminal.tsx:279-280` — `lastWidth`/`lastHeight` initialized to `0`**
   First callback always passes. Correct behavior, but could initialize from actual dimensions to avoid a redundant rAF+fit on mount.
   *Flagged by: security-auditor, type-design, typescript-pro, frontend-ui, silent-failure-hunter*

8. **`Terminal.tsx:283` — `if (!entry) return` is unreachable per ResizeObserver spec**
   Spec guarantees at least one entry. Harmless defensive code. Could add a brief comment.
   *Flagged by: silent-failure-hunter, type-design*

9. **`Terminal.tsx:302` — `linesFromBottom` scope could be narrower**
   Only used inside the `else` branch. Moving into `else` block would narrow scope.
   *Flagged by: code-simplifier*

10. **`HANDOFF.md:8-9` — PR number placeholders**
    References `PR #?? (pending)`. Should use actual PR number.
    *Flagged by: code-reviewer*
