import express from 'express';
import { requireAuth, requireAdmin, requireRole } from '../middleware/auth.js';
import { success, error, paginated } from '../utils/response.js';
import { formatCategoryName, isValidUUID } from '../utils/validation.js';
import pool from '../config/database.js';
import logger from '../utils/logger.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(requireAuth);
router.use(requireAdmin);

// GET /api/admin/businesses/pending - Get pending businesses
router.get('/businesses/pending', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const limitNum = parseInt(limit, 10);

    const result = await pool.query(
      `SELECT b.business_id, b.business_name, b.category, b.region, b.subdomain,
              b.content_json, b.created_at,
              u.full_name as owner_name, u.phone as owner_phone, u.email as owner_email
       FROM businesses b
       JOIN user_business_roles ubr ON b.business_id = ubr.business_id AND ubr.role = 'owner'
       JOIN users u ON ubr.user_id = u.user_id
       WHERE b.status = 'pending'
       ORDER BY b.created_at ASC
       LIMIT $1 OFFSET $2`,
      [limitNum, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM businesses WHERE status = 'pending'`
    );

    res.json(paginated(result.rows, {
      page: parseInt(page, 10),
      limit: limitNum,
      total: parseInt(countResult.rows[0].total, 10),
      totalPages: Math.ceil(parseInt(countResult.rows[0].total, 10) / limitNum),
    }));

  } catch (err) {
    next(err);
  }
});

// POST /api/admin/businesses/:id/approve - Approve business
router.post('/businesses/:id/approve', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { verification_tier = 'basic' } = req.body;

    if (!isValidUUID(id)) {
      return res.status(400).json(error('Invalid business ID', 'INVALID_ID'));
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update business status
      const result = await client.query(
        `UPDATE businesses 
         SET status = 'active', 
             verification_tier = $1,
             approved_by = $2,
             approved_at = NOW(),
             status_changed_at = NOW(),
             updated_at = NOW()
         WHERE business_id = $3 AND status = 'pending'
         RETURNING business_id, business_name`,
        [verification_tier, req.user.userId, id]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json(error('Business not found or already processed', 'NOT_FOUND'));
      }

      // Log audit trail
      await client.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_value)
         VALUES ($1, 'approved_business', 'business', $2, $3)`,
        [req.user.userId, id, JSON.stringify({ verification_tier })]
      );

      await client.query('COMMIT');

      logger.info('Business approved', { businessId: id, adminId: req.user.userId });

      res.json(success({
        business_id: result.rows[0].business_id,
        business_name: result.rows[0].business_name,
        status: 'active',
      }, 'Business approved successfully'));

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

  } catch (err) {
    next(err);
  }
});

