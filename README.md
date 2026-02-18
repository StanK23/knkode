# knkode

A terminal workspace manager that lets you organize multiple terminal sessions into named, themed workspaces with flexible split-pane layouts.

## Why

Every project needs a different terminal setup — a build watcher here, a dev server there, logs in a side panel. Most terminal apps make you rebuild that layout every time. knkode saves your terminal arrangements as workspaces you can switch between instantly, each with its own split layout, theme, and per-pane config.

## What it does

- **Workspaces as tabs** — each workspace is a named, color-coded tab with its own pane layout. Create, close, reopen, rename, reorder by dragging.
- **Split pane layouts** — 6 presets (single, 2-column, 2-row, 3-panel, 2x2 grid) or split any pane on the fly. Drag panes to reorder, move panes between workspaces.
- **Per-workspace theming** — 16 built-in themes (Dracula, Tokyo Night, Nord, Catppuccin, etc.), custom background/foreground colors, 14 bundled monospace fonts. Per-pane overrides for when one terminal needs a different look.
- **Startup commands** — set a command per pane (like `npm run dev`) that runs automatically when the workspace opens.
- **CWD tracking** — each pane header shows the current working directory, updated in real-time.
- **Keyboard-driven** — `Cmd+D` split, `Cmd+W` close pane, `Cmd+T` new workspace, `Cmd+1-9` focus pane by index, `Cmd+Shift+[/]` cycle workspace tabs, `Cmd+,` settings.

Config is persisted to `~/.knkode/` as JSON files. Window position and size are remembered between sessions.

## Prerequisites

- **Node.js** >= 18
- **bun** (package manager) — [install](https://bun.sh)
- macOS recommended (frameless window with native traffic lights). Windows and Linux builds exist but are less tested.

## Quick start

```sh
git clone https://github.com/StanK23/knkode.git
cd knkode
bun install
bun run dev
```

This opens the app in development mode with hot reload. A default workspace with a single terminal pane is created on first launch.

## Build

```sh
bun run build       # compile to out/
bun run package     # build + create distributable (dmg/nsis/AppImage)
```

Distributables are written to `dist/`.

## Development

```sh
bun run dev          # electron-vite dev server with hot reload
bun run test         # vitest (run once)
bun run test:watch   # vitest (watch mode)
bun run lint         # biome check
bun run lint:fix     # biome check --write
```

### Project structure

```
src/
  main/           Electron main process — window management, PTY lifecycle, config I/O
  preload/        Context bridge (IPC between main and renderer)
  renderer/       React UI — workspace tabs, pane layouts, terminal views, settings
  shared/         Types and constants shared between main and renderer
```

The renderer uses **Zustand** for state, **xterm.js** + **node-pty** for terminals, **allotment** for resizable split panes, and **Tailwind CSS v4** for styling.

## Status

v0.1.0 — functional but early. The core workspace/pane/terminal loop works. Rough edges remain around edge cases and non-macOS platforms.
