#!/bin/bash
# Patch Electron so macOS shows "knkode" in the menu bar and dock during development.
# Runs via the postinstall npm hook after `bun install` / `electron-builder install-app-deps`.

DIST="node_modules/electron/dist"
OLD_APP="$DIST/Electron.app"
NEW_APP="$DIST/knkode.app"
PLIST="$NEW_APP/Contents/Info.plist"
PATH_TXT="node_modules/electron/path.txt"

# Skip if Electron not installed or already renamed
if [ -d "$NEW_APP" ]; then
  exit 0
fi

if [ ! -d "$OLD_APP" ]; then
  exit 0
fi

# Rename the .app bundle — fixes macOS dock tooltip
mv "$OLD_APP" "$NEW_APP"

# Update electron's path.txt so electron-vite can find the binary
echo "knkode.app/Contents/MacOS/Electron" > "$PATH_TXT"

# Patch Info.plist for menu bar name
/usr/libexec/PlistBuddy -c "Set :CFBundleName knkode" "$PLIST" 2>/dev/null
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName knkode" "$PLIST" 2>/dev/null
