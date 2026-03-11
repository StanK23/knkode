# Morphing Pane Status Bar — Design

**Created:** 2026-03-11

## Overview

Each identity theme gets its own pane status bar **variant** — not just color changes but different layout, structure, typography, badge shapes, separators, and border styles. The scroll-to-bottom button also morphs per variant. 16 unique variants, one per theme.

## Architecture

### Component Structure

```
src/renderer/src/components/pane-chrome/
├── index.ts                    # VARIANT_REGISTRY + PaneChrome/ScrollButton wrappers
├── types.ts                    # Shared StatusBarProps, ScrollButtonProps
├── DefaultVariant.tsx          # Fallback for unknown/missing themes
├── MatrixVariant.tsx
├── CyberpunkVariant.tsx
├── SolanaVariant.tsx
├── AmberVariant.tsx
├── VaporwaveVariant.tsx
├── OceanVariant.tsx
├── SunsetVariant.tsx
├── ArcticVariant.tsx
├── DefaultDarkVariant.tsx
├── DraculaVariant.tsx
├── TokyoNightVariant.tsx
├── NordVariant.tsx
├── CatppuccinVariant.tsx
├── GruvboxVariant.tsx
├── MonokaiVariant.tsx
└── SolarizedVariant.tsx
```

### Variant Interface

Each variant file exports two components:

```tsx
interface StatusBarProps {
  label: string
  cwd: string                   // Already shortened (~/...)
  branch: string | null
  isFocused: boolean
  canClose: boolean
  theme: {
    background: string
    foreground: string
    accent: string
    glow?: string
  }
  onSplitVertical: () => void
  onSplitHorizontal: () => void
  onClose: () => void
  onDoubleClickLabel: () => void
  isEditing: boolean
  editInputProps: React.InputHTMLAttributes<HTMLInputElement>
  snippetDropdown: React.ReactNode
}

interface ScrollButtonProps {
  onClick: () => void
  theme: {
    background: string
    foreground: string
    accent: string
    glow?: string
  }
}

interface PaneVariant {
  StatusBar: React.FC<StatusBarProps>
  ScrollButton: React.FC<ScrollButtonProps>
}
```

### Variant Selection

```tsx
const VARIANT_REGISTRY: Record<string, PaneVariant> = {
  'Matrix': MatrixVariant,
  'Cyberpunk': CyberpunkVariant,
  // ...all 16
}

// In Pane.tsx:
const variant = VARIANT_REGISTRY[presetName] ?? DefaultVariant
<variant.StatusBar {...props} />

// In Terminal.tsx:
<variant.ScrollButton onClick={scrollToBottom} theme={theme} />
```

### Integration Points

**Pane.tsx changes:**
- Replace inline header JSX with `<PaneChrome />` wrapper
- Keep the outer `draggable` div + context menu in Pane.tsx (shared across all variants)
- PaneChrome reads the active preset name and delegates to the correct variant

**Terminal.tsx changes:**
- Replace inline scroll button with variant's `ScrollButton`
- Needs to receive the preset name (threaded via prop or store)

### Functional Requirements (preserved across all variants)

- Drag-to-reorder: outer div stays `draggable`, wraps the variant
- Right-click context menu: stays in Pane.tsx, renders on top
- Inline label rename: variant receives `isEditing`/`editInputProps` and renders the input
- Keyboard shortcuts: action buttons keep existing titles/aria-labels
- Focus ring: all interactive elements have `focus-visible:ring-1`
- SnippetDropdown: passed as `React.ReactNode`, variant places it where it fits

## Variant Designs

### Identity Themes

#### 1. Matrix — Shell prompt on a CRT
- **Height:** ~24px compact
- **Typography:** Monospace, uppercase labels
- **CWD:** `> ~/dev/knkode` (prompt prefix)
- **Branch:** `[main]` plain bracketed text
- **Actions:** Text chars `┃ ━ ✕`
- **Separators:** Pipe `|`
- **Border:** Thin solid green bottom line
- **Focus:** Brighter green text
- **Scroll:** `[▼ SCROLL TO BOTTOM]` monospace, full-width