// POST /api/admin/businesses/:id/reject - Reject business
router.post('/businesses/:id/reject', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!isValidUUID(id)) {
      return res.status(400).json(error('Invalid business ID', 'INVALID_ID'));
    }

    if (!reason) {
      return res.status(400).json(error('Rejection reason is required', 'MISSING_REASON'));
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update business status
      const result = await client.query(
        `UPDATE businesses 
         SET status = 'suspended', 
             rejection_reason = $1,
             status_changed_at = NOW(),
             updated_at = NOW()
         WHERE business_id = $2 AND status = 'pending'
         RETURNING business_id, business_name`,
        [reason, id]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json(error('Business not found or already processed', 'NOT_FOUND'));
      }

      // Log audit trail
      await client.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, reason)
         VALUES ($1, 'rejected_business', 'business', $2, $3)`,
        [req.user.userId, id, reason]
      );

      await client.query('COMMIT');

      logger.info('Business rejected', { businessId: id, adminId: req.user.userId, reason });

      res.json(success({
        business_id: result.rows[0].business_id,
        business_name: result.rows[0].business_name,
        status: 'suspended',
      }, 'Business rejected'));

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

  } catch (err) {
    next(err);
  }
});

// GET /api/admin/businesses - Get all businesses (with optional status filter and search)
router.get('/businesses', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status, q } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    const conditions = ["b.status != 'deleted'"];
    const conditionParams = [];
    let paramCount = 1;

    if (status) {
      conditions.push(`b.status = $${paramCount++}`);
      conditionParams.push(status);
    }

    if (q) {
      conditions.push(`b.business_name ILIKE $${paramCount++}`);
      conditionParams.push(`%${q}%`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const allParams = [...conditionParams, limitNum, offset];

    const result = await pool.query(
      `SELECT b.business_id, b.business_name, b.category, b.region, b.subdomain,
              b.status, b.verification_tier, b.content_json, b.created_at,
              u.full_name as owner_name, u.phone as owner_phone
       FROM businesses b
       LEFT JOIN user_business_roles ubr ON b.business_id = ubr.business_id AND ubr.role = 'owner'
       LEFT JOIN users u ON ubr.user_id = u.user_id
       ${whereClause}
       ORDER BY b.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      allParams
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM businesses b ${whereClause}`,
      conditionParams
    );

    res.json(paginated(result.rows, {
      page: pageNum,
      limit: limitNum,
      total: parseInt(countResult.rows[0].total, 10),
      totalPages: Math.ceil(parseInt(countResult.rows[0].total, 10) / limitNum),
    }));

  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/businesses/:id/verification - Update business verification tier
router.patch('/businesses/:id/verification', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { verification_tier } = req.body;

    if (!isValidUUID(id)) {
      return res.status(400).json(error('Invalid business ID', 'INVALID_ID'));
    }

    if (!['basic', 'verified', 'premium'].includes(verification_tier)) {
      return res.status(400).json(error('Invalid verification tier', 'INVALID_TIER'));
    }

    const result = await pool.query(
      `UPDATE businesses
       SET verification_tier = $1, updated_at = NOW()
       WHERE business_id = $2 AND status != 'deleted'
       RETURNING business_id, business_name, verification_tier`,
      [verification_tier, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(error('Business not found', 'NOT_FOUND'));
    }

    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_value)
       VALUES ($1, 'updated_business_verification', 'business', $2, $3)`,
      [req.user.userId, id, JSON.stringify({ verification_tier })]
    );

    logger.info('Business verification updated', { businessId: id, adminId: req.user.userId, tier: verification_tier });

    res.json(success(result.rows[0], 'Business verification tier updated'));

  } catch (err) {
    next(err);
  }
});

// GET /api/admin/analytics - Get analytics data
router.get('/analytics', async (req, res, next) => {
  try {
    // Total counts
    const totalUsers = await pool.query(`SELECT COUNT(*) as count FROM users WHERE status != 'deleted'`);
    const totalBusinesses = await pool.query(`SELECT COUNT(*) as count FROM businesses WHERE status = 'active'`);
    const pendingBusinesses = await pool.query(`SELECT COUNT(*) as count FROM businesses WHERE status = 'pending'`);
    const totalRevenue = await pool.query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM transactions WHERE status = 'completed'`);

    // Recent transactions
    const recentTransactions = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
       FROM transactions 
       WHERE status = 'completed' AND completed_at > NOW() - INTERVAL '30 days'`
    );

    // Active subscriptions by type
    const subscriptionsByType = await pool.query(
      `SELECT service_type, COUNT(*) as count
       FROM service_subscriptions
       WHERE status = 'active' AND (expiration_date IS NULL OR expiration_date > CURRENT_DATE)
       GROUP BY service_type`
    );

    // Businesses by category
    const businessesByCategory = await pool.query(
      `SELECT category, COUNT(*) as count
       FROM businesses
       WHERE status = 'active'
       GROUP BY category
       ORDER BY count DESC
       LIMIT 10`
    );

    // Businesses by region
    const businessesByRegion = await pool.query(
      `SELECT region, COUNT(*) as count
       FROM businesses
       WHERE status = 'active'
       GROUP BY region
       ORDER BY count DESC`
    );

    res.json(success({
      totals: {
        users: parseInt(totalUsers.rows[0].count, 10),
        businesses: parseInt(totalBusinesses.rows[0].count, 10),
        pending_businesses: parseInt(pendingBusinesses.rows[0].count, 10),
        total_revenue: parseFloat(totalRevenue.rows[0].total),
      },
      recent: {
        transactions_30d: parseInt(recentTransactions.rows[0].count, 10),
        revenue_30d: parseFloat(recentTransactions.rows[0].total),
      },
      subscriptions_by_type: subscriptionsByType.rows,
      businesses_by_category: businessesByCategory.rows,
      businesses_by_region: businessesByRegion.rows,
    }));

  } catch (err) {
    next(err);
  }
});

