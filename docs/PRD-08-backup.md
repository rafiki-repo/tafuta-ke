# PRD-08: Backup & Recovery

**Status:** Implemented
**Last Updated:** 2026-04-16

---

## Overview

This document defines the backup strategy for the Tafuta platform — what is backed up, how, when, and how to restore from a backup in the event of data loss or server failure.

---

## Goals

- Ensure a complete, recoverable snapshot of all application data is taken nightly
- Make backups accessible to a remote backup engine via SFTP without manual intervention
- Keep the solution simple, transparent, and operable without specialist knowledge
- Support full disaster recovery from a bare server

---

## What Is Backed Up

### Database (every night, standalone)
A full `pg_dump` of the PostgreSQL database, compressed with gzip. This contains all users, businesses, transactions, media metadata, configuration, and audit logs. Output is plain SQL — human-readable and portable.

### Full Application Archive (every night)
A `tar.gz` of the entire application directory including:
- Application source code
- Business media files (`media/` — photos, logos uploaded by businesses)
- Application logs (`backend/logs/`)
- Environment configuration (`backend/.env`, `frontend/.env`)
- The database dump produced in the same run

The database dump is included in the full archive so a single file contains everything needed for a complete restore.

### What Is Excluded

| Excluded | Reason |
|---|---|
| `node_modules/` | Regenerable via `npm ci` |
| `frontend/dist/` | Regenerable via `npm run build` |
| `.git/` | Code is in GitHub; not needed for recovery |
| `backup/` itself | Prevents recursive inclusion of prior archives |
| `*.tar.gz`, `*.zip` | Prevents including prior backup files |

---

## Folder Structure

On the production server at `/var/www/tafuta/`:

```
backup/
├── backup.log                              ← running log of all backup activity
├── db/
│   ├── tafuta-db-20260416_020000.sql.gz   ← nightly DB dump
│   └── tafuta-db-20260415_020000.sql.gz
└── full/
    ├── tafuta-full-20260416_020000.tar.gz  ← nightly full archive
    ├── tafuta-full-20260415_020000.tar.gz
    └── latest -> tafuta-full-20260416_020000.tar.gz   ← symlink to newest
```

The `backup/` folder is excluded from `rsync` in `deploy.sh` — deployments never overwrite or delete backups.

---

## Scripts

### `scripts/backup-db.sh` — Database-only backup
Standalone script. Dumps the PostgreSQL database to `backup/db/`. Use this when you need a quick DB snapshot without the full archive (e.g. before running a risky migration).

```bash
./scripts/backup-db.sh
```

Reads `DATABASE_URL` from `backend/.env` if not set in the environment.

### `scripts/backup.sh` — Full backup (cron target)
Calls `backup-db.sh` first, then creates the full application archive. Updates the `latest` symlink and prunes backups older than 3 days.

```bash
./scripts/backup.sh
```

Both scripts write logs to stdout. When run via cron, output is appended to `backup/backup.log`.

---

## Scheduling

The nightly backup is scheduled automatically by the Node.js backend using `node-cron`. No manual cron setup is required — it activates whenever the server starts in production and is deployed with the application.

### How it works

`backend/src/cron.js` is imported by `server.js` and `initCron()` is called after the server starts listening. It schedules `scripts/backup.sh` to run at **02:00 East Africa Time** every night.

**Timezone**: `Africa/Nairobi` (EAT = UTC+3). The explicit timezone ensures the backup fires at 2 AM Nairobi time, not 2 AM UTC (which would be 5 AM locally).

**PM2 cluster guard**: The backend runs as 2 PM2 instances. Without a guard, both instances would schedule the backup and it would run twice. `cron.js` checks `process.env.pm_id` and only instance `0` registers the schedule — instance `1` logs a message and returns.

**Output**: stdout and stderr from `backup.sh` are appended to `backup/backup.log`. PM2 logs also capture the start/complete/failure messages.

### Verifying the scheduler is active

After deploying, check PM2 logs:
```bash
pm2 logs tafuta-backend --lines 50 | grep cron
```

You should see:
```
[cron] Skipping scheduled tasks (PM2 instance 1 — only instance 0 schedules)
[cron] Scheduled: nightly backup at 02:00 Africa/Nairobi
```

