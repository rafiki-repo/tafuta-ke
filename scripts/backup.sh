#!/bin/bash
# Tafuta full backup script
# Step 1: calls backup-db.sh to dump the database
# Step 2: creates a full application archive (code + media + logs + .env)
# Usage: ./scripts/backup.sh
# Cron (2 AM daily): 0 2 * * * /var/www/tafuta/scripts/backup.sh >> /var/www/tafuta/backup/backup.log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FULL_DIR="$APP_ROOT/backup/full"
RETENTION_DAYS=3

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $*"
}

log "--- Backup started ---"

mkdir -p "$FULL_DIR"

# Step 1: Database backup (delegated to backup-db.sh)
log "Running database backup..."
"$SCRIPT_DIR/backup-db.sh"

# Step 2: Full application archive (code + media + logs + .env)
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FULL_FILE="$FULL_DIR/tafuta-full-${TIMESTAMP}.tar.gz"

log "Creating full application archive..."
tar -czf "$FULL_FILE" \
  --exclude='*/node_modules' \
  --exclude='frontend/dist' \
  --exclude='.git' \
  --exclude='backup' \
  --exclude='*.tar.gz' \
  --exclude='*.zip' \
  -C "$APP_ROOT" \
  .
log "Full archive complete: $FULL_FILE ($(du -h "$FULL_FILE" | cut -f1))"

# Step 3: Update 'latest' symlink
ln -sfn "$FULL_FILE" "$FULL_DIR/latest"
log "Updated symlink: $FULL_DIR/latest -> $FULL_FILE"

# Step 4: Prune backups older than RETENTION_DAYS
log "Pruning backups older than ${RETENTION_DAYS} days..."
find "$APP_ROOT/backup/db" -maxdepth 1 -name 'tafuta-db-*.sql.gz' -mtime +${RETENTION_DAYS} -delete
find "$FULL_DIR" -maxdepth 1 -name 'tafuta-full-*.tar.gz' -mtime +${RETENTION_DAYS} -delete

log "--- Backup complete ---"
