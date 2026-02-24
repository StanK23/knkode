# PR #48 Code Simplifier Review

## Summary

The resize observer changes are well-structured and cleanly separate concerns (spurious-event filtering, alternate buffer bypass, distance-from-bottom scroll preservation). One DRY violation and one minor scoping improvement stand out.

## Must Fix

None

## Suggestions

- `src/renderer/src/components/Terminal.tsx:301` — `const isAtBottom = viewportY >= baseY` duplicates the existing `isTermAtBottom(term)` helper on line 16. Replace with `const isAtBottom = isTermAtBottom(term)` to stay DRY and keep a single source of truth for the "at bottom" check. This also makes the intent clearer at a glance.

## Nitpicks

- `src/renderer/src/components/Terminal.tsx:302` — `linesFromBottom` is only used inside the `else` branch (line 311). Moving its declaration into the `else` block would narrow its scope and make the data flow more obvious, though current placement is also readable.
