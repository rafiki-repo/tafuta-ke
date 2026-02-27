import express from 'express';
import { requireAuth, requireAdmin, requireRole } from '../middleware/auth.js';
import { success, error, paginated } from '../utils/response.js';
import { isValidUUID } from '../utils/validation.js';
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

// GET /api/admin/users - Get all users
router.get('/users', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status, verification_tier } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const limitNum = parseInt(limit, 10);

    let whereClause = `WHERE status != 'deleted'`;
    const params = [];
    let paramCount = 1;

    if (status) {
      whereClause += ` AND status = $${paramCount++}`;
      params.push(status);
    }

    if (verification_tier) {
      whereClause += ` AND verification_tier = $${paramCount++}`;
      params.push(verification_tier);
    }

    params.push(limitNum);
    params.push(offset);

    const result = await pool.query(
      `SELECT user_id, full_name, phone, email, verification_tier, status, created_at, last_login_at
       FROM users
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount++} OFFSET $${paramCount++}`,
      params
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
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
