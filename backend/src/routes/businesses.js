import express from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { success, error } from '../utils/response.js';
import { validateRequired, isValidUUID } from '../utils/validation.js';
import { checkBusinessPermission, isBusinessOwner } from '../utils/permissions.js';
import pool from '../config/database.js';
import logger from '../utils/logger.js';

const router = express.Router();

// POST /api/businesses - Create new business
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { business_name, category, region, subdomain, content_json } = req.body;

    const missing = validateRequired(['business_name', 'category', 'region', 'content_json'], req.body);
    if (missing.length > 0) {
      return res.status(400).json(error(`Missing required fields: ${missing.join(', ')}`, 'VALIDATION_ERROR'));
    }

    if (typeof content_json !== 'object') {
      return res.status(400).json(error('content_json must be a valid JSON object', 'INVALID_JSON'));
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if subdomain is already taken
      if (subdomain) {
        const subdomainCheck = await client.query(
          'SELECT business_id FROM businesses WHERE subdomain = $1',
          [subdomain]
        );
        if (subdomainCheck.rows.length > 0) {
          await client.query('ROLLBACK');
          return res.status(409).json(error('Subdomain already taken', 'SUBDOMAIN_EXISTS'));
        }
      }

      // Create business with pending status
      const businessResult = await client.query(
        `INSERT INTO businesses (business_name, category, region, subdomain, content_json, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')
         RETURNING business_id, business_name, category, region, subdomain, status, content_version, created_at`,
        [business_name, category, region, subdomain, JSON.stringify(content_json)]
      );

      const business = businessResult.rows[0];

      // Create owner relationship
      await client.query(
        `INSERT INTO user_business_roles (user_id, business_id, role)
         VALUES ($1, $2, 'owner')`,
        [req.user.userId, business.business_id]
      );

      // Create initial content history entry
      await client.query(
        `INSERT INTO business_content_history (business_id, content_json, content_version, changed_by, change_type, change_summary)
         VALUES ($1, $2, 1, $3, 'approval', 'Initial business creation')`,
        [business.business_id, JSON.stringify(content_json), req.user.userId]
      );

      await client.query('COMMIT');

      logger.info('Business created', { businessId: business.business_id, userId: req.user.userId });

      res.status(201).json(success({
        business_id: business.business_id,
        business_name: business.business_name,
        category: business.category,
        region: business.region,
        subdomain: business.subdomain,
        status: business.status,
        content_version: business.content_version,
        created_at: business.created_at,
        message: 'Business created and pending admin approval',
      }, 'Business created successfully'));

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

// GET /api/businesses/:id - Get business details
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json(error('Invalid business ID', 'INVALID_ID'));
    }

    const result = await pool.query(
      `SELECT business_id, business_name, category, region, subdomain, logo_url, 
              verification_tier, status, content_json, content_version, created_at, updated_at
       FROM businesses 
       WHERE business_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(error('Business not found', 'NOT_FOUND'));
    }

    const business = result.rows[0];

    // Only show active businesses to non-authenticated users
    if (!req.user && business.status !== 'active') {
      return res.status(404).json(error('Business not found', 'NOT_FOUND'));
    }

    // Check if user has permission to view non-active businesses
    if (req.user && business.status !== 'active') {
      const { hasPermission } = await checkBusinessPermission(req.user.userId, id);
      if (!hasPermission && !req.user.isAdmin) {
        return res.status(404).json(error('Business not found', 'NOT_FOUND'));
      }
    }

    // Get user's role if authenticated
    let userRole = null;
    if (req.user) {
      const roleResult = await pool.query(
        `SELECT role FROM user_business_roles 
         WHERE user_id = $1 AND business_id = $2 AND is_deleted = false`,
        [req.user.userId, id]
      );
      if (roleResult.rows.length > 0) {
        userRole = roleResult.rows[0].role;
      }
    }

    res.json(success({
      ...business,
      user_role: userRole,
    }));

  } catch (err) {
    next(err);
  }
});

// PATCH /api/businesses/:id - Update business
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content_json, change_summary } = req.body;

    if (!isValidUUID(id)) {
      return res.status(400).json(error('Invalid business ID', 'INVALID_ID'));
    }

    if (!content_json || typeof content_json !== 'object') {
      return res.status(400).json(error('content_json is required and must be a valid JSON object', 'INVALID_JSON'));
    }

    // Check permission (employee or higher)
    const { hasPermission, role } = await checkBusinessPermission(req.user.userId, id, 'employee');
    if (!hasPermission) {
      return res.status(403).json(error('You do not have permission to edit this business', 'FORBIDDEN'));
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get current business data
      const currentResult = await client.query(
        `SELECT business_id, content_json, content_version, business_name, category, region, status
         FROM businesses WHERE business_id = $1`,
        [id]
      );

      if (currentResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json(error('Business not found', 'NOT_FOUND'));
      }

      const currentBusiness = currentResult.rows[0];

      if (currentBusiness.status === 'deleted') {
        await client.query('ROLLBACK');
        return res.status(403).json(error('Cannot edit deleted business', 'BUSINESS_DELETED'));
      }

      // Save current version to history
      await client.query(
        `INSERT INTO business_content_history (business_id, content_json, content_version, changed_by, change_type, change_summary)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          id,
          currentBusiness.content_json,
          currentBusiness.content_version,
          req.user.userId,
          role === 'owner' ? 'owner_edit' : 'admin_edit',
          change_summary || 'Content update'
        ]
      );

      // Extract indexed fields from content_json
      const businessName = content_json.profile?.en?.business_name || currentBusiness.business_name;
      const category = content_json.profile?.en?.category || currentBusiness.category;
      const region = content_json.location?.region || currentBusiness.region;

      // Update business with new content
      const updateResult = await client.query(
        `UPDATE businesses 
         SET content_json = $1, 
             content_version = content_version + 1,
             business_name = $2,
             category = $3,
             region = $4,
             updated_at = NOW()
         WHERE business_id = $5
         RETURNING business_id, business_name, category, region, content_version, updated_at`,
        [JSON.stringify(content_json), businessName, category, region, id]
      );

      await client.query('COMMIT');

      const updatedBusiness = updateResult.rows[0];

      logger.info('Business content updated', {
        businessId: id,
        userId: req.user.userId,
        newVersion: updatedBusiness.content_version,
      });

      res.json(success({
        business_id: updatedBusiness.business_id,
        business_name: updatedBusiness.business_name,
        content_version: updatedBusiness.content_version,
        updated_at: updatedBusiness.updated_at,
      }, 'Business updated successfully'));

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

