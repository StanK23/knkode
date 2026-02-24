# PR #47 Frontend / UI Review: Deep Theming, Typography, and Motion

## Summary

The PR introduces dynamic CSS custom property generation from workspace theme colors, swaps the UI font to IBM Plex Mono, and adds CSS transitions/animations. The color generation logic is clean and well-tested, but has notable accessibility gaps on several popular theme presets (Solarized, Rose Pine Dawn), a missing `prefers-reduced-motion` query, and a font weight coverage issue with IBM Plex Mono.

## Must Fix

- **`src/renderer/src/styles/global.css:179-192` -- No `prefers-reduced-motion` media query.** The `panel-in` animation and all `transition-colors duration-200` transitions play unconditionally. Users with vestibular disorders who set "Reduce motion" in OS preferences will still see the scale animation and color transitions. Add a `@media (prefers-reduced-motion: reduce)` block that sets `animation: none` and `transition: none` (or `transition-duration: 0s`) for `.animate-panel-in` and elements using `transition-colors`.

- **`src/renderer/src/utils/colors.ts:64-65` -- `contentSecondary` fails WCAG AA (4.5:1) on multiple popular presets.** The `mixColors(fg, bg, 0.7)` formula produces secondary text with insufficient contrast on Solarized Dark (3.06:1), Solarized Light (2.80:1), Rose Pine Dawn (3.33:1), and barely passes on GitHub Light (5.52:1 but fails on elevated at 4.93:1). Since `contentSecondary` is used for labels and descriptive text at 11-12px (small text), it must meet 4.5:1. Either increase the weight from 0.7 to at least 0.8, or add a contrast-check floor that ensures the ratio meets 4.5:1 against canvas.

- **`src/renderer/src/utils/colors.ts:65` -- `contentMuted` fails WCAG AA Large Text (3.0:1) on multiple presets.** With `mixColors(fg, bg, 0.45)`, muted text falls below 3.0:1 on Solarized Dark (2.02:1), Solarized Light (1.85:1), Rose Pine Dawn (2.05:1), GitHub Light (2.66:1), and GitHub Dark on elevated surfaces (2.97:1). Even if muted text is considered decorative, it is used for CWD paths and placeholder text which convey information. Increase the weight or add a minimum contrast floor.

- **`src/renderer/src/utils/colors.test.ts:3` -- Dead import `adjustLightness`.** The test file imports `adjustLightness` from `./colors`, but that function does not exist in `colors.ts`. The test suite passes because the import is unused (tree-shaken by the test runner), but this will fail if `verbatimModuleSyntax` or stricter checks are enabled. Remove the import.

## Suggestions

- **`src/renderer/src/App.tsx:69-71` -- `generateThemeVariables` runs on every render without memoization.** The function does hex parsing, multiple `mixColors` calls, and `isDark` computation. While cheap in isolation, it runs on every App re-render (which happens on any store update). Wrap in `useMemo` keyed on `activeWorkspace.theme.background` and `activeWorkspace.theme.foreground` to avoid recalculation:
  ```ts
  const themeStyles = useMemo(
    () => activeWorkspace
      ? generateThemeVariables(activeWorkspace.theme.background, activeWorkspace.theme.foreground)
      : undefined,
    [activeWorkspace?.theme.background, activeWorkspace?.theme.foreground],
  )
  ```

- **`src/renderer/src/utils/colors.ts:57` -- Light-theme `sunken` is identical to `canvas` when background is `#ffffff`.** `mixColors('#ffffff', '#ffffff', 0.92)` yields `#ffffff`, so `.bg-sunken` and `.bg-canvas` become visually indistinguishable on GitHub Light. Consider mixing toward a light gray (e.g., `#f5f5f5`) instead of pure white for the light-theme sunken direction, or use the same `depthColor` logic in reverse.

- **`src/renderer/src/utils/colors.ts:72` -- Hardcoded accent colors ignore workspace personality.** The accent is always `#6c63ff` (dark) or `#4d46e5` (light) regardless of the workspace theme. For warm themes like Gruvbox or Kanagawa, a purple accent may feel out of place. Consider deriving a hue-shifted accent from the foreground or allowing per-theme accent overrides in the future.

- **`src/renderer/src/utils/colors.ts:72` -- Accent on dark elevated surfaces fails WCAG AA Large Text for Nord (2.49:1) and Dracula (2.82:1).** The accent color `#6c63ff` is used for focused borders, active elements, and interactive indicators. On darker elevated backgrounds it drops below 3.0:1. Consider lightening the dark-mode accent slightly (e.g., `#7d75ff`) or computing it to guarantee at least 3.0:1 against the elevated surface.

- **`src/renderer/src/styles/global.css:35-45` -- IBM Plex Mono `@font-face` only declares weights 400 and 700, but the UI uses `font-medium` (500) and `font-semibold` (600).** The browser will synthesize (faux-bold) weights 500 and 600 from the 400 weight file, which often looks poor on monospace fonts (uneven stroke widths, blurry stems). Either: (a) bundle the 500 weight file for IBM Plex Mono, or (b) remap `font-medium` usages to 400 and `font-semibold` to 700 in the UI, or (c) use a variable-weight woff2 file that covers the full range.

- **`src/renderer/src/App.tsx:75` -- `transition-colors duration-200` on the root container cascades to all descendants.** When switching workspaces, all 12 CSS custom properties change simultaneously. Every element referencing these variables (via `bg-canvas`, `text-content`, `border-edge`, etc.) will animate its color properties over 200ms. With many panes, tabs, and terminal elements, this could cause a visible frame-drop on lower-end machines. Consider either: (a) applying the transition only to the tab bar and pane headers (not the root), or (b) using a `will-change: background-color` hint on the root, or (c) reducing the scope of the transition to specific elements.

## Nitpicks

- **`src/renderer/src/utils/colors.ts:89` -- Unnecessary `as Record<string, string>` cast.** The return object already has string values. If the intent is to make the keys indexable by string (for `style={themeStyles as React.CSSProperties}`), a better approach would be to type the return as `Record<`--color-${string}`, string>` or define a proper type for the theme variables.

- **`src/renderer/src/utils/colors.ts:1` -- `hexToRgb` return type is `number[]` (inferred), not `[number, number, number]`.** The destructuring `const [r, g, b] = hexToRgb(hex)` in `isDark` works but lacks type safety. Consider annotating the return type as `[number, number, number]`.

- **`src/renderer/src/styles/global.css:118` -- Font stack comment says "Industrial Monospace aesthetic" but this is internal-only context.** The comment is fine, just noting the naming choice is specific.

- **`src/renderer/src/components/Pane.tsx:287-299` -- Formatting-only change (removed trailing `, []` onto same line).** This is just a whitespace change from the Biome formatter. Not a problem, just noting it adds noise to the diff.
