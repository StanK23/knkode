# DRY / Reuse Review -- PR #47 `feat/deep-theming`

## Summary

The new `colors.ts` utility is genuinely new -- no prior color manipulation code existed in the codebase. One must-fix: the test file imports a function (`adjustLightness`) that does not exist in the implementation, which will break the test suite. The rest are minor suggestions around keeping the static CSS fallback values in sync with the dynamic generator and reducing repeated Tailwind transition strings.

## Must Fix

- `src/renderer/src/utils/colors.test.ts:3` -- imports `adjustLightness` from `./colors`, but `src/renderer/src/utils/colors.ts` does not export (or define) any function named `adjustLightness`. This will cause a compile/test failure. Either remove the import or add the missing function.

## Suggestions

- **Static CSS vars may drift from dynamic generator.** `src/renderer/src/styles/global.css:91-106` hardcodes 12 CSS variable defaults for the "Default Dark" theme (`#1a1a2e` / `#e0e0e0`). `src/renderer/src/utils/colors.ts:48-88` (`generateThemeVariables`) computes those same 12 variables dynamically from the same bg/fg inputs. The two sources can drift silently (e.g., `--color-elevated` is `#16213e` in CSS but `mixColors('#1a1a2e', '#ffffff', 0.95)` = `#1d1d31` -- these are already different). Consider either (a) removing the hardcoded surface/content/edge/accent colors from the `@theme` block and relying entirely on `generateThemeVariables` at runtime, or (b) adding a test that asserts `generateThemeVariables('#1a1a2e', '#e0e0e0')` matches the static CSS defaults. The `@theme` block would still need entries for Tailwind class generation, but they should match.

- **Font fallback chains defined in two places.** `src/renderer/src/data/theme-presets.ts:44` defines `FONT_FALLBACKS = 'Menlo, Monaco, Consolas, monospace'` for terminal fonts, and `src/renderer/src/styles/global.css:118` defines `--font-sans: "IBM Plex Mono", "JetBrains Mono", Menlo, Monaco, Consolas, monospace` for UI fonts. These overlap but serve different purposes (terminal vs UI chrome). If the terminal fallback list ever changes, the UI font stack should likely change too. Consider extracting the shared suffix (`Menlo, Monaco, Consolas, monospace`) into a single constant or documenting the intentional divergence.

## Nitpicks

- **Repeated `transition-colors duration-200` in inline classNames.** This exact string appears in `src/renderer/src/App.tsx:75`, `src/renderer/src/components/Pane.tsx:357`, `src/renderer/src/components/Tab.tsx:84`, and `src/renderer/src/styles/global.css:173` (`.settings-input`). This is idiomatic Tailwind and not a real DRY violation, but if the transition timing changes project-wide, all four sites need updating. A shared Tailwind `@layer components` class (e.g., `.theme-transition`) would centralize it.

- **`generateThemeVariables` returns `as Record<string, string>` (line 88), discarding the known keys.** A typed return (e.g., using a const object or a narrower Record type keyed by a string union of `--color-*` names) would give consumers type safety and autocomplete. Minor, but worth noting since the CSS variable names are a fixed set.
