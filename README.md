# knkode

A terminal workspace manager that persists your multi-pane layouts across sessions.

Every project needs a different terminal setup — build watcher, dev server, logs, a shell for git. You arrange them, close the window, and rebuild the whole thing next time. knkode saves each arrangement as a named workspace you can switch between instantly. Workspaces survive restarts, remember their shell state, and each one gets its own theme.

## 📥 Download

Grab the latest release from [GitHub Releases](https://github.com/StanK23/knkode/releases):

- **macOS** — `.dmg` (Apple Silicon)
- **Windows** — `.exe` installer

A default workspace with one terminal pane is created on first launch.

## ✨ What it does

**Workspaces as tabs.** Each workspace is a color-coded tab with its own split-pane layout. Create, duplicate, close, drag to reorder, or reopen from the closed-workspaces menu. Switching tabs is instant — background shells stay alive.

**Split panes.** Six layout presets (single, 2-column, 2-row, 3-panel L, 3-panel T, 2x2 grid), plus split any pane on the fly. Drag pane headers to rearrange — drop on center to swap, drop on an edge to insert a new split. Move a pane to a different workspace via right-click. Splitting preserves the existing terminal's output.

**Theming.** 16 built-in themes (Dracula, Tokyo Night, Nord, Catppuccin, Gruvbox, Solarized, and more) applied per workspace. Individual panes can override with their own colors, font, and font size. 10 bundled monospace fonts that work without system installation. Cursor style, scrollback (500-50k lines), and unfocused pane dimming are all adjustable.

**Terminal.** WebGL-accelerated rendering via xterm.js. In-terminal search, clickable URLs, CWD tracking in each pane header, and per-pane startup commands (e.g., `npm run dev` runs when the workspace loads). `Shift+Enter` sends LF instead of CR, which tools like Claude Code use to distinguish newline from submit.

**Quick commands.** Define reusable shell snippets in workspace settings. Run them in any pane from the `>_` icon on the pane header.

**Persistent config.** Everything is stored as JSON in `~/.knkode/` — workspace definitions, open tabs, window position. Writes are atomic (temp file + rename) so a crash won't corrupt your config.

## ⌨️ Keyboard shortcuts

Uses `Cmd` on macOS, `Ctrl` on Windows — intentionally avoids terminal control sequences (`Ctrl+C`, `Ctrl+D`, etc.).

| Action | macOS | Windows |
|---|---|---|
| Split side-by-side | `Cmd+D` | `Ctrl+D` |
| Split stacked | `Cmd+Shift+D` | `Ctrl+Shift+D` |
| Close pane | `Cmd+W` | `Ctrl+W` |
| Close workspace tab | `Cmd+Shift+W` | `Ctrl+Shift+W` |
| New workspace | `Cmd+T` | `Ctrl+T` |
| Prev / next workspace | `Cmd+Shift+[ / ]` | `Ctrl+Shift+[ / ]` |
| Prev / next pane | `Cmd+Alt+Left / Right` | `Ctrl+Alt+Left / Right` |
| Focus pane by number | `Cmd+1-9` | `Ctrl+1-9` |
| Find in terminal | `Cmd+F` | `Ctrl+F` |
| Settings | `Cmd+,` | `Ctrl+,` |

## 🛠 Development

Requires [Node.js](https://nodejs.org) >= 18 and [bun](https://bun.sh).

```sh
git clone https://github.com/StanK23/knkode.git
cd knkode
bun install
bun run dev
```

Opens the app with hot reload. macOS uses a frameless window with native traffic lights; Windows uses the standard title bar.

```sh
bun run test         # vitest
bun run lint         # biome check
bun run lint:fix     # biome check --write
```

### 📦 Building

```sh
bun run build       # compile to out/
bun run package     # build + create .dmg / .exe
```

Distributables land in `dist/`. macOS code signing and notarization require Apple Developer credentials — see `scripts/notarize.js`.

### 🗂 Project structure

```
src/
  main/        Electron main process — window management, PTY lifecycle, config I/O
  preload/     Context bridge — typed IPC between main and renderer
  renderer/    React UI — tabs, split panes, terminal views, settings panel
  shared/      Types and constants shared across processes
```

Stack: Electron, React 19, TypeScript, Zustand, xterm.js + node-pty, allotment, Tailwind CSS v4, electron-vite, Biome.

## 📄 License

[MIT](LICENSE)