// GET /api/admin/analytics/business-growth - Active business signups over time
router.get('/analytics/business-growth', async (req, res, next) => {
  try {
    const granularity = req.query.granularity === 'week' ? 'week' : 'month';

    const result = await pool.query(
      `SELECT DATE_TRUNC($1, approved_at) AS period, COUNT(*) AS count
       FROM businesses
       WHERE status = 'active'
       GROUP BY period
       ORDER BY period ASC`,
      [granularity]
    );

    let cumulative = 0;
    const growth = result.rows.map((row) => {
      const count = parseInt(row.count, 10);
      cumulative += count;
      return { period: row.period, count, cumulative };
    });

    res.json(success({ granularity, growth }));

  } catch (err) {
    next(err);
  }
});

// GET /api/admin/auth-logs - Get authentication logs
router.get('/auth-logs', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, event_type, user_id } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const limitNum = parseInt(limit, 10);

    let whereClause = '';
    const params = [];
    let paramCount = 1;

    if (event_type) {
      whereClause += ` WHERE event_type = $${paramCount++}`;
      params.push(event_type);
    }

    if (user_id) {
      whereClause += whereClause ? ' AND' : ' WHERE';
      whereClause += ` user_id = $${paramCount++}`;
      params.push(user_id);
    }

    params.push(limitNum);
    params.push(offset);

    const result = await pool.query(
      `SELECT log_id, user_id, phone, email, event_type, ip_address, timestamp
       FROM auth_logs
       ${whereClause}
       ORDER BY timestamp DESC
       LIMIT $${paramCount++} OFFSET $${paramCount++}`,
      params
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM auth_logs ${whereClause}`,
      params.slice(0, paramCount - 3)
    );

    res.json(paginated(result.rows, {
      page: parseInt(page, 10),
      limit: limitNum,
      total: parseInt(countResult.rows[0].total, 10),
      totalPages: Math.ceil(parseInt(countResult.rows[0].total, 10) / limitNum),
    }));

  } catch (err) {
    next(err);
  }
});

// GET /api/admin/audit-logs - Get audit logs
router.get('/audit-logs', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, action, entity_type } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const limitNum = parseInt(limit, 10);

    let whereClause = '';
    const params = [];
    let paramCount = 1;

    if (action) {
      whereClause += ` WHERE action = $${paramCount++}`;
      params.push(action);
    }

    if (entity_type) {
      whereClause += whereClause ? ' AND' : ' WHERE';
      whereClause += ` entity_type = $${paramCount++}`;
      params.push(entity_type);
    }

    params.push(limitNum);
    params.push(offset);

    const result = await pool.query(
      `SELECT a.log_id, a.actor_id, a.action, a.entity_type, a.entity_id, 
              a.old_value, a.new_value, a.reason, a.timestamp,
              u.full_name as actor_name
       FROM audit_logs a
       LEFT JOIN users u ON a.actor_id = u.user_id
       ${whereClause}
       ORDER BY a.timestamp DESC
       LIMIT $${paramCount++} OFFSET $${paramCount++}`,
      params
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
      params.slice(0, paramCount - 3)
    );

    res.json(paginated(result.rows, {
      page: parseInt(page, 10),
      limit: limitNum,
      total: parseInt(countResult.rows[0].total, 10),
      totalPages: Math.ceil(parseInt(countResult.rows[0].total, 10) / limitNum),
    }));

  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/subscriptions/:id/adjust - Adjust subscription
router.patch('/subscriptions/:id/adjust', requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { months_adjustment, reason } = req.body;

    if (!isValidUUID(id)) {
      return res.status(400).json(error('Invalid subscription ID', 'INVALID_ID'));
    }

    if (!months_adjustment || !reason) {
      return res.status(400).json(error('months_adjustment and reason are required', 'VALIDATION_ERROR'));
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get current subscription
      const currentResult = await client.query(
        `SELECT * FROM service_subscriptions WHERE subscription_id = $1`,
        [id]
      );

      if (currentResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json(error('Subscription not found', 'NOT_FOUND'));
      }

      const current = currentResult.rows[0];

      // Calculate new values
      const newMonthsPaid = current.months_paid + parseInt(months_adjustment, 10);
      const newExpirationDate = current.expiration_date 
        ? new Date(current.expiration_date.getTime() + (months_adjustment * 30 * 24 * 60 * 60 * 1000))
        : new Date(Date.now() + (months_adjustment * 30 * 24 * 60 * 60 * 1000));

      // Update subscription
      const result = await client.query(
        `UPDATE service_subscriptions
         SET months_paid = $1,
             expiration_date = $2,
             updated_at = NOW()
         WHERE subscription_id = $3
         RETURNING *`,
        [newMonthsPaid, newExpirationDate, id]
      );

      // Log audit trail
      await client.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_value, new_value, reason)
         VALUES ($1, 'adjusted_subscription', 'subscription', $2, $3, $4, $5)`,
        [
          req.user.userId,
          id,
          JSON.stringify({ months_paid: current.months_paid, expiration_date: current.expiration_date }),
          JSON.stringify({ months_paid: newMonthsPaid, expiration_date: newExpirationDate }),
          reason,
        ]
      );

      await client.query('COMMIT');

      logger.info('Subscription adjusted', { subscriptionId: id, adminId: req.user.userId, adjustment: months_adjustment });

      res.json(success(result.rows[0], 'Subscription adjusted successfully'));

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users - Get all users (with optional text search)
router.get('/users', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status, verification_tier, q } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const limitNum = parseInt(limit, 10);

    let whereClause = `WHERE u.status != 'deleted'`;
    const params = [];
    let paramCount = 1;

    if (status) {
      whereClause += ` AND u.status = $${paramCount++}`;
      params.push(status);
    }

    if (verification_tier) {
      whereClause += ` AND u.verification_tier = $${paramCount++}`;
      params.push(verification_tier);
    }

    if (q) {
      const pNum = paramCount++;
      whereClause += ` AND (u.full_name ILIKE $${pNum} OR u.nickname ILIKE $${pNum} OR u.email ILIKE $${pNum} OR u.phone ILIKE $${pNum})`;
      params.push(`%${q}%`);
    }

    params.push(limitNum);
    params.push(offset);

    const result = await pool.query(
      `SELECT u.user_id, u.full_name, u.nickname, u.phone, u.email,
              u.verification_tier, u.status, u.created_at, u.last_login_at,
              a.role as admin_role
       FROM users u
       LEFT JOIN admin_users a ON u.user_id = a.user_id AND a.is_active = TRUE
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${paramCount++} OFFSET $${paramCount++}`,
      params
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM users u ${whereClause}`,
      params.slice(0, paramCount - 3)
    );

    res.json(paginated(result.rows, {
      page: parseInt(page, 10),
      limit: limitNum,
      total: parseInt(countResult.rows[0].total, 10),
      totalPages: Math.ceil(parseInt(countResult.rows[0].total, 10) / limitNum),
    }));

  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users/:id - Get single user with admin info
router.get('/users/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json(error('Invalid user ID', 'INVALID_ID'));
    }

    const result = await pool.query(
      `SELECT u.user_id, u.full_name, u.nickname, u.phone, u.email,
              u.verification_tier, u.status, u.phone_verified, u.email_verified,
              u.last_login_at, u.created_at,
              a.role as admin_role, a.is_active as admin_is_active
       FROM users u
       LEFT JOIN admin_users a ON u.user_id = a.user_id
       WHERE u.user_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(error('User not found', 'NOT_FOUND'));
    }

    res.json(success(result.rows[0]));

  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id - Update user profile and/or admin role