### Testing without waiting for 2 AM

To verify the backup runs correctly without waiting overnight, temporarily change the schedule in `backend/src/cron.js` to every minute:

```js
cron.schedule('* * * * *', runBackup, { timezone: 'Africa/Nairobi' });
```

Deploy, wait one minute, then check `backup/backup.log` and `backup/full/` for a new archive. Revert the schedule and deploy again.

---

## Remote Retrieval via SFTP

The remote backup engine connects via SSH key and pulls the latest archive:

```
/var/www/tafuta/backup/full/latest
```

This symlink always points to the most recent full archive. A specific dated file can also be pulled by name if needed.

**Example SCP pull:**
```bash
scp user@s4.pamoja.ke:/var/www/tafuta/backup/full/latest ./tafuta-backup-latest.tar.gz
```

**Example SFTP session:**
```
sftp user@s4.pamoja.ke
get /var/www/tafuta/backup/full/latest tafuta-backup-latest.tar.gz
```

The backup engine should be configured with a dedicated SSH key that has read access to the `backup/` directory.

---

## Retention

Local backups older than **3 days** are deleted automatically by `backup.sh` on each run. This means the server holds a rolling window of the last 3 nightly backups at any time.

The remote backup engine is responsible for long-term retention of collected archives.

---

## Restore Procedure

Use this procedure to restore Tafuta to a new or repaired server from a backup archive.

### Prerequisites
- Ubuntu 24 VPS
- PostgreSQL installed and running
- Node.js 22 installed
- Caddy and PM2 installed
- A backup archive: `tafuta-full-TIMESTAMP.tar.gz`

### Steps

**1. Clone the repository (for deploy infrastructure)**
```bash
git clone https://github.com/your-org/tafuta-ke.git /home/openclaw/projects/tafuta-ke
```

**2. Extract the backup archive**
```bash
mkdir -p /var/www/tafuta
tar -xzf tafuta-full-TIMESTAMP.tar.gz -C /var/www/tafuta
```

**3. Restore the database**

Create the database and user first if needed:
```bash
sudo -u postgres psql -c "CREATE USER tafuta_user WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "CREATE DATABASE tafuta OWNER tafuta_user;"
```

Then restore from the DB dump (inside the extracted archive):
```bash
gunzip -c /var/www/tafuta/backup/db/tafuta-db-TIMESTAMP.sql.gz | psql "$DATABASE_URL"
```

**4. Restore environment configuration**
The `.env` files are included in the archive at `backend/.env` and `frontend/.env`. Verify their contents and update any values that have changed (e.g. new API keys).

**5. Restore media files**
Media is included in the archive at `media/`. Verify it is in place:
```bash
ls /var/www/tafuta/media/
```

**6. Install dependencies and build**
```bash
cd /var/www/tafuta/backend && npm ci --omit=dev
cd /var/www/tafuta/frontend && npm ci && npm run build
```

**7. Run database migrations**
```bash
cd /var/www/tafuta/backend && npm run migrate
```

**8. Start the backend**
```bash
cd /var/www/tafuta/backend
pm2 start ecosystem.config.cjs
pm2 save
```

**9. Verify**
```bash
curl -sf http://localhost:3000/api/health
```

---

## Testing the Backup

Run the backup manually and verify the output:

```bash
./scripts/backup.sh
ls -lh backup/db/
ls -lh backup/full/
readlink backup/full/latest
```

Spot-check the full archive contains expected content:
```bash
tar -tzf backup/full/latest | head -30
```

Verify the DB dump is readable:
```bash
gunzip -c backup/db/tafuta-db-LATEST.sql.gz | head -20
```

---

## Future Work

- **Log pruning**: Add a weekly cron to rotate and prune `backend/logs/` so they don't grow unbounded
- **Off-site sync**: Add `rclone` sync to Backblaze B2 or S3-compatible storage for a second off-site copy
- **Field-level DB encryption**: Encrypt sensitive columns (phone, email) in PostgreSQL using `pgcrypto` when compliance requirements (GDPR, Kenya DPA 2019) demand it
- **Backup verification**: Automated nightly test-restore to a scratch database to confirm backup integrity
