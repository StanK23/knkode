## Summary

Clean swap of Solarized Light for Everforest. The new EverforestVariant follows the `createAndRegisterVariant` pattern correctly and the theme preset has proper ANSI colors. The README preview is updated consistently. A few minor consistency gaps with peer community variants and one outdated reference in the main README.

## Must Fix

- `README.md:22`: The main README still references "Solarized" in the themes list (`Dracula, Tokyo Night, Nord, Catppuccin, Gruvbox, Solarized, and more`) but Solarized Light has been removed and Everforest added. This is user-facing documentation that will be inaccurate after merge.

## Suggestions

- `src/renderer/src/components/pane-chrome/EverforestVariant.tsx:19`: The `cwd.icon` uses an emoji (`'🌿'`) while peer community variants use either text glyphs (`'▸'`, `'▶'`) or the `'folder'` FolderIcon. Emoji rendering varies across platforms and may look inconsistent on Windows/Linux. Consider using `'folder'` (FolderIcon) for consistency with Catppuccin/Dracula, or a text glyph like Gruvbox/Monokai use.
- `src/renderer/src/components/pane-chrome/all-variants.ts:35`: The `Everforest: true` entry in `_VARIANT_COMPLETENESS` is placed after `Monokai` (matching the THEME_PRESETS order), which is correct. However, the comment block above the record does not group community vs identity themes like THEME_PRESETS does. Not blocking, just noting the ordering is intentionally following preset order.

## Nitpicks

- `src/renderer/src/components/pane-chrome/EverforestVariant.tsx:29`: The `pr` badge uses `opacity-50 hover:opacity-90` while most community variants use either `opacity-40 hover:opacity-80` (Catppuccin) or no opacity with `hover:brightness-110` (Dracula, Monokai, Gruvbox). The `opacity-50 hover:opacity-90` combination is unique to Everforest. This is fine if intentional for design differentiation, but worth noting the divergence.
- `src/renderer/src/components/pane-chrome/EverforestVariant.tsx:22`: The `branch` badge uses `rounded` (4px default) while most community variants use `rounded-sm` (2px) or `rounded-md` (6px). Same for the `pr` badge on line 29. Intentional design choice but differs from peers.
- `src/renderer/src/data/theme-presets.ts:210`: The Everforest preset is the only community theme without `glow` defined. This is consistent with how community themes work (no effects), so it's correct — just confirming it was reviewed.