router.patch('/users/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { full_name, nickname, email, phone, status, admin_role } = req.body;

    if (!isValidUUID(id)) {
      return res.status(400).json(error('Invalid user ID', 'INVALID_ID'));
    }

    if (status !== undefined && !['active', 'deactivated', 'suspended'].includes(status)) {
      return res.status(400).json(error('Invalid status value', 'INVALID_STATUS'));
    }

    const validRoles = ['super_admin', 'admin', 'support_staff', null];
    if (admin_role !== undefined && !validRoles.includes(admin_role)) {
      return res.status(400).json(error('Invalid admin role', 'INVALID_ROLE'));
    }

    const roleHierarchy = { super_admin: 3, admin: 2, support_staff: 1 };
    const actorLevel = roleHierarchy[req.user.adminRole] || 0;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get target user's current admin role
      const currentAdminResult = await client.query(
        `SELECT role FROM admin_users WHERE user_id = $1 AND is_active = TRUE`,
        [id]
      );
      const currentAdminRole = currentAdminResult.rows[0]?.role || null;

      // Enforce privilege: actor cannot grant or remove a role higher than their own
      if (admin_role !== undefined) {
        if (admin_role !== null) {
          const targetLevel = roleHierarchy[admin_role] || 0;
          if (actorLevel < targetLevel) {
            await client.query('ROLLBACK');
            return res.status(403).json(error('You cannot grant a role higher than your own', 'FORBIDDEN'));
          }
        } else if (currentAdminRole) {
          const currentLevel = roleHierarchy[currentAdminRole] || 0;
          if (actorLevel < currentLevel) {
            await client.query('ROLLBACK');
            return res.status(403).json(error('You cannot remove a role higher than your own', 'FORBIDDEN'));
          }
        }
      }

      // Build user profile update
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (full_name !== undefined) { updates.push(`full_name = $${paramCount++}`); values.push(full_name); }
      if (nickname !== undefined) { updates.push(`nickname = $${paramCount++}`); values.push(nickname); }
      if (email !== undefined) { updates.push(`email = $${paramCount++}`); values.push(email || null); }
      if (phone !== undefined) { updates.push(`phone = $${paramCount++}`); values.push(phone || null); }
      if (status !== undefined) { updates.push(`status = $${paramCount++}`); values.push(status); }

      let updatedUser = null;
      if (updates.length > 0) {
        updates.push(`updated_at = NOW()`);
        values.push(id);
        const result = await client.query(
          `UPDATE users SET ${updates.join(', ')}
           WHERE user_id = $${paramCount}
           RETURNING user_id, full_name, nickname, phone, email, status, verification_tier`,
          values
        );
        if (result.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json(error('User not found', 'NOT_FOUND'));
        }
        updatedUser = result.rows[0];
      }

      // Handle admin role change
      if (admin_role !== undefined) {
        if (admin_role === null) {
          await client.query(`DELETE FROM admin_users WHERE user_id = $1`, [id]);
        } else {
          await client.query(
            `INSERT INTO admin_users (user_id, role, is_active, created_by)
             VALUES ($1, $2, TRUE, $3)
             ON CONFLICT (user_id) DO UPDATE SET role = $2, is_active = TRUE, created_by = $3`,
            [id, admin_role, req.user.userId]
          );
        }
      }

      await client.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_value)
         VALUES ($1, 'updated_user', 'user', $2, $3)`,
        [req.user.userId, id, JSON.stringify(req.body)]
      );

      await client.query('COMMIT');

      logger.info('Admin updated user', { targetUserId: id, adminId: req.user.userId });

      const finalAdminRole = admin_role !== undefined ? admin_role : currentAdminRole;
      res.json(success({
        ...(updatedUser || { user_id: id }),
        admin_role: finalAdminRole,
      }, 'User updated successfully'));

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id/verification - Update user verification tier
router.patch('/users/:id/verification', requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { verification_tier } = req.body;

    if (!isValidUUID(id)) {
      return res.status(400).json(error('Invalid user ID', 'INVALID_ID'));
    }

    if (!['unverified', 'basic', 'verified', 'premium'].includes(verification_tier)) {
      return res.status(400).json(error('Invalid verification tier', 'INVALID_TIER'));
    }

    const result = await pool.query(
      `UPDATE users 
       SET verification_tier = $1, updated_at = NOW()
       WHERE user_id = $2
       RETURNING user_id, full_name, verification_tier`,
      [verification_tier, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(error('User not found', 'NOT_FOUND'));
    }

    // Log audit trail
    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_value)
       VALUES ($1, 'updated_user_verification', 'user', $2, $3)`,
      [req.user.userId, id, JSON.stringify({ verification_tier })]
    );

    logger.info('User verification updated', { userId: id, adminId: req.user.userId, tier: verification_tier });

    res.json(success(result.rows[0], 'User verification tier updated'));

  } catch (err) {
    next(err);
  }
});

