# HANDOFF

## Current State
- Branch: `fix/scroll-jump-debug`
- Working on: Scroll jump investigation (board: "Bug Investigation — Scroll Jump")

## Completed In This Branch
- Added persistent scroll debug logging via main/preload IPC.
- Scroll lifecycle events now write structured JSONL records to `~/.knkode/logs/scroll-debug.jsonl`.
- Instrumented terminal mount/remount, initial fit, resize observer fit cycles, viewport scroll, `onWriteParsed` scheduling, workspace restore, theme-triggered fit, and scroll-to-bottom actions.
- Verified `bun run build` passes.

## Known Gaps
- `bun test` still has pre-existing failures unrelated to this instrumentation:
  - `src/renderer/src/lib/agent-block-parser.test.ts` cannot resolve `./agent-parsers/claude-code`
  - `src/renderer/src/store/index.test.ts` assumes a browser `window` in the current Bun test environment

## What To Do Next
- Run this branch and use the app normally until the scroll jump happens again.
- After it jumps, provide:
  - workspace name or id
  - pane label or pane id
  - approximate local time of the jump
- Then inspect `~/.knkode/logs/scroll-debug.jsonl` around that event sequence to identify the exact race.
