# knkode

A terminal workspace manager — save your multi-pane terminal layouts and switch between them instantly.

## Why

Every project needs a different terminal arrangement. A build watcher, a dev server, logs in a side panel — you set it up, then close the window and lose it. knkode persists your terminal layouts as named workspaces so you never rebuild them.

## What it does

- **Workspaces as tabs** — each workspace is a named, color-coded tab with its own pane layout. Create, duplicate, close, reopen from the closed-tabs menu, reorder by drag.
- **Split pane layouts** — 6 presets (single, 2-column, 2-row, 3-panel L, 3-panel T, 2x2 grid) plus split-on-the-fly. Drag panes to reorder within a workspace or move them between workspaces.
- **Per-workspace theming** — 16 terminal themes (Dracula, Tokyo Night, Nord, Catppuccin, Gruvbox, etc.), custom bg/fg colors, 14 monospace fonts, adjustable font size, cursor style (bar/block/underline), scrollback buffer (500-50k lines), and unfocused pane dimming.
- **Find in terminal** — `Cmd+F` opens an in-terminal search bar with next/prev navigation. Clickable URLs in terminal output open in your default browser.
- **Startup commands** — set a command per pane (like `npm run dev`) that runs when the workspace loads.
- **CWD tracking** — each pane header shows the current working directory, updated as you `cd`.
- **Keyboard-driven** — all core actions have shortcuts:

  | Action | macOS | Other |
  |--------|-------|-------|
  | Split side-by-side | `Cmd+D` | `Ctrl+D` |
  | Split stacked | `Cmd+Shift+D` | `Ctrl+Shift+D` |
  | Close pane | `Cmd+W` | `Ctrl+W` |
  | Close workspace tab | `Cmd+Shift+W` | `Ctrl+Shift+W` |
  | New workspace | `Cmd+T` | `Ctrl+T` |
  | Prev/next workspace | `Cmd+Shift+[/]` | `Ctrl+Shift+[/]` |
  | Prev/next pane | `Cmd+Alt+Left/Right` | `Ctrl+Alt+Left/Right` |
  | Focus pane by number | `Cmd+1-9` | `Ctrl+1-9` |
  | Find in terminal | `Cmd+F` | `Ctrl+F` |
  | Settings | `Cmd+,` | `Ctrl+,` |

Config lives in `~/.knkode/` as JSON. Window position, size, and open tabs are remembered between sessions.

## Prerequisites

- **Node.js** >= 18
- **bun** — [install](https://bun.sh)
- macOS is the primary target (frameless window with native traffic lights). Windows/Linux builds work but are less tested.

## Quick start

```sh
git clone https://github.com/StanK23/knkode.git
cd knkode
bun install
bun run dev
```

Opens the app with hot reload. A default workspace with one terminal pane is created on first launch.

## Build

```sh
bun run build       # compile to out/
bun run package     # build + create distributable (dmg/nsis/AppImage)
```

Distributables land in `dist/`.

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
  main/           Electron main process — window, PTY lifecycle, config I/O
  preload/        Context bridge (typed IPC between main and renderer)
  renderer/       React UI — tabs, pane layouts, terminal views, settings
  shared/         Types and constants used by both processes
```

Renderer stack: Zustand (state), xterm.js + node-pty (terminals), allotment (split panes), Tailwind CSS v4 (styling).

## Status

v0.1.0 — functional, actively developed. The workspace/pane/terminal loop is solid. Rough edges remain on non-macOS platforms.
