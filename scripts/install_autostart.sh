#!/bin/bash
# Aktiviert den Test-Schule-Server-Auto-Start beim Login.
set -euo pipefail

cd "$(dirname "$0")/.."
PROJECT_DIR="$(pwd)"
NODE_BIN="$(which node)"
PLIST_SRC="$PROJECT_DIR/scripts/com.oliver.testschule.plist"
PLIST_DST="$HOME/Library/LaunchAgents/com.oliver.testschule.plist"

if [ -z "$NODE_BIN" ]; then
  echo "✗ Node nicht gefunden im PATH"
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents"

NODE_DIR="$(dirname "$NODE_BIN")"
PATH_VAL="$NODE_DIR:/usr/local/bin:/usr/bin:/bin"

sed \
  -e "s|__PROJECT_DIR__|$PROJECT_DIR|g" \
  -e "s|__NODE_BIN__|$NODE_BIN|g" \
  -e "s|__PATH__|$PATH_VAL|g" \
  "$PLIST_SRC" > "$PLIST_DST"
chmod 644 "$PLIST_DST"

launchctl unload "$PLIST_DST" 2>/dev/null || true
launchctl load "$PLIST_DST"

echo "✓ Server-Auto-Start installiert: $PLIST_DST"
echo "  Server lauscht auf 0.0.0.0:3000 — also über Tailscale erreichbar."
echo ""
echo "Status prüfen:  launchctl list | grep testschule"
echo "Stoppen:        launchctl unload $PLIST_DST"
echo "Logs anschauen: tail -f $PROJECT_DIR/data/server.out.log"