// GET /api/businesses/:id/content - Get content JSON only
router.get('/:id/content', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json(error('Invalid business ID', 'INVALID_ID'));
    }

    const result = await pool.query(
      `SELECT content_json, content_version FROM businesses WHERE business_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(error('Business not found', 'NOT_FOUND'));
    }

    res.json(success(result.rows[0]));

  } catch (err) {
    next(err);
  }
});

// GET /api/businesses/:id/content/history - Get content version history
router.get('/:id/content/history', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json(error('Invalid business ID', 'INVALID_ID'));
    }

    // Check permission
    const { hasPermission } = await checkBusinessPermission(req.user.userId, id);
    if (!hasPermission && !req.user.isAdmin) {
      return res.status(403).json(error('You do not have permission to view this business history', 'FORBIDDEN'));
    }

    const result = await pool.query(
      `SELECT h.history_id, h.content_version, h.change_type, h.change_summary, h.created_at,
              u.full_name as changed_by_name, u.user_id as changed_by_id
       FROM business_content_history h
       LEFT JOIN users u ON h.changed_by = u.user_id
       WHERE h.business_id = $1
       ORDER BY h.content_version DESC`,
      [id]
    );

    res.json(success({
      business_id: id,
      history: result.rows,
    }));

  } catch (err) {
    next(err);
  }
});

// GET /api/businesses/:id/content/history/:version - Get specific version
router.get('/:id/content/history/:version', requireAuth, async (req, res, next) => {
  try {
    const { id, version } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json(error('Invalid business ID', 'INVALID_ID'));
    }

    const versionNum = parseInt(version, 10);
    if (isNaN(versionNum) || versionNum < 1) {
      return res.status(400).json(error('Invalid version number', 'INVALID_VERSION'));
    }

    // Check permission
    const { hasPermission } = await checkBusinessPermission(req.user.userId, id);
    if (!hasPermission && !req.user.isAdmin) {
      return res.status(403).json(error('You do not have permission to view this business history', 'FORBIDDEN'));
    }

    const result = await pool.query(
      `SELECT h.history_id, h.content_json, h.content_version, h.change_type, h.change_summary, h.created_at,
              u.full_name as changed_by_name
       FROM business_content_history h
       LEFT JOIN users u ON h.changed_by = u.user_id
       WHERE h.business_id = $1 AND h.content_version = $2`,
      [id, versionNum]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(error('Version not found', 'VERSION_NOT_FOUND'));
    }

    res.json(success(result.rows[0]));

  } catch (err) {
    next(err);
  }
});

// POST /api/businesses/:id/content/rollback - Rollback to previous version
router.post('/:id/content/rollback', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { version, reason } = req.body;

    if (!isValidUUID(id)) {
      return res.status(400).json(error('Invalid business ID', 'INVALID_ID'));
    }

    const versionNum = parseInt(version, 10);
    if (isNaN(versionNum) || versionNum < 1) {
      return res.status(400).json(error('Invalid version number', 'INVALID_VERSION'));
    }

    // Check permission (owner or admin only)
    const isOwner = await isBusinessOwner(req.user.userId, id);
    if (!isOwner && !req.user.isAdmin) {
      return res.status(403).json(error('Only business owners or admins can rollback content', 'FORBIDDEN'));
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get the version to rollback to
      const historyResult = await client.query(
        `SELECT content_json FROM business_content_history 
         WHERE business_id = $1 AND content_version = $2`,
        [id, versionNum]
      );

      if (historyResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json(error('Version not found', 'VERSION_NOT_FOUND'));
      }

      const rollbackContent = historyResult.rows[0].content_json;

      // Get current business data
      const currentResult = await client.query(
        `SELECT content_json, content_version FROM businesses WHERE business_id = $1`,
        [id]
      );

      const currentBusiness = currentResult.rows[0];

      // Save current version to history before rollback
      await client.query(
        `INSERT INTO business_content_history (business_id, content_json, content_version, changed_by, change_type, change_summary)
         VALUES ($1, $2, $3, $4, 'system', $5)`,
        [
          id,
          currentBusiness.content_json,
          currentBusiness.content_version,
          req.user.userId,
          `Rollback to version ${versionNum}${reason ? ': ' + reason : ''}`
        ]
      );

      // Extract indexed fields from rollback content
      const businessName = rollbackContent.profile?.en?.business_name;
      const category = rollbackContent.profile?.en?.category;
      const region = rollbackContent.location?.region;

      // Update business with rollback content
      const updateResult = await client.query(
        `UPDATE businesses 
         SET content_json = $1, 
             content_version = content_version + 1,
             business_name = COALESCE($2, business_name),
             category = COALESCE($3, category),
             region = COALESCE($4, region),
             updated_at = NOW()
         WHERE business_id = $5
         RETURNING content_version`,
        [rollbackContent, businessName, category, region, id]
      );

      // Log audit trail if admin performed rollback
      if (req.user.isAdmin) {
        await client.query(
          `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, reason)
           VALUES ($1, 'content_rollback', 'business', $2, $3)`,
          [req.user.userId, id, reason || `Rolled back to version ${versionNum}`]
        );
      }

      await client.query('COMMIT');

      const newVersion = updateResult.rows[0].content_version;

      logger.info('Business content rolled back', {
        businessId: id,
        userId: req.user.userId,
        fromVersion: currentBusiness.content_version,
        toVersion: versionNum,
        newVersion,
      });

      res.json(success({
        business_id: id,
        rolled_back_to_version: versionNum,
        new_version: newVersion,
      }, 'Content rolled back successfully'));

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

// GET /api/businesses/:id/users - Get users linked to business
router.get('/:id/users', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json(error('Invalid business ID', 'INVALID_ID'));
    }

    // Check permission
    const { hasPermission } = await checkBusinessPermission(req.user.userId, id);
    if (!hasPermission) {
      return res.status(403).json(error('You do not have permission to view this business users', 'FORBIDDEN'));
    }

    const result = await pool.query(
      `SELECT u.user_id, u.full_name, u.phone, u.email, ubr.role, ubr.created_at
       FROM user_business_roles ubr
       JOIN users u ON ubr.user_id = u.user_id
       WHERE ubr.business_id = $1 AND ubr.is_deleted = false
       ORDER BY 
         CASE ubr.role 
           WHEN 'owner' THEN 1 
           WHEN 'admin' THEN 2 
           WHEN 'employee' THEN 3 
         END,
         ubr.created_at`,
      [id]
    );

    res.json(success({
      business_id: id,
      users: result.rows,
    }));

  } catch (err) {
    next(err);
  }
});

// POST /api/businesses/:id/users - Add user to business
router.post('/:id/users', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { user_id, role } = req.body;

    if (!isValidUUID(id) || !isValidUUID(user_id)) {
      return res.status(400).json(error('Invalid business or user ID', 'INVALID_ID'));
    }

    if (!['admin', 'employee'].includes(role)) {
      return res.status(400).json(error('Role must be admin or employee', 'INVALID_ROLE'));
    }

    // Only owner can add users
    const isOwner = await isBusinessOwner(req.user.userId, id);
    if (!isOwner) {
      return res.status(403).json(error('Only business owners can add users', 'FORBIDDEN'));
    }

    // Check if user exists
    const userCheck = await pool.query('SELECT user_id FROM users WHERE user_id = $1', [user_id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json(error('User not found', 'USER_NOT_FOUND'));
    }

    // Add user to business
    const result = await pool.query(
      `INSERT INTO user_business_roles (user_id, business_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, business_id, role) 
       DO UPDATE SET is_deleted = false, updated_at = NOW()
       RETURNING id, role, created_at`,
      [user_id, id, role]
    );

    logger.info('User added to business', { businessId: id, addedUserId: user_id, role });

    res.status(201).json(success({
      user_id,
      business_id: id,
      role: result.rows[0].role,
    }, 'User added to business successfully'));

  } catch (err) {
    next(err);
  }
});

// DELETE /api/businesses/:id/users/:userId - Remove user from business
router.delete('/:id/users/:userId', requireAuth, async (req, res, next) => {
  try {
    const { id, userId } = req.params;

    if (!isValidUUID(id) || !isValidUUID(userId)) {
      return res.status(400).json(error('Invalid business or user ID', 'INVALID_ID'));
    }

    // Only owner can remove users
    const isOwner = await isBusinessOwner(req.user.userId, id);
    if (!isOwner) {
      return res.status(403).json(error('Only business owners can remove users', 'FORBIDDEN'));
    }

    // Cannot remove owner
    const targetUserRole = await pool.query(
      `SELECT role FROM user_business_roles WHERE user_id = $1 AND business_id = $2`,
      [userId, id]
    );

    if (targetUserRole.rows.length > 0 && targetUserRole.rows[0].role === 'owner') {
      return res.status(403).json(error('Cannot remove business owner', 'CANNOT_REMOVE_OWNER'));
    }

    // Soft delete
    await pool.query(
      `UPDATE user_business_roles 
       SET is_deleted = true, updated_at = NOW()
       WHERE user_id = $1 AND business_id = $2`,
      [userId, id]
    );

    logger.info('User removed from business', { businessId: id, removedUserId: userId });

    res.json(success({ message: 'User removed from business successfully' }));

  } catch (err) {
    next(err);
  }
});

export default router;
