# knkode — Handoff

## What Was Done
- [done] Project foundation — configs, shared types, main process, preload (PR #1, merged)
- [done] Workspace UI — renderer layer with all core components (PR #2, merged)
- [active] Keyboard shortcuts & focus tracking (feature/keyboard-shortcuts, PR #3)

## Active Reviews

### PR #3 — feat: keyboard shortcuts & pane focus tracking
- State: `docs/reviews/PR-3/_state.json`
- Agents: 9/9 completed
- Phase: done — review complete, fixing next

## Active Decisions
- Tech stack: Electron + React + TypeScript + xterm.js + node-pty + Zustand
- Package manager: bun | Linter: Biome
- Config storage: ~/.knkode/ (JSON files)
- WorkspaceLayout: discriminated union (`preset` vs `custom` variants)

## What's Next
1. Fix PR #3 review findings (7 must-fix, 14 suggestions, 9 nitpicks)
2. Drag-to-reorder tabs
3. Testing
