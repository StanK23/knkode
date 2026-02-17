# knkode — Terminal Workspace Manager

**Date**: 2026-02-17
**Status**: Approved

## Problem

Working on 3-5 projects simultaneously in terminal is painful:
- Navigating to the same folders after every session restart
- Dynamic tab names make everything unreadable
- No way to save and restore a "working context" (layout + directories + commands)

## Solution

A Mac-first (cross-platform ready) Electron app that organizes terminal sessions into persistent workspaces with Chrome-like tabs, configurable split layouts, and full theming.

## Tech Stack

- **Electron** — app shell, cross-platform
- **React + TypeScript** — renderer/UI
- **xterm.js** — terminal emulation
- **node-pty** — native PTY shell management
- **Zustand** — lightweight React state management
- **Vite** — renderer bundler (fast HMR)
- **electron-builder** — packaging (.dmg/.app/.exe)
- **Biome** — formatting/linting
- **bun** — package manager

## Architecture

Three layers:

1. **Main process (Electron)** — manages app window, spawns/manages shell processes via `node-pty`, reads/writes workspace config files from `~/.knkode/`
2. **Renderer process (React)** — UI layer: tab bar, split pane layouts, terminal rendering via `xterm.js`, workspace settings panels
3. **Config layer (JSON files)** — `~/.knkode/workspaces.json` for workspace definitions, `~/.knkode/app-state.json` for app state (last active workspace, window size/position, open tabs)

**Data flow**: React UI → IPC → main process (PTY management + config persistence) → state back to renderer.

## Workspace Data Model

```jsonc
{
  "id": "uuid",
  "name": "Web3 Apps",
  "color": "#4F46E5",
  "theme": {
    "background": "#1a1a2e",
    "foreground": "#e0e0e0",
    "fontSize": 14,
    "opacity": 1.0
  },
  "layout": {
    "type": "preset",           // "preset" or "custom"
    "preset": "3-panel-l",      // if preset selected
    "tree": {                   // binary split tree
      "direction": "horizontal",
      "children": [
        { "paneId": "pane-1", "size": 50 },
        {
          "direction": "vertical",
          "size": 50,
          "children": [
            { "paneId": "pane-2", "size": 50 },
            { "paneId": "pane-3", "size": 50 }
          ]
        }
      ]
    }
  },
  "panes": {
    "pane-1": {
      "label": "contracts",
      "cwd": "/Users/sfory/dev/my-defi-app/contracts",
      "startupCommand": "claude",
      "themeOverride": null
    },
    "pane-2": {
      "label": "frontend",
      "cwd": "/Users/sfory/dev/my-defi-app/frontend",
      "startupCommand": "npm run dev",
      "themeOverride": null
    },
    "pane-3": {
      "label": "tests",
      "cwd": "/Users/sfory/dev/my-defi-app",
      "startupCommand": null,
      "themeOverride": { "background": "#1a2e1a" }
    }
  }
}
```

Layout uses a **binary split tree** — presets generate this tree, manual splits insert new nodes. Sizes are percentages.

## UI Components

### Tab Bar (top)
- Chrome-style tabs: colored dot + workspace name
- Right-click tab → rename, change color, duplicate, close
- `+` button → create new workspace (name, color, layout preset)
- Drag to reorder tabs
- Closing a tab hides it (doesn't delete the workspace)
- "Closed workspaces" menu to reopen hidden workspaces

### Pane Area (main content)
- Resizable split panes with drag handles
- Each pane has a header: label (editable) + cwd path (dimmed) + split button + close button
- Right-click header → split h/v, change dir, set startup command, theme override

### Settings Panel (per workspace)
- Workspace name, color picker
- Terminal theme: background, foreground, font size, opacity
- Layout preset selector
- Pane list with cwd, label, startup command — editable inline

### Layout Presets
- Single (1 pane)
- 2-column (50/50 vertical split)
- 2-row (50/50 horizontal split)
- 3-panel L (1 large left + 2 stacked right)
- 3-panel T (1 large top + 2 side-by-side bottom)
- 2x2 Grid (4 equal panes)

### Keyboard Shortcuts
- `Cmd+D` — split vertical
- `Cmd+Shift+D` — split horizontal
- `Cmd+W` — close pane
- `Cmd+[1-9]` — focus pane by index
- `Cmd+T` — new workspace
- `Cmd+Shift+[` / `Cmd+Shift+]` — switch workspace tabs

## App Lifecycle

### Launch
1. Read `~/.knkode/app-state.json` — window geometry, last active workspace, open tab list/order
2. Read `~/.knkode/workspaces.json` — all workspace definitions
3. Restore tab bar with previously open workspaces
4. Activate last-used workspace — spawn PTY shells, cd to saved dirs, run startup commands
5. Other tabs lazy-loaded — shells spawn only when tab is clicked

### While Running
- Config auto-saves on changes (debounced)
- Manual `cd` in a terminal auto-updates the pane's saved `cwd` (tracked via OSC 7 escape sequence or `lsof` polling)
- Window geometry saved on resize/move

### Close Tab
- PTY shells for that workspace killed
- Workspace definition preserved in `workspaces.json`
- Tab removed from open tabs list

### App Quit
- All PTY shells cleaned up
- Final state save

## Project Structure

```
knkode/
├── package.json
├── tsconfig.json
├── electron-builder.json
├── src/
│   ├── main/
│   │   ├── index.ts             # app entry, window creation
│   │   ├── ipc.ts               # IPC handlers
│   │   ├── pty-manager.ts       # node-pty shell management
│   │   ├── config-store.ts      # JSON config read/write
│   │   └── cwd-tracker.ts       # working directory change detection
│   ├── renderer/
│   │   ├── index.html
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── TabBar.tsx
│   │   │   ├── Tab.tsx
│   │   │   ├── PaneArea.tsx     # layout engine, renders split tree
│   │   │   ├── Pane.tsx         # terminal pane + header
│   │   │   ├── Terminal.tsx     # xterm.js wrapper
│   │   │   ├── SettingsPanel.tsx
│   │   │   └── LayoutPicker.tsx
│   │   ├── hooks/
│   │   │   ├── useWorkspace.ts
│   │   │   ├── usePty.ts
│   │   │   └── useConfig.ts
│   │   ├── store/
│   │   │   └── index.ts         # zustand store
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── styles/
│   │       └── global.css
│   └── shared/
│       └── types.ts
├── resources/                   # app icons
└── docs/
    └── plans/
```
