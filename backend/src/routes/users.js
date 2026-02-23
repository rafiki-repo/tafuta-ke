import express from 'express';
import bcrypt from 'bcrypt';
import { requireAuth } from '../middleware/auth.js';
import { success, error } from '../utils/response.js';
import { isValidEmail } from '../utils/validation.js';
import { getUserBusinesses } from '../utils/permissions.js';
import pool from '../config/database.js';
import logger from '../utils/logger.js';

const router = express.Router();

// GET /api/users/me - Get current user profile
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT user_id, full_name, nickname, phone, email, language, verification_tier, 
              status, phone_verified, email_verified, profile_photo_url, 
              marketing_sms_opt_in, marketing_email_opt_in, 
              terms_version, terms_accepted_at, privacy_version, privacy_accepted_at,
              last_login_at, created_at, updated_at
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

export default router;