#### 2. Cyberpunk — Neon HUD display
- **Height:** ~32px, wider letter-spacing
- **Typography:** Bold, uppercase, tracked out
- **CWD:** `// ~/dev/knkode` (system path prefix)
- **Branch:** Neon pill with angled clip-path corners, glow on hover
- **Actions:** Small SVG icons with glow hover
- **Separators:** Angled slash `/`
- **Border:** Bottom border with neon glow (box-shadow)
- **Focus:** Full glow border activates
- **Scroll:** Angular bar with neon border + glow, `↓ BOTTOM`

#### 3. Solana — Crypto dashboard
- **Height:** ~30px
- **Typography:** Clean, medium weight
- **CWD:** Folder icon + path, accent-colored icon
- **Branch:** Pill badge with gradient fill (purple → green)
- **Actions:** Clean icon buttons with accent ring on hover
- **Separators:** Dot `·`
- **Border:** Bottom gradient line (purple → green)
- **Focus:** Gradient border brightens
- **Scroll:** Rounded pill bottom-center with gradient border

#### 4. Amber — IBM 3278 phosphor display
- **Height:** ~24px compact
- **Typography:** Monospace, ALL CAPS
- **CWD:** `CWD: ~/DEV/KNKODE`
- **Branch:** `BR: MAIN` abbreviated label
- **Actions:** `[SPLIT-V] [SPLIT-H] [CLOSE]` bracketed text
- **Separators:** Pipe `│`
- **Border:** Dotted bottom border
- **Focus:** Brighter amber, subtle text-shadow
- **Scroll:** `>>> SCROLL DOWN <<<` full-width, blinking `_` cursor

#### 5. Vaporwave — Synthwave maximalism
- **Height:** ~44px (2-row layout)
- **Row 1:** CWD with gradient text (pink → cyan), branch pill
- **Row 2:** Rounded pill action buttons with gradient fills
- **Typography:** Wide letter-spacing, light weight
- **Branch:** Large rounded pill with pink-cyan gradient
- **Separators:** None — generous padding
- **Border:** Thick (3px) bottom gradient (pink → cyan → purple)
- **Focus:** Gradient border intensifies, glow halo
- **Scroll:** Large soft pill floating bottom-center, gradient fill, `↓`

#### 6. Ocean — Bioluminescent depths
- **Height:** ~28px
- **Typography:** Light weight, smooth
- **CWD:** Wave `~` icon + path, text fades (gradient mask at end)
- **Branch:** Translucent rounded badge (background at 20% opacity)
- **Actions:** Ghost buttons — invisible until hover, then soft glow
- **Separators:** None — flex spacing
- **Border:** None — subtle bottom box-shadow for depth
- **Focus:** Subtle bioluminescent glow at bottom edge
- **Scroll:** Floating bubble bottom-right, circular-ish, translucent + glow

#### 7. Sunset — Golden hour editorial
- **Height:** ~30px
- **Typography:** Medium weight, warm
- **CWD:** Sun `☀` icon + path
- **Branch:** Warm amber badge with rounded corners
- **Actions:** Warm-toned icon buttons
- **Separators:** Thin warm vertical line
- **Border:** Top-down gradient fade (golden top → transparent)
- **Focus:** Warm glow at top edge
- **Scroll:** Warm pill floating bottom-center, golden border, `↓`

#### 8. Arctic — Frozen crystalline precision
- **Height:** ~28px
- **Typography:** Thin/light weight, wide tracking
- **CWD:** Crystal `◆` icon + path
- **Branch:** Sharp rectangular badge (0 radius), thin ice-blue border
- **Actions:** Sharp geometric icon buttons
- **Separators:** Thin icy vertical line
- **Border:** Crisp 1px bottom in ice-blue
- **Focus:** Border brightens to white-blue
- **Scroll:** Sharp rectangle, thin border, no rounding, `↓ BOTTOM`

### Classic Themes

#### 9. Default Dark — Clean modern baseline
- **Height:** ~30px
- **Typography:** System UI, clean
- **CWD:** Folder icon + path
- **Branch:** Git icon + rounded badge with accent background
- **Actions:** Clean SVG icon buttons
- **Separators:** Dot `·`
- **Border:** 1px bottom in edge color
- **Focus:** Accent bottom border
- **Scroll:** Standard rounded bar bottom-center, `↓ Scroll to bottom`

