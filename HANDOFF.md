# HANDOFF — knkode-v2

## Current State
Phase 2 (IPC adapter layer) implemented on `feature/ipc-adapter-layer`. PR #9 open, review complete.

## What's Done
- [x] Tauri 2 project scaffolded (React 19 + TypeScript 5.9 + Vite 6 + Tailwind CSS 4.2)
- [x] Biome configured with tab indentation
- [x] Zustand 5 installed
- [x] Vitest + @testing-library/react installed
- [x] Placeholder App.tsx
- [x] Frontend build passes (tsc + vite build)
- [x] Rust backend compiles (Tauri 2)
- [x] Old knktx boards/notes/plans archived (clean slate)
- [x] PROJECT_DESCRIPTION.md updated with new approach
- [x] Phase 2: IPC adapter layer — shared types + tauri-api.ts + shell plugin

## What's Next
- [ ] PR #9 review fixes (race condition, error handling, naming conventions)
- [ ] Phase 3: Rust commands (config, PTY, app)
- [ ] Phase 4: Rust PTY manager (portable-pty)
- [ ] Phase 5: Terminal emulation (wezterm-term + canvas renderer)
- [ ] Phase 6: Config store (Rust, ~/.knkode/)
- [ ] Phase 7: CWD tracker (Rust)
- [ ] Phase 8: Window configuration (platform-specific)
- [ ] Phase 9: Native menu
- [ ] Phase 10: Frontend changes (port v1 React code)

## Active Reviews

### PR #9 — feat: IPC adapter layer + shared types (Phase 2)
- State: `docs/reviews/PR-9/_state.json`
- Agents: 10/10 completed
- Phase: done (compiled report ready)
- Top findings: race condition in event listeners, silent error swallowing, openExternal URL validation

## Key Reference
- Migration prompt: `/Users/sfory/dev/knkode/docs/TAURI_MIGRATION_PROMPT.md`
- V1 codebase: `/Users/sfory/dev/knkode/`

## Active Branch
`feature/ipc-adapter-layer`

## Known Issues
- DMG bundling fails (macOS code signing) — not blocking for dev
- Icons are placeholder dark squares
- wezterm-term is NOT on crates.io as standalone — only `tattoy-wezterm-term` fork exists (affects Phase 5)
