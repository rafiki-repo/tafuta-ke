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
    --exclude backups \
    --exclude business-sites \
    "$WORKSPACE/" "$DEPLOY_DIR/" || fail "rsync failed"

# 3. Database backup
echo "Backing up database..."
cd "$DEPLOY_DIR"
if [ -f "backup-db.sh" ]; then
    ./backup-db.sh 2>&1 | tee -a "$LOG_FILE"
    if [ ${PIPESTATUS[0]} -ne 0 ]; then
        echo "Backup failed but continuing..." >&2
    fi
else
    echo "Warning: backup-db.sh not found, skipping backup." | tee -a "$LOG_FILE"
fi

# 4. Backend dependencies
cd "$DEPLOY_DIR/backend"
if [ -f "package.json" ]; then
    echo "Installing backend dependencies..."
    npm ci --production 2>&1 | tee -a "$LOG_FILE"
    if [ ${PIPESTATUS[0]} -ne 0 ]; then
        fail "Backend npm install failed"
    fi
fi

# 5. Database migrations
echo "Running database migrations..."
npm run migrate 2>&1 | tee -a "$LOG_FILE"
if [ ${PIPESTATUS[0]} -ne 0 ]; then
    fail "Database migration failed"
fi

# 6. Frontend build
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

# 7. Restart PM2 processes
echo "Restarting PM2 process 'tafuta-backend'..."
pm2 restart tafuta-backend --silent 2>&1 | tee -a "$LOG_FILE"
if [ ${PIPESTATUS[0]} -ne 0 ]; then
    fail "PM2 restart failed"
fi

# 8. Verify deployment
echo "Checking deployment health..."
sleep 5
pm2 status tafuta-backend | tee -a "$LOG_FILE"

echo "$(date) - Deployment complete!" | tee -a "$LOG_FILE"