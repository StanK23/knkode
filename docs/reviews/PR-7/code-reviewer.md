# PR #7 Code Review: Split Pane Renderer

## Summary

Clean implementation of split pane layout using `allotment`, with well-structured recursive tree rendering, proper Zustand selector usage, and good separation of concerns between `Pane` and `SplitPaneLayout`. The inline style for dynamic `borderTopColor` is justified since `workspaceColor` is a runtime hex value. No critical bugs found.

## Must Fix

- `src/components/Pane.tsx:26` -- **Inline `style` prop violates "Tailwind-only styling" locked decision** (PROJECT_DESCRIPTION.md). While the dynamic `workspaceColor` hex value cannot be expressed as a static Tailwind class, the project guidelines say "no exceptions." This should be addressed explicitly -- either get a documented exception from the project owner, or use a CSS custom property set via Tailwind's arbitrary property syntax (e.g., `className="border-t-[var(--ws-color)]"` with a parent setting the variable). Confidence: 82.
- `src/components/SplitPaneLayout.tsx:2` -- **`import "allotment/dist/style.css"` introduces non-Tailwind CSS**. The locked decision states "Tailwind-only styling -- no exceptions." While this is a third-party library requirement (not custom CSS), it still introduces a separate CSS stylesheet that could conflict with Tailwind's styles. This should be acknowledged as a deliberate exception or the CSS should be evaluated for potential conflicts. Confidence: 80.

## Suggestions

- `src/components/SplitPaneLayout.tsx:116-133` -- The `useDebouncedCallback` hook is a general-purpose utility. Consider extracting it to `src/hooks/useDebouncedCallback.ts` for reuse, following the DRY principle from project guidelines. The existing codebase already has debounce patterns in `Terminal.tsx` (resize debounce at line 144) that could potentially share this hook. Confidence: 65.
- `src/App.tsx:39-56` -- `ActiveWorkspace` is defined in the same file as `App` but accesses different store slices. As the workspace system grows (tabs, workspace switcher), this component will likely need its own file. Not urgent now, but worth noting. Confidence: 50.
- `src/components/SplitPaneLayout.tsx:93` -- `defaultSizes` is recalculated on every render via `.map()`. Since `node.children` is an immutable readonly array, this could be memoized with `useMemo` to avoid Allotment receiving a new array reference on each parent re-render (which may trigger unnecessary internal resets). Confidence: 60.

## Nitpicks

- `src/components/Pane.tsx:32` -- The hardcoded string `"Terminal"` should be replaced with `paneConfig.label` or at minimum a named constant, per the "no magic numbers/values" guideline. The label will need to be dynamic when the pane system supports different content types. Confidence: 55.
- `src/components/SplitPaneLayout.tsx:9-10` -- Good use of named constants for `PANE_MIN_SIZE` and `SIZE_PERSIST_DEBOUNCE_MS`. Consistent with the pattern established in `Terminal.tsx`. No issue here.
