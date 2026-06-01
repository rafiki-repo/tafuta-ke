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
import pool from './config/database.js';
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

async function checkSubscriptionExpiry() {
  logger.info('[cron] Checking subscription expiry...');
  try {
    // Mark expired subscriptions
    const expired = await pool.query(
      `UPDATE service_subscriptions
       SET status = 'expired', updated_at = NOW()
       WHERE status = 'active' AND expiration_date < CURRENT_DATE
       RETURNING subscription_id, business_id, service_type, expiration_date`
    );
    if (expired.rowCount > 0) {
      logger.info(`[cron] Marked ${expired.rowCount} subscription(s) as expired`);
    }

    // Find subscriptions expiring in 7, 3, or 1 days for reminders
    const upcoming = await pool.query(
      `SELECT ss.business_id, ss.service_type, ss.expiration_date,
              b.business_name,
              u.full_name, u.phone, u.email,
              (ss.expiration_date - CURRENT_DATE) AS days_until_expiry
       FROM service_subscriptions ss
       JOIN user_business_roles ubr ON ss.business_id = ubr.business_id
                                    AND ubr.role = 'owner' AND ubr.is_deleted = false
       JOIN businesses b ON ss.business_id = b.business_id
       JOIN users u ON ubr.user_id = u.user_id
       WHERE ss.status = 'active'
         AND (ss.expiration_date - CURRENT_DATE) IN (7, 3, 1)`
    );

    if (upcoming.rowCount > 0) {
      logger.info(`[cron] ${upcoming.rowCount} subscription(s) expiring soon — reminders queued`);
      // SMS/email delivery wired here once VintEx/Mailgun is active
      for (const row of upcoming.rows) {
        logger.info('[cron] Expiry reminder due', {
          business: row.business_name,
          service: row.service_type,
          daysLeft: row.days_until_expiry,
          phone: row.phone,
        });
      }
    }
  } catch (err) {
    logger.error('[cron] Subscription expiry check failed', { error: err.message });
  }
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

  // Daily subscription expiry check at 07:00 EAT (business hours start)
  cron.schedule('0 7 * * *', checkSubscriptionExpiry, { timezone: 'Africa/Nairobi' });
  logger.info('[cron] Scheduled: subscription expiry check at 07:00 Africa/Nairobi');
}
