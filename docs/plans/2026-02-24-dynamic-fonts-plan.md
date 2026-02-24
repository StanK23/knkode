# Dynamic Workspace Fonts Plan
Date: 2026-02-24

## Objective
Extend the dynamic theming system to include typography. This ensures that when a workspace is switched, the entire UI (tabs, settings, labels) adopts the font family and a relative font size derived from the workspace terminal settings.

## Scope & Tasks

### PR #1: `feat/dynamic-workspace-fonts`
**Branch:** `feat/dynamic-workspace-fonts`

1. **Update `generateThemeVariables` (`colors.ts`):**
   - Accept `fontFamily: string | undefined` and `fontSize: number`.
   - Return `--font-family-ui` (fallback to `var(--font-mono-fallback)` if undefined).
   - Return `--font-size-ui` (derived from `fontSize`, e.g., `fontSize - 1` capped at a reasonable range).

2. **Update `App.tsx`:**
   - Pass `activeWorkspace.theme.fontFamily` and `activeWorkspace.theme.fontSize` to `generateThemeVariables`.
   - Ensure `useMemo` dependencies are updated.

3. **Update `global.css`:**
   - Define `--font-mono-fallback` in `@theme` (current IBM Plex Mono stack).
   - Set default `--font-family-ui` and `--font-size-ui` in `@theme`.
   - Use `var(--font-family-ui)` and `var(--font-size-ui)` in `html, body, #root`.

4. **Verify Consistency:**
   - Check that tabs and settings panel remain usable with different font families (Hack, JetBrains Mono, etc.).

## Execution
- Create branch `feat/dynamic-workspace-fonts`.
- Implement changes in `colors.ts`, `App.tsx`, and `global.css`.
- Run build and tests.
- Submit PR for review.
