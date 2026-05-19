#!/bin/bash
# Installiert den täglichen Backup-Job (läuft jede Nacht um 03:00).
set -euo pipefail
cd "$(dirname "$0")/.."
PROJECT_DIR="$(pwd)"

chmod +x "$PROJECT_DIR/scripts/backup.sh"

PLIST_DST="$HOME/Library/LaunchAgents/com.oliver.testschule.backup.plist"
sed "s|__PROJECT_DIR__|$PROJECT_DIR|g" "$PROJECT_DIR/scripts/com.oliver.testschule.backup.plist" > "$PLIST_DST"
chmod 644 "$PLIST_DST"

launchctl unload "$PLIST_DST" 2>/dev/null || true
launchctl load "$PLIST_DST"

echo "✓ Tägliches Backup installiert (03:00 Uhr)."
echo "   Backup-Dateien: $PROJECT_DIR/data/backups/"
echo "   Log:            $PROJECT_DIR/data/backup.log"
echo ""
echo "Sofort testen:  bash $PROJECT_DIR/scripts/backup.sh"
echo "Status:         launchctl list | grep backup"
echo "Deaktivieren:   launchctl unload $PLIST_DST"
