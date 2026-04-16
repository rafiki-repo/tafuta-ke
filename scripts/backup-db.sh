#!/bin/bash
# Backs up the tafuta PostgreSQL database to backup/db/tafuta-db-<timestamp>.sql.gz
# Can be run standalone for a DB-only backup, or called by scripts/backup.sh.
# Usage: ./scripts/backup-db.sh
# Reads DATABASE_URL from backend/.env if not already set in the environment.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_DIR="$APP_ROOT/backup/db"

# Load DATABASE_URL from backend/.env if not set
if [ -z "${DATABASE_URL:-}" ]; then
  ENV_FILE="$APP_ROOT/backend/.env"
  if [ -f "$ENV_FILE" ]; then
    DATABASE_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | cut -d '=' -f2-)
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set and could not be read from backend/.env" >&2
  exit 1
fi

mkdir -p "$DB_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_FILE="$DB_DIR/tafuta-db-${TIMESTAMP}.sql.gz"

echo "Dumping database to $DB_FILE ..."
pg_dump "$DATABASE_URL" | gzip > "$DB_FILE"
echo "Database backup complete: $DB_FILE ($(du -h "$DB_FILE" | cut -f1))"

# Print the path so callers (e.g. backup.sh) can reference it
echo "$DB_FILE"
