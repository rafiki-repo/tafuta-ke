#!/bin/bash
set -e

# Deployment script for tafuta.ke production
# Usage: ./deploy.sh

ENV="${1:-production}"
WORKSPACE="/home/openclaw/projects/tafuta-ke"
DEPLOY_DIR="/var/www/tafuta"
LOG_FILE="$DEPLOY_DIR/deploy.log"

echo "$(date) - Deploying tafuta.ke ($ENV)..." | tee -a "$LOG_FILE"

# Function to log and exit on error
fail() {
    echo "$(date) - ERROR: $1" | tee -a "$LOG_FILE" >&2
    exit 1
}

# Ensure pm2 is in PATH (installed globally via npm)
export PATH="$PATH:/home/openclaw/.npm-global/bin"

# 1. Pull latest code
cd "$WORKSPACE" || fail "Cannot cd to workspace $WORKSPACE"
echo "Pulling latest changes from main branch..."
git fetch origin
git checkout main
git pull origin main

# 2. Sync files to deploy directory (excluding sensitive/config files)
echo "Syncing files to $DEPLOY_DIR..."
rsync -av --delete \
    --exclude node_modules \
    --exclude logs \
    --exclude .git \
    --exclude backend/.env \
    --exclude frontend/.env \
    --exclude frontend/dist \
    --exclude backend/logs \
    --exclude uploads \
    --exclude backup \
    --exclude business-sites \
    --exclude deploy.log \
    --exclude media \
    "$WORKSPACE/" "$DEPLOY_DIR/" || fail "rsync failed"

# Ensure media directory exists (created once; never deleted by rsync)
mkdir -p "$DEPLOY_DIR/media"

# Copy app-config.jfx if missing or outdated (required for photo uploads)
if [ -f "$WORKSPACE/backend/media/app-config.jfx" ]; then
    if [ ! -f "$DEPLOY_DIR/media/app-config.jfx" ] || [ "$WORKSPACE/backend/media/app-config.jfx" -nt "$DEPLOY_DIR/media/app-config.jfx" ]; then
        cp "$WORKSPACE/backend/media/app-config.jfx" "$DEPLOY_DIR/media/"
        echo "Copied app-config.jfx to media directory (updated or missing)"
    fi
fi

# 3. Database backup
echo "Backing up database..."
cd "$DEPLOY_DIR"
if [ -f "scripts/backup.sh" ]; then
    bash scripts/backup.sh 2>&1 | tee -a "$LOG_FILE"
    if [ ${PIPESTATUS[0]} -ne 0 ]; then
        echo "Backup failed but continuing..." >&2
    fi
else
    echo "Warning: scripts/backup.sh not found, skipping backup." | tee -a "$LOG_FILE"
fi

# 4. Stop backend BEFORE touching node_modules to prevent PM2 auto-restart
#    thrashing against a half-built node_modules (which corrupts the cluster TCP state).
echo "Stopping backend for dependency install..."
pm2 stop tafuta-backend 2>&1 | tee -a "$LOG_FILE" || true

# 5. Backend dependencies
cd "$DEPLOY_DIR/backend"
if [ -f "package.json" ]; then
    echo "Installing backend dependencies..."
    npm ci --omit=dev 2>&1 | tee -a "$LOG_FILE"
    if [ ${PIPESTATUS[0]} -ne 0 ]; then
        fail "Backend npm install failed"
    fi
fi

# 6. Database migrations
echo "Running database migrations..."
npm run migrate 2>&1 | tee -a "$LOG_FILE"
if [ ${PIPESTATUS[0]} -ne 0 ]; then
    fail "Database migration failed"
fi

# 7. Frontend build (backend is stopped during this — acceptable downtime)
cd "$DEPLOY_DIR/frontend"
if [ -f "package.json" ]; then
    echo "Installing frontend dependencies..."
    npm ci 2>&1 | tee -a "$LOG_FILE"
    if [ ${PIPESTATUS[0]} -ne 0 ]; then
        fail "Frontend npm install failed"
    fi
    echo "Building frontend..."
    npm run build 2>&1 | tee -a "$LOG_FILE"
    if [ ${PIPESTATUS[0]} -ne 0 ]; then
        fail "Frontend build failed"
    fi
fi

# 8. Delete old PM2 entries and start fresh — pm2 start reuses existing entries if they
#    exist (just restarts them), which preserves corrupted cluster TCP state. Delete first
#    to force PM2 to create brand-new process entries with a clean cluster socket.
echo "Starting backend..."
cd "$DEPLOY_DIR/backend"
pm2 delete tafuta-backend 2>&1 | tee -a "$LOG_FILE" || true
pm2 start ecosystem.config.cjs 2>&1 | tee -a "$LOG_FILE"
if [ ${PIPESTATUS[0]} -ne 0 ]; then
    fail "PM2 start failed"
fi
pm2 save 2>&1 | tee -a "$LOG_FILE"

# 9. Verify deployment
echo "Checking deployment health..."
sleep 5
pm2 status tafuta-backend | tee -a "$LOG_FILE"
echo "Verifying backend is responding..."
curl -sf http://localhost:3000/api/health > /dev/null || fail "Backend health check failed — check: pm2 logs tafuta-backend"

echo "$(date) - Deployment complete!" | tee -a "$LOG_FILE"