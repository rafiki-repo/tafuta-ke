import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { success, paginated } from '../utils/response.js';
import pool from '../config/database.js';

const router = express.Router();

// GET /api/search - Search businesses
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { 
      q,           // search query
      category,    // filter by category
      region,      // filter by region
      page = 1,    // pagination
      limit = 20   // results per page
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const limitNum = parseInt(limit, 10);

    let whereClause = `WHERE b.status = 'active'`;
    const params = [];
    let paramCount = 1;

    // Category filter
    if (category) {
      whereClause += ` AND b.category = $${paramCount++}`;
      params.push(category);
    }

    // Region filter
    if (region) {
      whereClause += ` AND b.region = $${paramCount++}`;
      params.push(region);
    }

    // Text search
    let searchRank = '0';
    if (q && q.trim()) {
      whereClause += ` AND (
        b.business_name ILIKE $${paramCount} OR
        b.content_json::text ILIKE $${paramCount}
      )`;
      params.push(`%${q.trim()}%`);
      paramCount++;

      // Add search ranking
      searchRank = `
        CASE 
          WHEN b.business_name ILIKE $${paramCount} THEN 100
          WHEN b.business_name ILIKE $${paramCount + 1} THEN 50
          ELSE 10
        END
      `;
      params.push(`${q.trim()}%`);  // Starts with query
      params.push(`%${q.trim()}%`); // Contains query
      paramCount += 2;
    }

    // Ranking algorithm
    // - Verified businesses get boost
    // - Businesses with active ads get boost
    // - Search relevance
    // - Random element for variety
    const rankingQuery = `
      (
        CASE b.verification_tier
          WHEN 'premium' THEN 30
          WHEN 'verified' THEN 20
          WHEN 'basic' THEN 10
        END +
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM service_subscriptions ss 
            WHERE ss.business_id = b.business_id 
            AND ss.service_type = 'ads' 
            AND ss.status = 'active'
            AND (ss.expiration_date IS NULL OR ss.expiration_date > CURRENT_DATE)
          ) THEN 15
          ELSE 0
        END +
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM service_subscriptions ss 
            WHERE ss.business_id = b.business_id 
            AND ss.service_type = 'search_promotion' 
            AND ss.status = 'active'
            AND (ss.expiration_date IS NULL OR ss.expiration_date > CURRENT_DATE)
          ) THEN 10
          ELSE 0
        END +
        ${searchRank} +
        (RANDOM() * 5)
      ) DESC
    `;

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM businesses b
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params.slice(0, paramCount - (q ? 3 : 1)));
    const total = parseInt(countResult.rows[0].total, 10);

    // Get businesses
    params.push(limitNum);
    params.push(offset);

    const query = `
      SELECT
        b.business_id,
        b.business_name,
        b.business_tag,
        b.category,
        b.region,
        b.subdomain,
        b.logo_url,
        b.verification_tier,
        b.content_json,
        b.created_at,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM service_subscriptions ss 
            WHERE ss.business_id = b.business_id 
            AND ss.service_type = 'ads' 
            AND ss.status = 'active'
            AND (ss.expiration_date IS NULL OR ss.expiration_date > CURRENT_DATE)
          ) THEN true
          ELSE false
        END as has_active_ads
      FROM businesses b
      ${whereClause}
      ORDER BY ${rankingQuery}
      LIMIT $${paramCount++}
      OFFSET $${paramCount++}
    `;

    const result = await pool.query(query, params);

    const businesses = result.rows.map(b => ({
      business_id: b.business_id,
      business_name: b.business_name,
      business_tag: b.business_tag,
      category: b.category,
      region: b.region,
      subdomain: b.subdomain,
      logo_url: b.logo_url,
      verification_tier: b.verification_tier,
      has_active_ads: b.has_active_ads,
      media: b.content_json?.media || null,
      description: b.content_json?.profile?.en?.description || '',
      phone: b.content_json?.contact?.phone || '',
      created_at: b.created_at,
    }));

    res.json(paginated(businesses, {
      page: parseInt(page, 10),
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    }));

  } catch (err) {
    next(err);
  }
});

// GET /api/search/categories - Get all categories
router.get('/categories', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT value FROM system_config WHERE key = 'categories'`
    );

    if (result.rows.length === 0) {
      return res.json(success({ categories: [] }));
    }

    const categories = result.rows[0].value;

    res.json(success({ categories }));

  } catch (err) {
    next(err);
  }
});

// GET /api/search/regions - Get all regions
router.get('/regions', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT value FROM system_config WHERE key = 'regions'`
    );

    if (result.rows.length === 0) {
      return res.json(success({ regions: [] }));
    }

    const regions = result.rows[0].value;

    res.json(success({ regions }));

  } catch (err) {
    next(err);
  }
});

// GET /api/search/featured - Get featured businesses
router.get('/featured', async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const query = `
      SELECT 
        b.business_id,
        b.business_name,
        b.category,
        b.region,
        b.subdomain,
        b.logo_url,
        b.verification_tier,
        b.content_json
      FROM businesses b
      WHERE b.status = 'active'
      AND EXISTS (
        SELECT 1 FROM service_subscriptions ss 
        WHERE ss.business_id = b.business_id 
        AND ss.service_type IN ('ads', 'search_promotion')
        AND ss.status = 'active'
        AND (ss.expiration_date IS NULL OR ss.expiration_date > CURRENT_DATE)
      )
      ORDER BY 
        CASE b.verification_tier
          WHEN 'premium' THEN 1
          WHEN 'verified' THEN 2
          ELSE 3
        END,
        RANDOM()
      LIMIT $1
    `;

    const result = await pool.query(query, [parseInt(limit, 10)]);

    const businesses = result.rows.map(b => ({
      business_id: b.business_id,
      business_name: b.business_name,
      category: b.category,
      region: b.region,
      subdomain: b.subdomain,
      logo_url: b.logo_url,
      verification_tier: b.verification_tier,
      description: b.content_json?.profile?.en?.description || '',
    }));

    res.json(success({ businesses }));

  } catch (err) {
    next(err);
  }
});

export default router;
