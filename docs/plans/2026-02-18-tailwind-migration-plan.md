# knkode — Tailwind CSS Migration Plan

## Context
The current UI uses 100% inline `React.CSSProperties` objects + CSS custom properties in a single `global.css`. Hover states use imperative DOM mutation (`onMouseEnter`/`onMouseLeave`). This approach causes visual bugs, inconsistencies, and makes hover/focus/active states fragile. Migrating to Tailwind CSS v4 will fix these issues and provide a proper utility-first styling system.

## Branch
`refactor/tailwind-migration`

## PR Title
`refactor: migrate from inline styles to Tailwind CSS v4`

---

## Task 1: Install & configure Tailwind CSS v4
**Files:**
- `package.json` — add `tailwindcss`, `@tailwindcss/vite`
- `electron.vite.config.ts` — add Tailwind Vite plugin to renderer
- `src/renderer/src/styles/global.css` — rewrite with `@import "tailwindcss"`, `@theme` for design tokens, keep drag-region/sash overrides
- `src/renderer/index.html` — verify CSP allows Tailwind output

### Details
- Install: `bun add -d tailwindcss @tailwindcss/vite`
- Add `tailwindcss()` plugin to `renderer.plugins` in `electron.vite.config.ts`
- Rewrite `global.css`:
  ```css
  @import "tailwindcss";

  @theme {
    --color-bg-primary: #1a1a2e;
    --color-bg-secondary: #16213e;
    --color-bg-tertiary: #0f1626;
    --color-bg-tab: #232946;
    --color-bg-tab-active: #2d3561;
    --color-bg-tab-hover: #283050;
    --color-text-primary: #e0e0e0;
    --color-text-secondary: #8892b0;
    --color-text-dim: #5a6380;
    --color-border: #2a2f4a;
    --color-accent: #6c63ff;
    --color-danger: #e74c3c;
  }
  ```
- Keep non-Tailwind rules: box-sizing reset (Tailwind preflight handles this), drag-region, sash overrides, scrollbar styles
- Keep `--radius`, `--tab-height`, `--pane-header-height`, `--drag-region-height`, `--traffic-light-offset` as plain CSS variables (not all need to be in @theme)

---

## Task 2: Convert App.tsx
**Files:** `src/renderer/src/App.tsx`

### Details
- Replace all inline style objects (`appStyle`, `loadingStyle`, `emptyStyle`, `paneWrapperActiveStyle`, `paneWrapperHiddenStyle`) with Tailwind classes
- Root layout: `className="flex flex-col h-full w-full bg-bg-primary text-text-primary"`
- Workspace wrappers: active = `className="flex flex-1 overflow-hidden"`, hidden = `className="hidden"`
- Remove all `const ...Style: React.CSSProperties` declarations

---

## Task 3: Convert TabBar.tsx
**Files:** `src/renderer/src/components/TabBar.tsx`

### Details
- Replace all inline style objects with Tailwind classes
- **Fix hover states**: Remove `onMouseEnter`/`onMouseLeave` imperative DOM mutations, use Tailwind `hover:` variants instead
- Drag region: keep `className="drag-region"` (needs actual CSS rule for `-webkit-app-region`)
- No-drag elements: use inline `style={{ WebkitAppRegion: 'no-drag' }}` only for the Electron-specific property (Tailwind can't do this)
- Closed workspaces dropdown: use Tailwind positioning and colors
- Remove all `const ...Style` declarations

---

## Task 4: Convert Tab.tsx
**Files:** `src/renderer/src/components/Tab.tsx`

### Details
- Replace inline style objects with Tailwind classes
- **Fix hover states**: Remove `onMouseEnter`/`onMouseLeave`, use `hover:bg-bg-tab-hover` etc.
- Dynamic styles (workspace color, drag state) — use conditional `className` strings or minimal inline `style` only for truly dynamic values (e.g., `borderColor` from workspace color prop)
- Context menu: Tailwind classes for positioning, bg, border, shadow
- Color palette/swatches: Tailwind + inline for dynamic swatch colors
- Remove imports from `styles/shared.ts`

---

## Task 5: Convert Pane.tsx
**Files:** `src/renderer/src/components/Pane.tsx`

### Details
- Replace inline style objects with Tailwind classes
- Focus state: conditional classes instead of swapping between two style objects
- Pane header: `className="flex items-center gap-1 px-2 ..."` with focus variant
- Context menu + sub-forms (CWD, startup cmd, theme override): Tailwind classes
- Remove imports from `styles/shared.ts`
- Remove `onMouseEnter`/`onMouseLeave` hover hacks

---

## Task 6: Convert PaneArea.tsx
**Files:** `src/renderer/src/components/PaneArea.tsx`

### Details
- Minimal changes — only has one inline style (`flex: 1, overflow: hidden`)
- Replace with `className="flex-1 overflow-hidden"`
- Keep allotment CSS import

---

## Task 7: Convert Terminal.tsx
**Files:** `src/renderer/src/components/Terminal.tsx`

### Details
- Replace inline style with `className="w-full h-full"` + inline `style={{ opacity }}` only for dynamic opacity
- Keep xterm CSS import

---

## Task 8: Convert SettingsPanel.tsx
**Files:** `src/renderer/src/components/SettingsPanel.tsx`

### Details
- Replace all inline style objects with Tailwind classes
- Overlay: `className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center"`
- Panel: Tailwind for width, max-height, bg, border, rounded, shadow
- Form fields: Tailwind input/label/button styles
- Footer buttons (delete/cancel/save): Tailwind with hover variants
- Remove imports from `styles/shared.ts`

---

## Task 9: Convert LayoutPicker.tsx
**Files:** `src/renderer/src/components/LayoutPicker.tsx`

### Details
- Replace inline style objects with Tailwind classes
- Grid: `className="grid grid-cols-3 gap-2"`
- Active preset: conditional accent border/bg classes
- Remove imports from `styles/shared.ts`

---

## Task 10: Remove shared.ts & cleanup
**Files:**
- Delete `src/renderer/src/styles/shared.ts`
- Delete `src/renderer/src/types/css.d.ts` (if WebkitAppRegion augmentation is no longer needed — check if any component still uses typed inline style for it; if so, keep it)
- Verify no remaining imports of shared.ts
- Run `bun run lint:fix` and `bun run build` to confirm

---

## Task 11: Visual polish & verify
- Launch app with `bun run dev` and test all interactions
- Verify: tab hover, tab active, tab drag, pane focus, pane context menu, settings panel, layout picker, split/close, scrollbar, drag region
- Fix any visual regressions found during testing

---

## Migration Rules
1. **Only Tailwind classes** — no inline styles except for truly dynamic values (runtime colors, opacity) and `WebkitAppRegion`
2. **No `onMouseEnter`/`onMouseLeave` for hover** — use Tailwind `hover:` variant
3. **Design tokens** defined in `@theme` directive, consumed as Tailwind utilities (e.g., `bg-bg-primary`, `text-text-secondary`)
4. **Conditional classes** via template literals — no `clsx`/`cn` library needed for this scope
5. **Keep third-party CSS imports** (`allotment`, `xterm`) unchanged
