#!/bin/bash
# Backup the tafuta PostgreSQL database to /backups/tafuta-db-<timestamp>.sql.gz
# Usage: ./scripts/backup-db.sh
# Reads DATABASE_URL from backend/.env if not already set in the environment.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$APP_ROOT/backups"

# Load DATABASE_URL from backend/.env if not set
if [ -z "$DATABASE_URL" ]; then
  ENV_FILE="$APP_ROOT/backend/.env"
  if [ -f "$ENV_FILE" ]; then
    DATABASE_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | cut -d '=' -f2-)
  fi
fi

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set and could not be read from backend/.env" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/tafuta-db-${TIMESTAMP}.sql.gz"

echo "Backing up database to $BACKUP_FILE ..."
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"

echo "Backup complete: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
