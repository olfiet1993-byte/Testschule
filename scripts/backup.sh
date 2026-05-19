#!/bin/bash
# Tägliches Backup der SQLite-DB
set -euo pipefail
cd "$(dirname "$0")/.."

DATA="$(pwd)/data"
BACKUPS="$DATA/backups"
mkdir -p "$BACKUPS"

STAMP=$(date +%Y-%m-%dT%H-%M-%S)
TARGET="$BACKUPS/testschule-$STAMP.db"
cp "$DATA/testschule.db" "$TARGET"

# Rotation: behalte nur letzte 30
ls -1t "$BACKUPS"/testschule-*.db 2>/dev/null | tail -n +31 | xargs -r rm -f

SIZE=$(stat -f %z "$TARGET" 2>/dev/null || stat -c %s "$TARGET")
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Backup OK: $TARGET ($SIZE bytes)" >> "$DATA/backup.log"