const CATEGORY_NAME_MAX_LENGTH = 80;
const CATEGORY_LIST_MAX_LENGTH = 100;
const CATEGORY_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 &/()+'.-]*$/;

function validateCategoryName(raw) {
  const category = formatCategoryName(raw);
  if (!category) {
    return { valid: false, message: 'Category name cannot be blank' };
  }
  if (category.length > CATEGORY_NAME_MAX_LENGTH) {
    return { valid: false, message: `Category name must be ${CATEGORY_NAME_MAX_LENGTH} characters or less` };
  }
  if (!CATEGORY_NAME_PATTERN.test(category)) {
    return {
      valid: false,
      message: 'Category name can only contain letters, numbers, spaces, &, /, (, ), +, apostrophes, periods, and hyphens',
    };
  }
  return { valid: true, category };
}

function normalizeCategories(categories) {
  if (!Array.isArray(categories)) {
    return { valid: false, message: 'categories must be an array' };
  }
  if (categories.length > CATEGORY_LIST_MAX_LENGTH) {
    return { valid: false, message: `No more than ${CATEGORY_LIST_MAX_LENGTH} categories are allowed` };
  }

  const seen = new Set();
  const result = [];
  for (const raw of categories) {
    const validation = validateCategoryName(raw);
    if (!validation.valid) {
      return { valid: false, message: validation.message };
    }

    const key = validation.category.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(validation.category);
    }
  }

  if (result.length === 0) {
    return { valid: false, message: 'At least one category is required' };
  }

  return { valid: true, categories: result.sort((a, b) => a.localeCompare(b)) };
}

