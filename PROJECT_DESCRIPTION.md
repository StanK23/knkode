# knkode-v2 — Project Description

## Overview
Terminal workspace manager v2. Migration of knkode from Electron to Tauri 2, replacing xterm.js with Rust-native terminal emulation (`wezterm-term`) to eliminate scroll-jump bugs. Reuses v1's battle-tested React frontend via an IPC adapter layer.

## Motivation
knkode v1 (Electron + xterm.js) has a persistent scroll-jump bug caused by xterm.js's internal scroll architecture — when TUI apps redraw in normal buffer mode, xterm.js's baseY collapses to 0, corrupting saved scroll state. This is unfixable in xterm.js. WezTerm/Alacritty/iTerm2 don't have this issue because they own the full scroll pipeline.

## Migration Approach
**Reference document**: `docs/TAURI_MIGRATION_PROMPT.md` in the v1 repo (`/Users/sfory/dev/knkode/docs/TAURI_MIGRATION_PROMPT.md`)

Two core changes:
1. **Electron → Tauri 2**: Rust backend replaces Node.js main process
2. **xterm.js → wezterm-term + canvas**: Terminal emulation moves to Rust, frontend gets a custom canvas renderer

Everything else (React components, store, hooks, styles, layout logic) is **reused from v1** via a thin IPC adapter (`src/lib/tauri-api.ts`) that implements the same `window.api` interface using Tauri's `invoke()`/`listen()`.

## Target Stack

| Layer | Technology | Replaces (v1) |
|-------|-----------|---------------|
| App framework | Tauri 2 | Electron 33 |
| Terminal emulation | wezterm-term (Rust crate) | @xterm/xterm 6.0 |
| Terminal rendering | Custom canvas renderer | xterm.js WebGL addon |
| PTY | portable-pty (Rust) | node-pty |
| Frontend | React 19 + Zustand 5 + Tailwind CSS 4 | Same (reused from v1) |
| Split panes | allotment | allotment (reused) |
| Bundler | Vite 6 (via Tauri) | electron-vite |
| Linter | Biome | Biome |
| Testing | Vitest | Vitest |
| Package manager | bun | bun |

### Rust Dependencies (Cargo.toml)
```toml
tauri = { version = "2", features = ["tray-icon"] }
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
portable-pty = "0.8"
wezterm-term = "0.1"
termwiz = "0.1"
dirs = "6"
```

## Architecture

```
┌─────────────────────────────────────────────┐
│  Tauri Rust Backend (src-tauri/)            │
│  ├── main.rs         (app lifecycle)        │
│  ├── commands.rs     (IPC command handlers) │
│  ├── pty.rs          (portable-pty wrapper) │
│  ├── terminal.rs     (wezterm-term state)   │
│  ├── config.rs       (JSON file I/O)        │
│  ├── tracker.rs      (git/cwd polling)      │
│  └── menu.rs         (native menu)          │
├─────────────────────────────────────────────┤
│  IPC Adapter (TypeScript shim)              │
│  └── src/lib/tauri-api.ts                   │
├─────────────────────────────────────────────┤
│  Renderer (SAME React app from v1)          │
│  ├── React 19 + Zustand 5 + Tailwind CSS 4 │
│  ├── Custom canvas terminal (NO xterm.js)   │
│  └── allotment split panes                  │
└─────────────────────────────────────────────┘
```

### Data Flow
```
User Input → Canvas keydown → keyEventToAnsi() → window.api.writePty → Tauri Command → Rust PTY → Shell
Shell Output → Rust PTY → wezterm-term parse → GridSnapshot → Tauri Event → Canvas renderer
```

### IPC Adapter Pattern (THE KEY PIECE)
`src/lib/tauri-api.ts` implements the exact same `window.api` interface as v1's Electron preload script, but uses Tauri's `invoke()`/`listen()` instead of Electron IPC. This means **zero changes** to any v1 component, store, or hook that calls `window.api.*`.

