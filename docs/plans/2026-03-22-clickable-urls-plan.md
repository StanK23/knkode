# Clickable URLs in Terminal — Plan

**Created:** 2026-03-22

## Design

### Architecture

URL detection happens in Rust when building GridSnapshot. Each cell gets an optional `link` field containing the URL it belongs to. The frontend canvas renderer handles hover highlighting and Cmd+click to open.

```
wezterm-term cells → Rust URL detection → GridSnapshot (cells with link field)
                                              ↓
Canvas renderer ← mousemove + Cmd key → highlight URL cells + pointer cursor
                                              ↓
                     Cmd+click → openExternal(url)
```

Two URL sources per cell:
1. **OSC 8 explicit hyperlinks** — read from `cell.attrs().hyperlink()` (wezterm-term native)
2. **Bare URL regex** — scan each row's text for URL patterns, annotate matching cells

### Key Decisions

- **Activation**: Cmd+click (macOS) / Ctrl+click (Windows/Linux) — industry standard for terminals, avoids selection conflict
- **Visual treatment**: Underline + accent color on modifier+hover, pointer cursor. No visual treatment when idle.
- **URL scope**: http/https URLs + localhost/127.0.0.1 with ports
- **Detection location**: Rust side — URL metadata embedded in GridSnapshot cells for single-source-of-truth
- **Per-cell link field**: Each cell in a URL range carries the same `link` string. Frontend finds extent by scanning adjacent cells with matching link values.

### Data Model Change

CellSnapshot gains one optional field:

```typescript
interface CellSnapshot {
  text: string;
  fg: string;
  bg: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  link?: string;        // URL if this cell is part of a clickable link
  images?: readonly ImageCellSnapshot[];
}
```

Rust `CellSnapshot` struct gains matching `link: Option<String>`.

### URL Regex (Rust)

```
https?://[^\s<>"{}|\\^`\[\]]+
(?:localhost|127\.0\.0\.1):\d+[^\s<>"{}|\\^`\[\]]*
```

Trailing punctuation cleanup: strip `)`, `]`, `.`, `,`, `;`, `:` when they appear at the end and don't have a matching opener in the URL.

### Hover & Click Logic

```
mousemove:
  1. If Cmd/Ctrl NOT held → clear hover state, return
  2. cellAtPixel() → get row, col
  3. Check grid.rows[row][col].link
  4. If link → scan left/right for same link value (full extent)
  5. Store hovered link range in ref
  6. Set canvas cursor to "pointer"
  7. Redraw affected row with accent color + underline on link cells

mousedown:
  8. If Cmd/Ctrl held + cell has link → openExternal(link), prevent selection
  9. Otherwise → existing selection behavior

keyup (Cmd/Ctrl release):
  10. Clear hover highlight, restore cursor
```

### Edge Cases

- **Wide characters**: URL detection uses text positions, mapped back to cell indices accounting for wide chars
- **Wrapped lines**: Detected per-row (each segment independently clickable) — matches iTerm2 behavior
- **Scrollback**: Links work on any visible row since GridSnapshot includes link field for all rows
- **Selection conflict**: Cmd+click opens link, plain click starts selection (no conflict)
- **OSC 8 priority**: Explicit hyperlinks from OSC 8 override regex-detected URLs on the same cell

## Tasks

### Task 1: Rust URL detection + GridSnapshot link field
- **Branch:** `feature/clickable-urls`
- **PR title:** feat: clickable URLs in terminal
- **Scope:** Rust CellSnapshot, TypeScript CellSnapshot, URL regex, canvas hover/click
- **Details:**
  - Add `link: Option<String>` to Rust `CellSnapshot` struct with `#[serde(skip_serializing_if = "Option::is_none")]`
  - Add `link?: string` to TypeScript `CellSnapshot` interface
  - Build URL regex (http/https + localhost/IP:port) with trailing punctuation cleanup
  - After building each row's cells, scan row text for URL matches, set `link` on matching cells
  - Check `cell.attrs().hyperlink()` for OSC 8 links (priority over regex)
  - Add `onMouseMove` handler to canvas — track hovered cell, check for link + Cmd/Ctrl held
  - On Cmd+hover over link: find full extent, redraw row with accent underline, set `cursor: pointer`
  - On Cmd+click: call `window.api.openExternal(url)`, prevent selection start
  - Track Cmd/Ctrl keydown/keyup to clear hover state on modifier release
  - Respect `prefers-reduced-motion` — skip hover animation, keep static underline
