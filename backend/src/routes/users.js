import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { requireAuth } from '../middleware/auth.js';
import { success, error } from '../utils/response.js';
import { isValidEmail, isValidKenyanPhone } from '../utils/validation.js';
import { getUserBusinesses } from '../utils/permissions.js';
import pool from '../config/database.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { sendOtpEmail } from '../services/emailService.js';
import { sendOtpSms } from '../services/smsService.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// OTP helpers (reused for phone/email change verification)
// ---------------------------------------------------------------------------

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

async function storeOtp(identifier) {
  const otp = generateOTP();
  // Invalidate any existing unused sessions for this identifier
  await pool.query(
    `UPDATE otp_sessions SET used = TRUE WHERE identifier = $1 AND used = FALSE`,
    [identifier]
  );
  await pool.query(
    `INSERT INTO otp_sessions (identifier, otp_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
    [identifier, hashOtp(otp)]
  );
  return otp;
}

async function verifyStoredOtp(identifier, otp) {
  const result = await pool.query(
    `SELECT id, otp_hash, attempts FROM otp_sessions
     WHERE identifier = $1 AND used = FALSE AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [identifier]
  );
  if (result.rows.length === 0) return false;
  const session = result.rows[0];
  if (session.attempts >= 5) return false;
  await pool.query(`UPDATE otp_sessions SET attempts = attempts + 1 WHERE id = $1`, [session.id]);
  if (session.otp_hash !== hashOtp(otp)) return false;
  await pool.query(`UPDATE otp_sessions SET used = TRUE WHERE id = $1`, [session.id]);
  return true;
}

// GET /api/users/me - Get current user profile
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT user_id, full_name, nickname, phone, email, language, verification_tier,
              status, phone_verified, email_verified, profile_photo_url,
              marketing_sms_opt_in, marketing_email_opt_in,
              terms_version, terms_accepted_at, privacy_version, privacy_accepted_at,
              last_login_at, created_at, updated_at,
              (password_hash IS NOT NULL) AS has_password
       FROM users
       WHERE user_id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(error('User not found', 'NOT_FOUND'));
    }

    const user = result.rows[0];

    // Check if user is admin
    const adminResult = await pool.query(
      `SELECT role, is_active FROM admin_users WHERE user_id = $1`,
      [req.user.userId]
    );

    const adminData = adminResult.rows.length > 0 ? adminResult.rows[0] : null;

    res.json(success({
      ...user,
      is_admin: !!adminData,
      admin_role: adminData?.role || null,
      admin_active: adminData?.is_active || false,
    }));

  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/me - Update user profile
router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const { full_name, nickname, email, language, marketing_sms_opt_in, marketing_email_opt_in, password } = req.body;

    // Validate email if provided
    if (email && !isValidEmail(email)) {
      return res.status(400).json(error('Invalid email format', 'INVALID_EMAIL'));
    }

    // Check if email is already taken by another user
    if (email) {
      const emailCheck = await pool.query(
        'SELECT user_id FROM users WHERE email = $1 AND user_id != $2',
        [email, req.user.userId]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(409).json(error('Email already in use', 'EMAIL_EXISTS'));
      }
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (full_name !== undefined) {
      updates.push(`full_name = $${paramCount++}`);
      values.push(full_name);
    }

    if (nickname !== undefined) {
      updates.push(`nickname = $${paramCount++}`);
      values.push(nickname);
    }

    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
      updates.push(`email_verified = false`);
    }

    if (language !== undefined) {
      updates.push(`language = $${paramCount++}`);
      values.push(language);
    }

    if (marketing_sms_opt_in !== undefined) {
      updates.push(`marketing_sms_opt_in = $${paramCount++}`);
      values.push(marketing_sms_opt_in);
    }

    if (marketing_email_opt_in !== undefined) {
      updates.push(`marketing_email_opt_in = $${paramCount++}`);
      values.push(marketing_email_opt_in);
    }

    // Handle password update
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${paramCount++}`);
      values.push(passwordHash);
    }

    if (updates.length === 0) {
      return res.status(400).json(error('No fields to update', 'NO_UPDATES'));
    }

    updates.push(`updated_at = NOW()`);
    values.push(req.user.userId);

    const query = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING user_id, full_name, nickname, phone, email, language, 
                marketing_sms_opt_in, marketing_email_opt_in, updated_at
    `;

    const result = await pool.query(query, values);

    logger.info('User profile updated', { userId: req.user.userId });

    res.json(success(result.rows[0], 'Profile updated successfully'));

  } catch (err) {
    next(err);
  }
});

// POST /api/users/me/deactivate - Deactivate user account
router.post('/me/deactivate', requireAuth, async (req, res, next) => {
  try {
    const { reason } = req.body;

    await pool.query(
      `UPDATE users 
       SET status = 'deactivated', 
           status_changed_at = NOW(), 
           deactivation_reason = $1,
           updated_at = NOW()
       WHERE user_id = $2`,
      [reason || null, req.user.userId]
    );

    logger.info('User account deactivated', { userId: req.user.userId, reason });

    res.json(success({ message: 'Account deactivated successfully' }));

  } catch (err) {
    next(err);
  }
});

