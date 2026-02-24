# PR #47 Test Coverage Review

## Summary

The new `colors.ts` utility has solid foundational test coverage for its pure functions (`hexToRgb`, `rgbToHex`, `mixColors`, `isDark`, `generateThemeVariables`). The store test mock addition for `getSnippets` is necessary but incomplete. The test file imports a non-existent symbol (`adjustLightness`), and `generateThemeVariables` tests use weak assertions (`toBeDefined`) for derived values instead of verifying the actual color math. No critical behavioral gaps exist that would cause production failures, but a few fixes would improve robustness.

## Must Fix

- `src/renderer/src/utils/colors.test.ts:3` -- **Phantom import: `adjustLightness` is imported but does not exist in `colors.ts`.** The test file currently passes because Vitest tree-shakes unused imports, but this is misleading and will confuse anyone reading the tests. It suggests a function was intended but never implemented, or was removed without updating the test. Remove the import. (Criticality: 8/10 -- dead import signals missing functionality or stale code)

- `src/renderer/src/store/index.test.ts:28` -- **`getSnippets` mock returns `undefined` instead of `[]`.** The mock is declared as `vi.fn<() => Promise<[]>>()` but never configured with `mockResolvedValue([])` in the `beforeEach` block (lines 75-84). Since `vi.fn()` returns `undefined` by default (not a resolved Promise), `Promise.all` in `init()` resolves `snippets` to `undefined`. The store then calls `set({ snippets: undefined })`, silently corrupting state. This does not break current tests because none assert on `snippets`, but it masks bugs. Add `mockApi.getSnippets.mockResolvedValue([])` in `beforeEach` alongside the other mock setups. (Criticality: 8/10 -- latent mock gap could mask real init failures)

## Suggestions

- `src/renderer/src/utils/colors.test.ts:47-63` -- **`generateThemeVariables` tests use `.toBeDefined()` for derived surface colors.** The assertions for `--color-elevated` and `--color-sunken` only check existence, not correctness. Since these are computed by `mixColors` (which is already tested), a stronger test would assert the actual hex values, or at minimum assert that elevated is lighter than canvas for dark themes and darker than canvas for light themes. This would catch regressions in the mix ratios (e.g., if someone changes `0.95` to `0.5`). (Criticality: 6/10 -- weak assertions miss ratio regressions)

- `src/renderer/src/utils/colors.test.ts` -- **Missing: `generateThemeVariables` returns all 12 CSS variable keys.** There is no test asserting the complete set of keys returned by the function. If a key is accidentally dropped (e.g., `--color-overlay-hover`), no test would catch it. A simple `expect(Object.keys(theme)).toHaveLength(12)` or an assertion against the expected key set would prevent this. (Criticality: 5/10 -- structural completeness)

- `src/renderer/src/utils/colors.test.ts` -- **Missing: `mixColors` boundary cases for weight=0 and weight=1.** The tests cover weight=0.5 and weight=0.9, but not the boundaries. `weight=0` should return `color2` and `weight=1` should return `color1`. These are the most common edge cases for interpolation bugs. (Criticality: 5/10 -- boundary coverage for interpolation)

- `src/renderer/src/utils/colors.test.ts` -- **Missing: `hexToRgb` with invalid input.** The function does not validate input. Passing `'notahex'`, `''`, or `'#gggggg'` would produce `NaN` values. Since `isDark` wraps `hexToRgb` in a try/catch, a test confirming that `isDark` returns `true` (the fallback) for garbage input would document the graceful degradation path. (Criticality: 5/10 -- documents defensive behavior)

- `src/renderer/src/utils/colors.test.ts` -- **Missing: `isDark` threshold boundary test.** The luminance threshold is `0.5`. A test with a color exactly at the boundary (e.g., `#808080` which has luminance ~0.502) would document the threshold behavior. (Criticality: 3/10 -- nice-to-have for threshold documentation)

## Nitpicks

- `src/renderer/src/utils/colors.test.ts:31-34` -- The `mixColors` test case `mixColors('#000000', '#ffffff', 0.9)` producing `#191919` is a valid test but the expectation is non-obvious. A brief inline comment explaining why 90% black + 10% white = `#191919` (i.e., `0.1 * 255 = 25.5 rounds to 25 = 0x19`) would improve readability.

- `src/renderer/src/utils/colors.test.ts:1-9` -- All imports are grouped into a single `describe` block with flat `it()` calls. Consider splitting into `describe('hexToRgb')`, `describe('rgbToHex')`, etc., for clearer test runner output and easier debugging when a specific function regresses.
