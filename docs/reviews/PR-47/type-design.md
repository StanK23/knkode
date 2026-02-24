# PR #47 Type Design Review

## Summary

The new `colors.ts` module has no explicit return types, no branded/nominal types for hex color strings, and uses a widening `as Record<string, string>` cast that erases the precise key set. The test file imports a non-existent export (`adjustLightness`), which passes at runtime (bun ignores unused bindings) but fails TypeScript type-checking.

## Must Fix

- `src/renderer/src/utils/colors.test.ts:3` -- `adjustLightness` is imported but never exported from `colors.ts`. This is a dead import that fails `tsc --noEmit` (`TS2305: Module '"./colors"' has no exported member 'adjustLightness'`). Remove the import.

- `src/renderer/src/utils/colors.ts:88` -- `as Record<string, string>` widens the return type, erasing the known set of CSS variable keys. This means callers get no autocomplete, no key typo protection, and no exhaustiveness checking. Remove the cast and let TypeScript infer the literal object type, or define a `ThemeVariables` interface with the exact keys and use it as the return type annotation. This also eliminates the need for the `as React.CSSProperties` cast at the call site (`App.tsx:76`), since a `Record<`--color-*`, string>` is already assignable to `CSSProperties` (which is `Record<string, ...>`-compatible via its index signature).

## Suggestions

- `src/renderer/src/utils/colors.ts:1` -- `hexToRgb` returns `number[]` (inferred). The caller at line 40 destructures `[r, g, b]` but the type system cannot verify tuple length. Change the return type to `[number, number, number]` (a 3-tuple). This gives callers compile-time assurance they will get exactly 3 elements and prevents accidental `undefined` access on indices beyond 2. Add `as const` to the return arrays or use an explicit `: [number, number, number]` annotation.

- `src/renderer/src/utils/colors.ts:1,17,27,38,48` -- None of the five exported functions have explicit return type annotations. While TypeScript infers them, explicit annotations serve as documentation, catch accidental return-type drift, and make the public API contract clearer. Add return types: `hexToRgb` returns `[number, number, number]`, `rgbToHex` returns `string`, `mixColors` returns `string`, `isDark` returns `boolean`, `generateThemeVariables` returns `ThemeVariables` (a new interface).

- `src/renderer/src/utils/colors.ts:1,27,38,48` -- All four functions accepting hex strings use plain `string`. There is no compile-time distinction between a hex color string and any other string. Consider introducing a branded type alias (`type HexColor = string & { readonly __brand: 'HexColor' }`) in `src/shared/types.ts` alongside `PaneTheme`, which already stores `background` and `foreground` as `string`. Even a simple type alias (`type HexColor = string`) without branding would improve readability at function signatures. The `PaneTheme` fields (`background`, `foreground`) could then also be typed as `HexColor`.

- `src/renderer/src/utils/colors.ts:1` -- `hexToRgb` silently returns `NaN` values for malformed input (e.g., `hexToRgb('not-a-color')` returns `[NaN, NaN, NaN]`). Since `isDark` already wraps its call in a try/catch (line 39-45), the module acknowledges invalid input is possible but does not handle it consistently. Consider either: (a) throwing in `hexToRgb` for invalid input (and documenting that callers must handle it), or (b) returning `null` and updating the signature to `[number, number, number] | null`.

- `src/renderer/src/App.tsx:69-71` -- `generateThemeVariables` is called on every render even when `activeWorkspace` has not changed. Since the function is pure, wrap it in `useMemo` keyed on `activeWorkspace.theme.background` and `activeWorkspace.theme.foreground` to avoid unnecessary object allocation. This is a performance suggestion, not strictly type design, but the current pattern also creates a new object identity each render which could trigger unnecessary re-renders in children that receive it.

## Nitpicks

- `src/renderer/src/utils/colors.ts:17` -- `rgbToHex` silently clamps out-of-range values (e.g., `rgbToHex(300, -10, 128)` returns `#ff0080`). This is tested and intentional, but the clamping behavior is not documented in the function signature or a JSDoc comment. A one-line JSDoc note would make the contract explicit.

- `src/renderer/src/utils/colors.ts:44` -- `isDark` returns `true` as a fallback for invalid input. This is a reasonable default for a dark-theme-first app, but the silent swallowing of errors could mask bugs (e.g., passing `undefined` due to a missing theme field). Consider at minimum logging in development (`import.meta.env.DEV && console.warn(...)`).

- `src/renderer/src/utils/colors.ts:30` -- `mixColors` clamps the `weight` parameter to `[0, 1]` at line 30 but does not document this clamping behavior. Callers may not realize that `weight: 2.0` silently becomes `1.0`.