async function getConfiguredCategories() {
  const result = await pool.query(`SELECT value FROM system_config WHERE key = 'categories'`);
  return Array.isArray(result.rows[0]?.value)
    ? result.rows[0].value.map(formatCategoryName)
    : [];
}

// PATCH /api/admin/categories/rename - Rename one category and update assigned businesses
router.patch('/categories/rename', requireRole('admin'), async (req, res, next) => {
  try {
    const oldValidation = validateCategoryName(req.body.old_category);
    const newValidation = validateCategoryName(req.body.new_category);

    if (!oldValidation.valid) {
      return res.status(400).json(error(oldValidation.message, 'VALIDATION_ERROR'));
    }
    if (!newValidation.valid) {
      return res.status(400).json(error(newValidation.message, 'VALIDATION_ERROR'));
    }

    const oldCategory = oldValidation.category;
    const newCategory = newValidation.category;
    const configuredCategories = await getConfiguredCategories();
    const existingCategory = configuredCategories.find(
      (category) => category.toLowerCase() === oldCategory.toLowerCase()
    );

    if (!existingCategory) {
      return res.status(404).json(error('Category not found', 'NOT_FOUND'));
    }

    const duplicate = configuredCategories.some(
      (category) =>
        category.toLowerCase() === newCategory.toLowerCase() &&
        category.toLowerCase() !== existingCategory.toLowerCase()
    );
    if (duplicate) {
      return res.status(409).json(error('That category already exists', 'CATEGORY_EXISTS'));
    }

    const categories = configuredCategories
      .map((category) => (
        category.toLowerCase() === existingCategory.toLowerCase() ? newCategory : category
      ))
      .sort((a, b) => a.localeCompare(b));

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const configResult = await client.query(
        `UPDATE system_config
         SET value = $1, updated_by = $2, updated_at = NOW()
         WHERE key = 'categories'
         RETURNING value`,
        [JSON.stringify(categories), req.user.userId]
      );

      const businessResult = await client.query(
        `UPDATE businesses
         SET category = $1,
             content_json = CASE
               WHEN content_json #> '{profile,en}' IS NOT NULL
                 THEN jsonb_set(content_json, '{profile,en,category}', to_jsonb($3::text), true)
               ELSE content_json
             END,
             updated_at = NOW()
         WHERE LOWER(category) = LOWER($2)
         RETURNING business_id`,
        [newCategory, existingCategory, newCategory]
      );

      await client.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, new_value)
         VALUES ($1, 'renamed_category', 'system_config', $2)`,
        [
          req.user.userId,
          JSON.stringify({
            old_category: existingCategory,
            new_category: newCategory,
            businesses_updated: businessResult.rowCount,
          }),
        ]
      );

      await client.query('COMMIT');

      res.json(success({
        categories: configResult.rows[0].value,
        old_category: existingCategory,
        new_category: newCategory,
        businesses_updated: businessResult.rowCount,
      }, 'Category renamed'));
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/categories - Get configured business categories
router.get('/categories', requireRole('admin'), async (req, res, next) => {
  try {
    const categories = await getConfiguredCategories();
    res.json(success({ categories }));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/categories - Replace configured business categories
router.patch('/categories', requireRole('admin'), async (req, res, next) => {
  try {
    const normalized = normalizeCategories(req.body.categories);
    if (!normalized.valid) {
      return res.status(400).json(error(normalized.message, 'VALIDATION_ERROR'));
    }
    const { categories } = normalized;

    const result = await pool.query(
      `INSERT INTO system_config (key, value, description, updated_by, updated_at)
       VALUES ('categories', $1, 'Available business categories', $2, NOW())
       ON CONFLICT (key) DO UPDATE
       SET value = $1, updated_by = $2, updated_at = NOW()
       RETURNING value`,
      [JSON.stringify(categories), req.user.userId]
    );

    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, new_value)
       VALUES ($1, 'updated_categories', 'system_config', $2)`,
      [req.user.userId, JSON.stringify({ categories })]
    );

    logger.info('Categories updated', { adminId: req.user.userId, count: categories.length });
    res.json(success({ categories: result.rows[0].value }, 'Categories updated'));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/businesses/:id/category - Update one business category
router.patch('/businesses/:id/category', requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const validation = validateCategoryName(req.body.category);

    if (!isValidUUID(id)) {
      return res.status(400).json(error('Invalid business ID', 'INVALID_ID'));
    }
    if (!validation.valid) {
      return res.status(400).json(error(validation.message, 'VALIDATION_ERROR'));
    }

    const configuredCategories = await getConfiguredCategories();
    const category = configuredCategories.find(
      (configured) => configured.toLowerCase() === validation.category.toLowerCase()
    );
    if (!category) {
      return res.status(400).json(error('Category must exist in the configured category list before assigning it to a business', 'INVALID_CATEGORY'));
    }

    const result = await pool.query(
      `UPDATE businesses
       SET category = $1,
           content_json = CASE
             WHEN content_json #> '{profile,en}' IS NOT NULL
               THEN jsonb_set(content_json, '{profile,en,category}', to_jsonb($3::text), true)
             ELSE content_json
           END,
           updated_at = NOW()
       WHERE business_id = $2 AND status != 'deleted'
       RETURNING business_id, business_name, category, updated_at`,
      [category, id, category]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(error('Business not found', 'NOT_FOUND'));
    }

    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_value)
       VALUES ($1, 'updated_business_category', 'business', $2, $3)`,
      [req.user.userId, id, JSON.stringify({ category })]
    );

    res.json(success(result.rows[0], 'Business category updated'));
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/system/config - Get system config
router.get('/system/config', requireRole('super_admin'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT config_id, key, value, description, updated_at FROM system_config ORDER BY key`
    );

    res.json(success({ config: result.rows }));

  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/system/config/:key - Update system config
router.patch('/system/config/:key', requireRole('super_admin'), async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (!value) {
      return res.status(400).json(error('Value is required', 'MISSING_VALUE'));
    }

    const result = await pool.query(
      `UPDATE system_config 
       SET value = $1, updated_by = $2, updated_at = NOW()
       WHERE key = $3
       RETURNING *`,
      [JSON.stringify(value), req.user.userId, key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(error('Config key not found', 'NOT_FOUND'));
    }

    // Log audit trail
    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_value)
       VALUES ($1, 'updated_system_config', 'system_config', $2, $3)`,
      [req.user.userId, key, JSON.stringify(value)]
    );

    logger.info('System config updated', { key, adminId: req.user.userId });

    res.json(success(result.rows[0], 'System config updated'));

  } catch (err) {
    next(err);
  }
});

export default router;