Changes from v1's API:
- `onPtyData` → **removed** (raw bytes no longer sent to frontend)
- `onTerminalRender` → **new** (receives `GridSnapshot` from wezterm-term)

### Terminal Emulation
- wezterm-term processes all escape sequences in Rust (CSI, OSC, DCS, sixel, cursor, scrollback, alternate screen)
- Each PTY session has a `wezterm-term::Terminal` instance
- PTY reader thread feeds bytes through `advance_bytes()`, emits `GridSnapshot` via `terminal:render` event
- Frontend canvas renders the grid — no VTE parsing in JavaScript
- Built-in dirty tracking via sequence numbers for future optimization

### GridSnapshot (Rust → Frontend)
```typescript
interface GridSnapshot {
  rows: Array<Array<{
    text: string       // character(s)
    fg: string         // "#RRGGBB"
    bg: string         // "#RRGGBB"
    bold: boolean
    italic: boolean
    underline: boolean
    strikethrough: boolean
  }>>
  cursor_row: number
  cursor_col: number
  cursor_visible: boolean
  cols: number
  total_rows: number
  scrollback_rows: number
}
```

## Migration Phases (from migration prompt)

### Phase 1: Project Setup ✅
Tauri 2 scaffold with React + TypeScript + Vite + Tailwind + Zustand + Biome.

### Phase 2: IPC Adapter Layer
Create `src/lib/tauri-api.ts` — drop-in replacement for Electron preload API.

### Phase 3: Rust Backend — Commands
12 Tauri commands mapped 1:1 from Electron IPC handlers (config, PTY, app).

### Phase 4: Rust Backend — PTY Manager
portable-pty wrapper with session map, background reader threads, startup command delay.

### Phase 5: Terminal Emulation (THE CORE CHANGE)
Replace xterm.js with wezterm-term + custom canvas renderer:
- 5a: Rust terminal state machine (wezterm-term)
- 5b: Data flow (PTY → wezterm-term → GridSnapshot → canvas)
- 5c: Canvas terminal renderer (CanvasTerminal.tsx)
- 5d: IPC adapter terminal event
- 5e: Port non-xterm logic from v1's Terminal.tsx
- 5f: Key → ANSI conversion (keyEventToAnsi)

### Phase 6: Config Store (Rust)
`~/.knkode/` — workspaces.json, app-state.json, snippets.json. Atomic writes, theme migrations, sanitization.

### Phase 7: CWD Tracker (Rust)
3s polling: CWD via lsof, git branch, PR status via gh CLI. PATH augmentation.

### Phase 8: Window Configuration
Platform-specific: macOS vibrancy + hiddenInset titlebar, Windows acrylic, Linux opaque. Bounds persistence.

### Phase 9: Native Menu
macOS app menu + Edit/View/Window. Windows/Linux: Edit + View + Window.

### Phase 10: Frontend Changes (MINIMAL)
- Delete v1 Electron/xterm files
- Create IPC adapter + CanvasTerminal + key-to-ansi
- Update Pane.tsx import, App.tsx xterm CSS removal
- Build system: electron-vite → vite.config.ts

## Locked Decisions
- **Tailwind-only styling** — no exceptions
- **Zustand for state** — single store
- **Biome for linting**
- **bun as package manager**
- **wezterm-term for terminal emulation** — no xterm.js, no alacritty_terminal
- **Tauri 2 for app framework** — no Electron
- **IPC adapter pattern** — v1 React code reused via window.api shim
- **portable-pty for PTY** — cross-platform
- **Canvas for terminal rendering** — custom renderer from GridSnapshot

## V1 Source Reference
V1 codebase: `/Users/sfory/dev/knkode/`
- Main process: `src/main/` (index.ts, ipc.ts, pty-manager.ts, config-store.ts, cwd-tracker.ts)
- Renderer: `src/renderer/src/` (components/, hooks/, store/, lib/, utils/, data/)
- Shared types: `src/shared/types.ts`
- Preload bridge: `src/preload/index.ts`
- Migration prompt: `docs/TAURI_MIGRATION_PROMPT.md`
