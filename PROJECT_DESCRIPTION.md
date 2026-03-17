# knkode-v2 — Project Description

## Overview
Terminal workspace manager v2. Rebuild of knkode with Tauri 2 + Rust-native terminal emulation to eliminate scroll-jump bugs inherent in xterm.js's DOM-based scrolling. Same feature set as v1, new foundation.

## Motivation
knkode v1 (Electron + xterm.js) has a persistent scroll-jump bug caused by xterm.js's internal scroll architecture — when TUI apps redraw in normal buffer mode, xterm.js's baseY collapses to 0, corrupting saved scroll state. This is unfixable in xterm.js. Alacritty/WezTerm/iTerm2 don't have this issue because they own the full scroll pipeline.

## Target Stack

| Layer | Technology | Version | Replaces (v1) |
|-------|-----------|---------|---------------|
| App framework | Tauri 2 | 2.10 | Electron 33 |
| Terminal emulation | alacritty_terminal (Rust crate) | 0.11.0 | @xterm/xterm 6.0 |
| Terminal rendering | Canvas (Phase 1), wgpu (future) | — | xterm.js WebGL addon |
| PTY | portable-pty (Rust) | 0.9.0 | node-pty |
| Frontend | React | 19 | React 19 |
| Language | TypeScript | 5.9 | TypeScript 5.7 |
| Styling | Tailwind CSS | 4.2 | Tailwind CSS 4 |
| State | Zustand | 5 | Zustand 5 |
| Split panes | TBD (allotment or custom) | — | allotment |
| Bundler | Vite (via Tauri) | 6 | electron-vite |
| Linter | Biome | 2.4 | Biome |
| Testing | Vitest | 3 | Vitest 3 |
| Testing (React) | @testing-library/react | 16 | @testing-library/react |
| Package manager | bun | 1.3 | bun |

## Architecture

### Terminal Layer (Rust)
- `alacritty_terminal` crate handles VT parsing, grid/buffer management, scroll state
- Rust owns the scroll position — no DOM scroll abstraction
- PTY management via `portable-pty` crate (cross-platform)
- Terminal state exposed to frontend via Tauri IPC (commands + events)
- GPU rendering: either wgpu-based custom renderer or canvas-based bridge

### Frontend Layer (TypeScript/React) — Target
- Will be migrated from v1 — same components, hooks, store
- Terminal component will render to canvas (receives frame data from Rust)
- All non-terminal UI (tabs, settings, status bars, context menus) stays React
- Tauri commands will replace Electron IPC invoke/handle pattern
- Tauri events will replace Electron IPC send/on pattern

### Data Flow
```
User Input → Tauri Frontend → Tauri Command → Rust PTY → Shell
Shell Output → Rust PTY → alacritty_terminal parse → Render → Tauri Event → Canvas
```

## Migration Strategy
1. **Phase 1**: Tauri scaffold + Rust terminal emulation + basic rendering (single terminal)
2. **Phase 2**: Port workspace/pane/tab system (store, layout tree, drag-drop)
3. **Phase 3**: Port theming system (16 presets, ANSI palettes, effects, pane chrome variants)
4. **Phase 4**: Port settings, snippets, keyboard shortcuts, context menus
5. **Phase 5**: Port CWD/git/PR tracking, scroll preservation, search
6. **Phase 6**: Polish, testing, platform-specific fixes (macOS vibrancy, Windows acrylic)

## Locked Decisions
- **Tailwind-only styling** — no exceptions
- **Zustand for state** — single store
- **Biome for linting**
- **bun as package manager**
- **Rust for terminal emulation** — no xterm.js
- **Tauri 2 for app framework** — no Electron
