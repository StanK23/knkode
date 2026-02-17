# knkode — Terminal Workspace Manager

## Purpose

A Mac-first (cross-platform ready) Electron app that organizes terminal sessions into persistent workspaces with Chrome-like tabs, configurable split layouts, and full theming. Solves the pain of navigating to the same folders, losing context across restarts, and managing multiple projects simultaneously.

## Stack

| Layer | Technology | Why |
|---|---|---|
| App shell | Electron | Cross-platform desktop app with native PTY access |
| UI | React + TypeScript | Component model, type safety |
| Terminal | xterm.js + node-pty | Full terminal emulation with native shell processes |
| State | Zustand | Lightweight, no boilerplate |
| Bundler | electron-vite | Fast HMR, Electron-aware builds |
| Split panes | allotment | Performant resizable pane library |
| Package manager | bun | Fast installs |
| Linter | Biome | Single tool for format + lint |
| Tests | Vitest | Fast, Vite-native test runner |
| Packaging | electron-builder | .dmg/.app/.exe builds |

## Architecture

Three layers:

1. **Main process** (`src/main/`) — App window, PTY shell management via node-pty, JSON config persistence in `~/.knkode/`, CWD tracking via lsof
2. **Renderer process** (`src/renderer/`) — React UI: tab bar, split pane layouts via allotment, terminal rendering via xterm.js, settings panels. Zustand store manages all state.
3. **Config layer** — `~/.knkode/workspaces.json` for workspace definitions, `~/.knkode/app-state.json` for app state (window bounds, open tabs, active workspace)

**Data flow**: React UI → IPC (contextBridge) → main process (PTY + config) → IPC events → renderer

**Preload bridge** (`src/preload/index.ts`): Exposes typed `window.api` with invoke calls for config/PTY operations and event listeners for PTY data/exit/cwd changes.

## Key Decisions

- **Layout model**: Binary split tree with preset generators. Presets create trees, manual splits insert nodes. Sizes are percentages.
- **WorkspaceLayout**: Discriminated union — `{ type: 'preset', preset, tree }` vs `{ type: 'custom', tree }`
- **Config storage**: JSON files in `~/.knkode/` with 0o700 dir / 0o600 file permissions
- **PTY lifecycle**: Lazy loading — shells spawn on first tab activation, stay alive across tab switches (CSS show/hide), killed on tab close or app quit
- **CWD tracking**: macOS via `lsof -p <pid>`, with fallback to initial cwd
- **Sandbox**: Enabled (`sandbox: true`) with full context isolation
- **Change directory UX**: Text input (not native folder picker) — faster for power users

## Scope

### v1 (current)
- Workspace CRUD with persistent config
- Chrome-like tab bar with drag-to-reorder
- Layout presets (single, 2-col, 2-row, 3-panel-L, 3-panel-T, 2x2)
- Manual split/close panes
- Per-workspace and per-pane theming
- Keyboard shortcuts (Cmd+D split, Cmd+W close, Cmd+1-9 focus, Cmd+T new, Cmd+Shift+[/] switch tabs)
- Tab context menu (rename, color, duplicate, close)
- Closed workspaces menu
- Pane context menu (split, rename, change dir, startup command, theme override)
- Settings panel (name, color, theme, layout, pane list)
- Window bounds persistence
- Startup commands

### Deferred
- Custom themes / theme import-export
- Search across terminals
- Session recording / replay
- Plugin system
- Linux / Windows testing
