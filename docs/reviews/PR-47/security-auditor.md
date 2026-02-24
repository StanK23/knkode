# Security Review: PR #47 — feat: deep theming, UI typography and motion

## Summary

Low-risk PR. The new `colors.ts` utility handles user-sourced color strings from the local JSON config and feeds them into CSS custom properties via React inline styles. React's style prop sanitization prevents CSS injection. The main concern is missing input validation in `hexToRgb` that can propagate `NaN` through the color pipeline, and a dead import in the test file that will break the test suite.

## Must Fix

- `src/renderer/src/utils/colors.test.ts:3` — imports `adjustLightness` from `./colors`, but that function does not exist in `colors.ts`. This will cause a compile/test failure. Remove the unused import or add the missing export.

## Suggestions

- `src/renderer/src/utils/colors.ts:1-14` — `hexToRgb` performs no validation on input. Non-hex strings (e.g., `"rgb(0,0,0)"`, `"not-a-color"`, `""`) produce `NaN` values that silently propagate through `mixColors` and `rgbToHex`, resulting in CSS variable values like `#NaNNaNNaN`. While React's style prop prevents this from becoming a security issue (invalid CSS values are discarded by the browser), it creates a silent failure mode. Add an input validation guard — either throw on malformed input or return a safe fallback (e.g., `[0, 0, 0]`). Consider validating with `/^#([0-9a-f]{3}|[0-9a-f]{6})$/i` before parsing.

- `src/renderer/src/utils/colors.ts:48` — `generateThemeVariables` passes the raw `bg` and `fg` strings directly into CSS custom property values (`'--color-canvas': canvas` where `canvas = bg`). Although React's `style` prop uses `setProperty()` under the hood (which is safe against injection), a defense-in-depth approach would be to validate that `bg` and `fg` match expected hex-color patterns before using them. This guards against future refactors that might bypass the React style prop (e.g., if someone later uses `cssText` or a `<style>` tag).

- `src/renderer/src/App.tsx:76` — `themeStyles` is cast to `React.CSSProperties`. This is safe today because `generateThemeVariables` only produces `--color-*` keys, but the `as` cast suppresses type-checking. Consider using `Record<`--${string}`, string>` or keeping the cast but adding a comment noting the contract.

## Nitpicks

- `src/renderer/src/utils/colors.ts:43-44` — `isDark` silently falls back to `true` on invalid input. This is reasonable for visual purposes but masks bugs. A `console.warn` in the catch block would aid debugging without breaking the UI.

- `src/renderer/src/utils/colors.ts:72` — The accent color is a hardcoded constant per light/dark mode (`#6c63ff` / `#4d46e5`). No security concern, but noting this is not derived from the theme, so a malicious config cannot influence the accent color (which is good).

- `src/renderer/src/styles/global.css:117-118` — Font stack changed from system sans-serif to monospace (`"IBM Plex Mono", ...`). No security impact. Noting for completeness that the font name strings are static and not user-controlled.
