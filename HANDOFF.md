# knkode — Handoff

## What Was Done
- [done] Project foundation — configs, shared types, main process, preload (PR #1, merged)
- [done] Workspace UI — renderer layer with all core components (PR #2, merged)
- [active] Keyboard shortcuts & focus tracking (feature/keyboard-shortcuts)
  - useKeyboardShortcuts hook: Cmd+D/Shift+D (split), Cmd+W (close), Cmd+T (new workspace), Cmd+Shift+[/] (tab switch), Cmd+1-9 (focus pane)
  - focusedPaneId store state with visual focus indicator (accent border)
  - splitPane/closePane store actions (DRY: shared between PaneArea + shortcuts)
  - Terminal focus tracking via xterm textarea focus event
  - Programmatic terminal focus via isFocused prop

## Active Decisions
- Tech stack: Electron + React + TypeScript + xterm.js + node-pty + Zustand
- Package manager: bun | Linter: Biome
- Config storage: ~/.knkode/ (JSON files)
- WorkspaceLayout: discriminated union (`preset` vs `custom` variants)

## What's Next
1. Drag-to-reorder tabs
2. Testing
