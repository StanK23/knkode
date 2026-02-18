#!/bin/bash
# Patch Electron's Info.plist so macOS shows "knkode" in the menu bar during development.
# Runs via the postinstall npm hook after `bun install` / `electron-builder install-app-deps`.

PLIST="node_modules/electron/dist/Electron.app/Contents/Info.plist"

if [ ! -f "$PLIST" ]; then
  exit 0
fi

/usr/libexec/PlistBuddy -c "Set :CFBundleName knkode" "$PLIST" 2>/dev/null
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName knkode" "$PLIST" 2>/dev/null
