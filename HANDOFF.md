# knkode — Handoff

## What Was Done
- [done] Project foundation — configs, shared types, main process, preload (PR #1, merged)
- [done] Workspace UI — renderer layer with all core components (PR #2)
  - PR #2 review: 9 agents, 14 must-fix + 17 suggestions + 13 nitpicks
  - All must-fix items resolved across 9 commits:
    - Swapped split directions fixed
    - PTY lifecycle: no re-creation loop, no double-kill, layout change cleanup
    - process.env.HOME → IPC call (APP_GET_HOME_DIR)
    - Error handling on all IPC calls (.catch on fire-and-forget, try-catch on init)
    - CWD listener stabilized (useStore.getState() instead of reactive array)
    - CSP added, WebkitAppRegion TS error fixed, WebGL catch logged
    - Dead code removed (onChangeColor, unimplemented shortcut hints)
    - DRY: useClickOutside, useInlineEdit hooks, shared styles, updatePaneConfig action
    - UX: Escape-to-close, backdrop click, delete confirmation, await saves
    - Replaced uuid with crypto.randomUUID(), WORKSPACE_COLORS as const

## Active Decisions
- Tech stack: Electron + React + TypeScript + xterm.js + node-pty + Zustand
- Package manager: bun | Linter: Biome
- Config storage: ~/.knkode/ (JSON files)
- WorkspaceLayout: discriminated union (`preset` vs `custom` variants)

## What's Next
1. Keyboard shortcuts & polish
2. Drag-to-reorder tabs
3. Testing
