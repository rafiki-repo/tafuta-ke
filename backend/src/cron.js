/**
 * Scheduled tasks for Tafuta backend.
 * Called once from server.js after the server starts.
 *
 * Only activates in production. In PM2 cluster mode (2 instances), only instance 0
 * schedules tasks to prevent duplicate runs.
 *
 * To add future tasks (log pruning, session cleanup, etc.), add them here.
 */

import cron from 'node-cron';
import { spawn } from 'child_process';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import logger from './utils/logger.js';

// Resolve paths relative to this file: backend/src/cron.js → app root is two levels up
const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = join(__dirname, '..', '..');
const BACKUP_SCRIPT = join(APP_ROOT, 'scripts', 'backup.sh');
const BACKUP_LOG = join(APP_ROOT, 'backup', 'backup.log');

async function runBackup() {
  logger.info('[cron] Nightly backup starting...');

  try {
    await mkdir(join(APP_ROOT, 'backup'), { recursive: true });
  } catch {
    // Already exists — ignore
  }

  const logStream = createWriteStream(BACKUP_LOG, { flags: 'a' });
  const proc = spawn('bash', [BACKUP_SCRIPT], { stdio: ['ignore', 'pipe', 'pipe'] });

  proc.stdout.pipe(logStream);
  proc.stderr.pipe(logStream);

  proc.on('close', (code) => {
    logStream.end();
    if (code === 0) {
      logger.info('[cron] Nightly backup completed successfully');
    } else {
      logger.error(`[cron] Nightly backup failed (exit code ${code}) — check backup/backup.log`);
    }
  });

  proc.on('error', (err) => {
    logStream.end();
    logger.error(`[cron] Failed to start backup script: ${err.message}`);
  });
}

export function initCron() {
  // Only run scheduled tasks in production
  if (process.env.NODE_ENV !== 'production') {
    logger.info('[cron] Skipping scheduled tasks (NODE_ENV is not production)');
    return;
  }

  // PM2 cluster mode runs multiple instances of this process. Only instance 0
  // should schedule tasks to prevent each task running N times per interval.
  // pm_id is set by PM2; in non-PM2 environments it is undefined (still OK since
  // the production check above is the primary gate).
  const pmId = process.env.pm_id;
  if (pmId !== undefined && pmId !== '0') {
    logger.info(`[cron] Skipping scheduled tasks (PM2 instance ${pmId} — only instance 0 schedules)`);
    return;
  }

  // Nightly full backup at 02:00 East Africa Time
  // Africa/Nairobi = EAT (UTC+3). Without timezone, '0 2 * * *' fires at 2 AM UTC = 5 AM Nairobi.
  cron.schedule('0 2 * * *', runBackup, { timezone: 'Africa/Nairobi' });
  logger.info('[cron] Scheduled: nightly backup at 02:00 Africa/Nairobi');
}
