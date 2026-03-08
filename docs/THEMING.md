# Theming Guide

How the knkode theming system works — for contributors adding new themes or modifying existing ones.

## Architecture Overview

Themes flow through three layers:

```
ThemePreset (data)  →  generateThemeVariables (CSS vars)  →  UI components
                    →  buildXtermTheme (xterm.js ITheme)   →  Terminal
```

1. **Preset data** (`src/renderer/src/data/theme-presets.ts`) — static color definitions
2. **CSS variable engine** (`src/renderer/src/utils/colors.ts`) — derives surface levels, content tiers, and effects from bg/fg
3. **xterm.js theme** (`buildXtermTheme`) — maps ANSI colors to terminal emulator

## Theme Preset Structure

Each preset in `THEME_PRESETS` has:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Display name shown in settings grid |
| `background` | `string` | Yes | Terminal background hex (`#RRGGBB`) |
| `foreground` | `string` | Yes | Terminal foreground hex |
| `ansiColors` | `AnsiColors` | Yes* | 16 ANSI color slots (see below) |
| `accent` | `string` | No | UI accent color — buttons, focus rings, active indicators |
| `glow` | `string` | No | Glow effect color — `box-shadow` on themed elements |

*All current presets define `ansiColors`. When omitted, xterm.js uses built-in defaults.

### ANSI Color Slots

The `AnsiColors` interface maps to the standard 16-color terminal palette:

```
Normal:  black, red, green, yellow, blue, magenta, cyan, white
Bright:  brightBlack, brightRed, brightGreen, brightYellow,
         brightBlue, brightMagenta, brightCyan, brightWhite
```

Programs request colors by name (e.g., "red" for errors) but get whatever hex value the theme maps to that slot. This is how identity themes work — Matrix remaps all slots to green shades, so `red` text appears green.

## Preset Categories

### Community themes (general-purpose)
Standard color schemes developers expect: Dracula, Tokyo Night, Nord, Catppuccin, Gruvbox, Monokai, Solarized Light. Each has a distinct color temperature and personality but uses conventional ANSI mappings (red is red, blue is blue).

### Identity themes (brand/aesthetic, always have accent + glow)
Themes built around a single brand or aesthetic identity: Matrix, Cyberpunk, Solana. These remap ANSI colors to match the theme's personality — a Matrix terminal is entirely green, a Cyberpunk terminal is neon pink and cyan. All identity themes require both `accent` and `glow`.

## CSS Custom Properties

`generateThemeVariables()` derives a full set of CSS variables from `bg`, `fg`, and optional overrides:

### Surfaces (auto-derived from background)
| Variable | Description |
|----------|-------------|
| `--color-canvas` | Base background |
| `--color-elevated` | Slightly lighter/darker than canvas (modals, popovers) |
| `--color-sunken` | Recessed areas (input fields, code blocks) |
| `--color-overlay` | Overlay panels |
| `--color-overlay-hover` | Overlay hover state |
| `--color-overlay-active` | Overlay active state |

Surface levels are derived by mixing the background with white (dark mode) or black (light mode). The engine auto-detects dark vs light from background luminance.

### Content (auto-derived from foreground)
| Variable | Description |
|----------|-------------|
| `--color-content` | Primary text |
| `--color-content-secondary` | 80% fg blended with bg |
| `--color-content-muted` | 55% fg blended with bg |

### Accents & Effects
| Variable | Description |
|----------|-------------|
| `--color-accent` | Per-theme accent or auto-derived (`#6c63ff` dark / `#4d46e5` light) |
| `--color-danger` | Error/destructive actions (`#e74c3c`, constant) |
| `--color-edge` | Borders — 85% bg + 15% fg tint |
| `--theme-glow` | Box-shadow value or `none` — e.g., `0 0 12px rgba(189, 147, 249, 0.4)` |

### Typography
| Variable | Description |
|----------|-------------|
| `--font-family-ui` | UI font (from preset or fallback chain) |
| `--font-size-ui` | Terminal font size minus 1px, clamped to 11–15px |

## Creating a New Theme

### 1. Choose your identity

Decide if this is a community theme (conventional ANSI mapping) or an identity theme (remapped ANSI for a specific aesthetic).

### 2. Define the preset

Add to `THEME_PRESETS` in `src/renderer/src/data/theme-presets.ts`:

```typescript
{
    name: 'Your Theme',
    background: '#1a1b26',
    foreground: '#a9b1d6',
    accent: '#7aa2f7',     // optional — auto-derived if omitted
    glow: '#7aa2f7',       // optional — no glow if omitted
    ansiColors: {
        black: '#15161e',
        red: '#f7768e',
        green: '#9ece6a',
        yellow: '#e0af68',
        blue: '#7aa2f7',
        magenta: '#bb9af7',
        cyan: '#7dcfff',
        white: '#a9b1d6',
        brightBlack: '#414868',
        brightRed: '#f7768e',
        brightGreen: '#9ece6a',
        brightYellow: '#e0af68',
        brightBlue: '#7aa2f7',
        brightMagenta: '#bb9af7',
        brightCyan: '#7dcfff',
        brightWhite: '#c0caf5',
    },
},
```

### 3. Color guidelines

- **Background + foreground**: Ensure sufficient contrast (WCAG AA minimum). Dark themes: bg luminance < 0.2, fg luminance > 0.6. Light themes: invert.
- **ANSI colors**: Each should be distinguishable against the background. For community themes, keep conventional associations (red = errors, green = success).
- **Accent**: Should contrast with both canvas and content. Avoid colors too close to danger (`#e74c3c`).
- **Glow**: Use the accent or a complementary color. The engine applies it at 40% opacity in a 12px box-shadow.

### 4. For identity themes

- Remap ANSI slots to your palette. The green channel should dominate for Matrix-style monochrome.
- Always provide both `accent` and `glow`.
- Add the theme name to the identity themes test in `theme-presets.test.ts`.

### 5. Validation

All color values are validated:
- `isValidHex()` accepts `#RGB`, `#RRGGBB`, or bare `RGB`/`RRGGBB`
- Data integrity tests automatically check all presets for valid hex values
- ANSI colors are validated before passing to xterm.js — invalid values are skipped
- Font family is checked against the `TERMINAL_FONTS` allowlist

Run tests after adding a preset:

```bash
bun run test
```

## File Reference

| File | Purpose |
|------|---------|
| `src/shared/types.ts` | `AnsiColors`, `PaneTheme` interfaces |
| `src/renderer/src/data/theme-presets.ts` | Preset data, `buildXtermTheme`, `findPreset` |
| `src/renderer/src/utils/colors.ts` | `generateThemeVariables`, color utilities |
| `src/renderer/src/styles/global.css` | CSS variable defaults and consumption |
| `src/renderer/src/App.tsx` | Applies theme variables to root element |
| `src/renderer/src/components/SettingsPanel.tsx` | Theme picker UI (radiogroup) |
| `src/renderer/src/components/Terminal.tsx` | Passes xterm theme to terminal |
