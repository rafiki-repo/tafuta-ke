/**
 * promote-admin.js
 *
 * Bootstraps the first (or any) Tafuta admin by phone number.
 * Run from the backend directory:
 *
 *   npm run promote-admin -- +254712345678
 *   npm run promote-admin -- +254712345678 admin
 *   npm run promote-admin -- +254712345678 support_staff
 *
 * Roles: super_admin (default) | admin | support_staff
 *
 * The user must already have a registered account before running this script.
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from the backend root (one level up from scripts/)
dotenv.config({ path: resolve(__dirname, '../.env') });

const VALID_ROLES = ['super_admin', 'admin', 'support_staff'];

const phone = process.argv[2];
const role  = process.argv[3] || 'super_admin';

// ── Validate args ─────────────────────────────────────────────────────────────

if (!phone) {
  console.error('\nUsage: npm run promote-admin -- <phone> [role]');
  console.error('  phone  required  e.g. +254712345678');
  console.error('  role   optional  super_admin (default) | admin | support_staff\n');
  process.exit(1);
}

if (!VALID_ROLES.includes(role)) {
  console.error(`\nInvalid role "${role}". Must be one of: ${VALID_ROLES.join(', ')}\n`);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('\nDATABASE_URL is not set. Make sure backend/.env exists and contains DATABASE_URL.\n');
  process.exit(1);
}

// ── Run ───────────────────────────────────────────────────────────────────────

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();

  // 1. Find the user by phone
  const userResult = await client.query(
    `SELECT user_id, full_name, phone, status FROM users WHERE phone = $1`,
    [phone]
  );

  if (userResult.rows.length === 0) {
    console.error(`\nNo user found with phone: ${phone}`);
    console.error('The person must register an account on Tafuta first, then run this script.\n');
    process.exit(1);
  }

  const user = userResult.rows[0];

  if (user.status === 'deleted') {
    console.error(`\nAccount for ${phone} has been deleted and cannot be promoted.\n`);
    process.exit(1);
  }

  if (user.status === 'suspended') {
    console.warn(`\nWarning: account for ${phone} is currently suspended.`);
    console.warn('Proceeding with promotion. Lift the suspension separately if needed.\n');
  }

  // 2. Check for existing admin record
  const existing = await client.query(
    `SELECT admin_user_id, role, is_active FROM admin_users WHERE user_id = $1`,
    [user.user_id]
  );

  if (existing.rows.length > 0) {
    const prev = existing.rows[0];
    if (prev.role === role && prev.is_active) {
      console.log(`\n${user.full_name} (${phone}) is already a ${role}. No changes made.\n`);
      process.exit(0);
    }

    // Update existing record
    await client.query(
      `UPDATE admin_users SET role = $1, is_active = true WHERE user_id = $2`,
      [role, user.user_id]
    );
    console.log(`\nUpdated: ${user.full_name} (${phone})`);
    console.log(`  Previous role: ${prev.role} (active: ${prev.is_active})`);
    console.log(`  New role:      ${role}\n`);
  } else {
    // Insert new admin record
    await client.query(
      `INSERT INTO admin_users (user_id, role, is_active) VALUES ($1, $2, true)`,
      [user.user_id, role]
    );
    console.log(`\nSuccess: ${user.full_name} (${phone}) is now a ${role}.`);
    console.log('They will have admin access on their next login.\n');
  }
}

main()
  .catch(err => {
    console.error('\nDatabase error:', err.message, '\n');
    process.exit(1);
  })
  .finally(() => client.end());
