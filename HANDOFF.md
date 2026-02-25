# HANDOFF

## Current State
- Branch: `main`
- All PRs merged, clean slate

## What Was Done
- `47440a1` on main: Fix terminal scroll position lost on workspace switch
  - Changed inactive workspace CSS from `opacity-0 -z-10` to `visibility:hidden`
  - Added scroll save/restore in Terminal.tsx via useLayoutEffect — suppresses scroll events while inactive, restores exact viewportY on reactivation
- PR #50 merged: Dynamic workspace fonts (sync UI font/size with terminal settings)
- PR #49 merged: UI glass polish (settings grid, translucent modal, mechanical motion)

## Next Steps
1. (none pending — ready for new work)
