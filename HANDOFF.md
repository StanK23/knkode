# knkode — Handoff

## What Was Done
- [done] Project foundation — configs, shared types, main process, preload (PR #1, merged)
- [done] Workspace UI — renderer layer with all core components (`feature/workspace-ui`)
  - Zustand store with workspace CRUD, layout presets, pane management
  - TabBar + Tab (Chrome-style tabs, context menu, rename, close, reopen closed)
  - PaneArea (allotment split panes, split/close/resize, custom layout trees)
  - Pane (header with label/cwd/split/close, context menu, PTY lifecycle)
  - Terminal (xterm.js + WebGL + FitAddon, resize observer, theme updates)
  - SettingsPanel (name, color, theme, layout picker, pane list)
  - LayoutPicker (6 presets: single, 2-col, 2-row, 3-panel-l, 3-panel-t, 2x2-grid)
  - App.tsx (wires TabBar + PaneArea + SettingsPanel + CWD tracking)

## Active Decisions
- Tech stack: Electron + React + TypeScript + xterm.js + node-pty + Zustand
- Package manager: bun | Linter: Biome
- Config storage: ~/.knkode/ (JSON files)
- WorkspaceLayout: discriminated union (`preset` vs `custom` variants)

## Active Reviews

### PR #2 — feat: workspace UI — renderer layer with all core components
- State: `docs/reviews/PR-2/_state.json`
- Agents: 9/9 completed
- Phase: done — fixing findings

## What's Next
1. Fix PR #2 review findings (14 must-fix, 17 suggestions, 13 nitpicks)
2. Keyboard shortcuts & polish
3. Drag-to-reorder tabs
4. Testing
