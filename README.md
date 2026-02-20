# knkode

A terminal workspace manager that persists your multi-pane layouts across sessions.

## Why

Every project needs a different terminal setup — build watcher, dev server, logs, a shell for git. You arrange them, close the window, and rebuild the whole thing next time. knkode saves each arrangement as a named workspace you can switch between instantly. Workspaces survive restarts, remember their shell state, and each one gets its own theme.

## Features

**Workspaces as tabs.** Each workspace is a color-coded tab with its own split-pane layout. Create, duplicate, close, drag to reorder, or reopen from the closed-workspaces menu. Switching tabs is instant — background shells stay alive.

**Split panes.** Six layout presets (single, 2-column, 2-row, 3-panel L, 3-panel T, 2x2 grid), plus split any pane on the fly with `Cmd+D` / `Cmd+Shift+D`. Drag pane headers to swap positions. Move a pane to a different workspace via right-click — the live shell moves with it.

**Theming.** 16 built-in themes (Dracula, Tokyo Night, Nord, Catppuccin, Gruvbox, Solarized, and more) applied per workspace. Individual panes can override the workspace theme with their own colors, font, and font size. 10 bundled monospace fonts (JetBrains Mono, Fira Code, Cascadia Code, etc.) that work without system installation, plus 4 system fonts when available. Cursor style (bar, block, underline), scrollback (500–50k lines), and unfocused pane dimming are all adjustable.

**Terminal.** WebGL-accelerated rendering via xterm.js. In-terminal search (`Cmd+F`), clickable URLs, CWD tracking in each pane header, and per-pane startup commands (e.g., `npm run dev` runs when the workspace loads). `Shift+Enter` sends LF instead of CR, which tools like Claude Code use to distinguish newline from submit.

**Persistent config.** Everything is stored as JSON in `~/.knkode/` — workspace definitions, open tabs, window position and size. Writes are atomic (temp file + rename) so a crash won't corrupt your config.

## Keyboard shortcuts

Uses `Cmd` on macOS, `Ctrl` elsewhere — intentionally avoids terminal control sequences (`Ctrl+C`, `Ctrl+D`, etc.).

| Action | macOS | Other |
|---|---|---|
| Split side-by-side | `Cmd+D` | `Ctrl+D` |
| Split stacked | `Cmd+Shift+D` | `Ctrl+Shift+D` |
| Close pane | `Cmd+W` | `Ctrl+W` |
| Close workspace tab | `Cmd+Shift+W` | `Ctrl+Shift+W` |
| New workspace | `Cmd+T` | `Ctrl+T` |
| Prev / next workspace | `Cmd+Shift+[ / ]` | `Ctrl+Shift+[ / ]` |
| Prev / next pane | `Cmd+Alt+Left / Right` | `Ctrl+Alt+Left / Right` |
| Focus pane by number | `Cmd+1–9` | `Ctrl+1–9` |
| Find in terminal | `Cmd+F` | `Ctrl+F` |
| Settings | `Cmd+,` | `Ctrl+,` |

## Quick start

Requires [Node.js](https://nodejs.org) >= 18 and [bun](https://bun.sh).

```sh
git clone https://github.com/StanK23/knkode.git
cd knkode
bun install
bun run dev
```

Opens the app with hot reload. A default workspace with one terminal pane is created on first launch.

macOS is the primary target (frameless window with native traffic lights). Windows and Linux builds work but are less tested.

## Build

```sh
bun run build       # compile to out/
bun run package     # build + create .dmg / .zip
```

Distributables land in `dist/`. Code signing and notarization require Apple Developer credentials in environment variables — see `scripts/notarize.js`.

## Development

```sh
bun run dev          # electron-vite dev server with HMR
bun run test         # vitest
bun run test:watch   # vitest in watch mode
bun run lint         # biome check
bun run lint:fix     # biome check --write
```

### Project structure

```
src/
  main/        Electron main process — window management, PTY lifecycle, config I/O
  preload/     Context bridge — typed IPC between main and renderer
  renderer/    React UI — tabs, split panes, terminal views, settings panel
  shared/      Types and constants shared across processes
```

Stack: React + TypeScript, Zustand (state), xterm.js + node-pty (terminals), allotment (split panes), Tailwind CSS v4 (styling), electron-vite (bundler), Biome (lint + format).

## License

[MIT](LICENSE)
