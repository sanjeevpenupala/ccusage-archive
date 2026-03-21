#!/bin/bash
# Daily archive capture + viewer rebuild
# Called by launchd (com.ccusage-archive.plist)

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

cd "$(dirname "$0")/.." || exit 1

npx tsx src/index.ts
npx tsx scripts/build-viewer.ts