#### 10. Dracula — Gothic elegance
- **Height:** ~30px
- **Typography:** Medium weight, refined
- **CWD:** Folder icon (purple), path text
- **Branch:** Rounded badge with purple 15% tint
- **Actions:** Icons with purple hover glow
- **Separators:** Thin purple-tinted vertical line
- **Border:** 1px bottom with purple tint
- **Focus:** Purple border-bottom
- **Scroll:** Rounded pill with purple border, `↓ bottom`

#### 11. Tokyo Night — Japanese refinement
- **Height:** ~26px (slimmer)
- **Typography:** Light weight, 10px, refined
- **CWD:** No icon, just muted path text
- **Branch:** Slim inline accent blue text, no badge background
- **Actions:** Appear on hover/focus only (fully hidden otherwise)
- **Separators:** None
- **Border:** Very subtle 1px, barely visible
- **Focus:** Blue accent border fades in
- **Scroll:** Minimal floating label bottom-right, just `↓` in accent

#### 12. Nord — Scandinavian minimalism
- **Height:** ~28px, generous padding
- **Typography:** Regular weight, generous letter-spacing
- **CWD:** Just path text, no icon
- **Branch:** Accent text with 5% tint background
- **Actions:** Muted icons, visible but quiet
- **Separators:** None — breathing room
- **Border:** Soft 1px bottom
- **Focus:** Slightly brighter border
- **Scroll:** Centered text `↓ scroll to bottom` — no pill, just text

#### 13. Catppuccin — Soft pastel comfort
- **Height:** ~30px
- **Typography:** Regular weight, friendly
- **CWD:** Soft folder icon + path
- **Branch:** Soft rounded badge with lavender 12% tint
- **Actions:** Pastel buttons with soft rounded hover
- **Separators:** Soft dot `·`
- **Border:** Soft 1px pastel bottom
- **Focus:** Lavender bottom border
- **Scroll:** Soft rounded pill, pastel fill, `↓ bottom`

#### 14. Gruvbox — Retro earthy warmth
- **Height:** ~28px
- **Typography:** Medium weight, slightly condensed
- **CWD:** Orange `▸` caret + path
- **Branch:** Square-ish badge (2px radius), orange 15% tint
- **Actions:** Warm-toned icons
- **Separators:** Em-dash `—`
- **Border:** Warm 1px bottom
- **Focus:** Orange bottom border
- **Scroll:** Rectangular bar, warm border, `↓ bottom`

#### 15. Monokai — Classic hacker
- **Height:** ~28px
- **Typography:** Regular weight
- **CWD:** Green `▶` arrow + path
- **Branch:** Green-tinted rounded badge
- **Actions:** Color-coded icons (split=cyan, close=red)
- **Separators:** Pipe `|`
- **Border:** 1px bottom
- **Focus:** Green accent border
- **Scroll:** Compact bar, green accent left-border, `↓ scroll to bottom`

#### 16. Solarized Light — Warm light outlier
- **Height:** ~30px
- **Typography:** Regular weight
- **CWD:** Folder icon + dark path on light background
- **Branch:** Blue (#268bd2) badge on cream
- **Actions:** Dark muted icons
- **Separators:** Thin warm vertical line
- **Border:** Warm subtle bottom border
- **Focus:** Blue bottom border
- **Scroll:** Light cream pill with blue border, `↓ bottom`

## Performance

All animations are CSS-only (transitions, box-shadow, opacity, clip-path). No JavaScript animation. Re-renders only on branch change (3s poll), cwd change, or focus change. The terminal (WebGL) is orders of magnitude heavier.

## Key Decisions

- 16 unique variant files (one per theme, not shared archetypes)
- Free-form height/layout per variant (Vaporwave is 2-row, Matrix is 24px)
- Context menu stays in Pane.tsx (shared), not in variants
- Scroll button is part of each variant's design language
- Pane index removed from status bar (was optional, dropped)
