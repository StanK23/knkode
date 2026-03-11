# knkode — Project Description

## Overview
Terminal workspace manager for organized multi-project development. Electron desktop app that provides tabbed workspaces with split-pane terminal layouts, AI coding agent integration, and per-workspace theming.

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Electron 33 |
| Bundler | electron-vite 4 |
| Frontend | React 19, TypeScript 5.7 |
| Styling | Tailwind CSS 4 (Tailwind only — no inline styles, CSS modules, or CSS-in-JS) |
| State | Zustand 5 |
| Terminal | @xterm/xterm 5.5 + addons (fit, search, web-links, webgl) |
| PTY | node-pty 1.x |
| Split panes | allotment 1.x |
| Linter | Biome 1.9 |
| Testing | Vitest 4 + @testing-library/react |
| Package manager | bun |
| IDs | uuid v11 |

## Project Structure

```
src/
├── main/                      # Electron main process
│   ├── index.ts               # App lifecycle, window creation
│   ├── main-window.ts         # BrowserWindow management, safeSend helper
│   ├── ipc.ts                 # IPC handler registration
│   ├── pty-manager.ts         # node-pty session management, process polling
│   ├── config-store.ts        # JSON file persistence (workspaces, app state, snippets)
│   └── cwd-tracker.ts         # Per-pane working directory tracking
├── preload/
│   └── index.ts               # contextBridge API surface
├── renderer/src/
│   ├── main.tsx               # React entry point
│   ├── App.tsx                # Root component
│   ├── store/
│   │   └── index.ts           # Zustand store (workspaces, panes, agent state)
│   ├── components/
│   │   ├── Pane.tsx           # Individual terminal pane (xterm + overlays)
│   │   ├── PaneArea.tsx       # Allotment split layout
│   │   ├── Terminal.tsx       # xterm.js wrapper
│   │   ├── TabBar.tsx / Tab.tsx  # Workspace tabs
│   │   ├── PaneLauncher.tsx   # Agent/terminal launch overlay
│   │   ├── StreamRenderer.tsx # Structured chat UI for stream-json output
│   │   ├── BufferRenderedView.tsx # (abandoned — buffer-based rendered view)
│   │   ├── AgentBlockOverlay.tsx  # Collapsible block overlay on terminal
│   │   ├── AgentBlockSummary.tsx  # Block summary display
│   │   ├── AgentStatusBar.tsx # Per-pane agent status bar
│   │   ├── SettingsPanel.tsx  # Settings UI
│   │   ├── LayoutPicker.tsx   # Layout preset picker
│   │   └── FontPicker.tsx     # Font selection
│   ├── hooks/
│   │   ├── useAgentBlockParser.ts  # xterm buffer block parsing (being replaced)
│   │   ├── useStreamJsonParser.ts  # Stream-JSON PTY data parser hook
│   │   ├── useKeyboardShortcuts.ts
│   │   ├── useClickOutside.ts
│   │   └── useInlineEdit.ts
│   ├── lib/
│   │   ├── agent-block-parser.ts   # Stateful block boundary parser
│   │   ├── agent-parsers/          # Per-agent block classifiers
│   │   │   ├── claude-code.ts
│   │   │   ├── gemini-cli.ts
│   │   │   └── types.ts
│   │   ├── agent-renderers/        # Per-agent stream parsers
│   │   │   ├── claude-code.ts      # ClaudeCodeStreamParser (NDJSON)
│   │   │   └── types.ts            # StreamMessage, ContentBlock, StreamParser
│   │   └── ansi.ts                 # ANSI escape utilities
│   ├── data/
│   │   └── theme-presets.ts        # Built-in color themes
│   └── utils/
│       ├── colors.ts               # Color resolution helpers
│       ├── platform.ts             # OS detection
│       └── validation.ts           # Input validation
└── shared/
    └── types.ts               # Shared types (Workspace, PaneConfig, IPC channels, AgentType, etc.)
```

## Key Architectural Decisions

### Locked Decisions
- **Tailwind-only styling** — no exceptions
- **Zustand for state** — single store, no Redux
- **node-pty for terminals** — PTY sessions managed in main process
- **allotment for splits** — recursive layout tree in workspace config
- **Biome for linting** — not ESLint
- **bun as package manager** — not npm/yarn

### Agent Integration Architecture
- **Agent detection**: Process tree walking via `ps`/PowerShell, polling every 2s
- **Agent types**: claude-code, codex, gemini-cli, aider, opencode, kilo-code
- **Launchable agents**: claude-code, gemini-cli (have AGENT_LAUNCH_CONFIG)
- **Pane launcher**: New panes show launcher overlay (terminal / agent choice)
- **Per-agent CLI flags**: Stored in workspace config, configurable in settings
- **Block parsing**: Stateful parser detects TUI block boundaries (box-drawing, bullets)
- **Stream-JSON rendering**: NDJSON parser + structured chat UI for `--output-format stream-json`

### Morphing Pane Status Bar (2026-03-11)
- **16 unique status bar variants** — one per identity theme, not shared archetypes
- **Free-form structural freedom** — variants control height, row count, position, typography, badge shapes, separators, borders
- **Scroll-to-bottom button** is part of each variant's design language (not a shared component)
- **Variant architecture**: `src/renderer/src/components/pane-chrome/` — each variant exports `StatusBar` + `ScrollButton`, selected via `VARIANT_REGISTRY` keyed by theme preset name
- **Context menu stays shared** in Pane.tsx, not duplicated across variants
- **All animations CSS-only** — transitions, box-shadow, opacity, clip-path. No JS animation.
- Design: `docs/plans/2026-03-11-morphing-status-bar-design.md`

### PR Badge in Status Bar (2026-03-11)
- **Clickable PR number** (`#86`) in pane status bar when branch has an open GitHub PR
- **Detection**: `gh pr view --json number,url,title` — triggered on branch change + 60s refresh
- **Click**: Opens PR URL in browser via `APP_OPEN_EXTERNAL` IPC (validates `https://`)
- **Graceful degradation**: No badge if `gh` not installed, not authenticated, or no PR exists
- **Each variant** styles the PR badge to match its theme aesthetic
- Design: `docs/plans/2026-03-11-pr-badge-design.md`

### IPC Pattern
- Main ↔ Renderer via Electron IPC (contextBridge)
- Channel names in `IPC` const object (`src/shared/types.ts`)
- `safeSend` helper for main→renderer events (guards against destroyed window)
- Invoke (renderer→main): `window.api.methodName()`
- Events (main→renderer): `window.api.on('channel', callback)`

### Persistence
- JSON files in `~/.knkode/` (workspaces.json, app-state.json, snippets.json)
- Config loaded once at startup, saved on changes
- Window bounds saved on move/resize (debounced)

## Development

```bash
bun install          # Install dependencies
bun run dev          # Development mode (electron-vite dev)
bun run build        # Production build
bun run test         # Run tests (vitest)
bun run lint         # Check with Biome
bun run lint:fix     # Auto-fix with Biome
```

## Branching
- `main` — stable releases
- `dev/agent-workspace` — development base for agent workspace features (includes PRs #58-69)
- Feature branches created from `dev/agent-workspace` for current work