// POST /api/users/me/reactivate - Reactivate user account
router.post('/me/reactivate', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE users 
       SET status = 'active', 
           status_changed_at = NOW(),
           updated_at = NOW()
       WHERE user_id = $1 AND status = 'deactivated'
       RETURNING user_id`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json(error('Account cannot be reactivated', 'CANNOT_REACTIVATE'));
    }

    logger.info('User account reactivated', { userId: req.user.userId });

    res.json(success({ message: 'Account reactivated successfully' }));

  } catch (err) {
    next(err);
  }
});

// GET /api/users/me/businesses - Get user's businesses
router.get('/me/businesses', requireAuth, async (req, res, next) => {
  try {
    const businesses = await getUserBusinesses(req.user.userId);

    res.json(success({
      businesses: businesses.map(b => ({
        business_id: b.business_id,
        business_name: b.business_name,
        category: b.category,
        region: b.region,
        subdomain: b.subdomain,
        status: b.status,
        verification_tier: b.verification_tier,
        user_role: b.role,
        created_at: b.created_at,
      })),
    }));

  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/me/consent - Update terms/privacy consent
router.patch('/me/consent', requireAuth, async (req, res, next) => {
  try {
    const { terms_version, privacy_version } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (terms_version) {
      updates.push(`terms_version = $${paramCount++}, terms_accepted_at = NOW()`);
      values.push(terms_version);
    }

    if (privacy_version) {
      updates.push(`privacy_version = $${paramCount++}, privacy_accepted_at = NOW()`);
      values.push(privacy_version);
    }

    if (updates.length === 0) {
      return res.status(400).json(error('No consent updates provided', 'NO_UPDATES'));
    }

    values.push(req.user.userId);

    const query = `
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE user_id = $${paramCount}
      RETURNING terms_version, terms_accepted_at, privacy_version, privacy_accepted_at
    `;

    const result = await pool.query(query, values);

    logger.info('User consent updated', { userId: req.user.userId });

    res.json(success(result.rows[0], 'Consent updated successfully'));

  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/users/me/request-phone-change
// ---------------------------------------------------------------------------
router.post('/me/request-phone-change', requireAuth, async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone || !isValidKenyanPhone(phone)) {
      return res.status(400).json(error('Valid Kenyan phone number required (+254...)', 'VALIDATION_ERROR'));
    }
    const existing = await pool.query(
      'SELECT user_id FROM users WHERE phone = $1 AND user_id != $2',
      [phone, req.user.userId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json(error('Phone number already in use by another account', 'PHONE_EXISTS'));
    }
    const otp = await storeOtp(phone);
    await sendOtpSms(phone, otp);
    logger.info('Phone change OTP generated', { userId: req.user.userId });
    if (config.env !== 'production') {
      logger.info(`[DEV] Phone change OTP for ${phone}: ${otp}`);
    }
    res.json(success({ message: 'OTP sent to new phone number' }));
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/users/me/confirm-phone-change
// ---------------------------------------------------------------------------
router.post('/me/confirm-phone-change', requireAuth, async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json(error('Phone and OTP required', 'VALIDATION_ERROR'));
    }
    const isValid = (config.auth.bdOtp && otp === config.auth.bdOtp) || await verifyStoredOtp(phone, otp);
    if (!isValid) {
      return res.status(400).json(error('Invalid or expired OTP', 'INVALID_OTP'));
    }
    const result = await pool.query(
      `UPDATE users SET phone = $1, phone_verified = TRUE, updated_at = NOW()
       WHERE user_id = $2
       RETURNING user_id, full_name, phone, email`,
      [phone, req.user.userId]
    );
    logger.info('User phone updated', { userId: req.user.userId });
    res.json(success(result.rows[0], 'Phone number updated successfully'));
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/users/me/request-email-change
// ---------------------------------------------------------------------------
router.post('/me/request-email-change', requireAuth, async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !isValidEmail(email)) {
      return res.status(400).json(error('Valid email address required', 'VALIDATION_ERROR'));
    }
    const existing = await pool.query(
      'SELECT user_id FROM users WHERE email = $1 AND user_id != $2',
      [email, req.user.userId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json(error('Email already in use by another account', 'EMAIL_EXISTS'));
    }
    const otp = await storeOtp(email);
    await sendOtpEmail(email, otp);
    res.json(success({ message: 'OTP sent to new email address' }));
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/users/me/confirm-email-change
// ---------------------------------------------------------------------------
router.post('/me/confirm-email-change', requireAuth, async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json(error('Email and OTP required', 'VALIDATION_ERROR'));
    }
    const isValid = (config.auth.bdOtp && otp === config.auth.bdOtp) || await verifyStoredOtp(email, otp);
    if (!isValid) {
      return res.status(400).json(error('Invalid or expired OTP', 'INVALID_OTP'));
    }
    const result = await pool.query(
      `UPDATE users SET email = $1, email_verified = TRUE, updated_at = NOW()
       WHERE user_id = $2
       RETURNING user_id, full_name, phone, email`,
      [email, req.user.userId]
    );
    logger.info('User email updated', { userId: req.user.userId });
    res.json(success(result.rows[0], 'Email updated successfully'));
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/users/me/password
// ---------------------------------------------------------------------------
router.patch('/me/password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json(error('New password must be at least 8 characters', 'VALIDATION_ERROR'));
    }
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE user_id = $1',
      [req.user.userId]
    );
    const { password_hash } = result.rows[0];
    if (password_hash) {
      if (!currentPassword) {
        return res.status(400).json(error('Current password is required', 'VALIDATION_ERROR'));
      }
      const valid = await bcrypt.compare(currentPassword, password_hash);
      if (!valid) {
        return res.status(400).json(error('Current password is incorrect', 'INVALID_PASSWORD'));
      }
    }
    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2`,
      [newHash, req.user.userId]
    );
    logger.info('User password updated', { userId: req.user.userId });
    res.json(success({ message: 'Password updated successfully' }));
  } catch (err) {
    next(err);
  }
});

export default router;
