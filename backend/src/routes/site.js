import express from 'express';
import { success, error } from '../utils/response.js';
import pool from '../config/database.js';
import { readAppConfig, getBusinessFolder, listImagesForType } from '../services/media.js';

const router = express.Router();

// GET /api/site/:tag — Public one-page business site
router.get('/:tag', async (req, res, next) => {
  try {
    const { tag } = req.params;

    const result = await pool.query(
      `SELECT
         business_id,
         business_name,
         business_tag,
         category,
         region,
         subdomain,
         logo_url,
         verification_tier,
         content_json
       FROM businesses
       WHERE business_tag = $1 AND status = 'active'`,
      [tag]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(error('Business not found', 'NOT_FOUND'));
    }

    const b = result.rows[0];
    const c = b.content_json || {};
    const mediaPrimary = c.media || {};

    // Load photos from the filesystem (best-effort — empty if folder missing)
    let images = {};
    try {
      const appConfig = await readAppConfig();
      const businessFolder = getBusinessFolder(b.business_tag);
      const types = Object.keys(appConfig.image_types);
      const results = await Promise.all(
        types.map(t => listImagesForType(businessFolder, t, appConfig, b.business_tag))
      );
      types.forEach((t, i) => {
        images[t] = results[i];
      });
    } catch {
      // non-fatal — site still renders without photos
    }

    res.json(success({
      business_id: b.business_id,
      business_name: b.business_name,
      business_tag: b.business_tag,
      category: b.category,
      region: b.region,
      subdomain: b.subdomain,
      logo_url: b.logo_url,
      verification_tier: b.verification_tier,
      site_template: c.site_template || 'classic',
      profile: c.profile?.en || {},
      contact: c.contact || {},
      location: c.location || {},
      hours: c.hours || {},
      images,
      media_primary: mediaPrimary,
      products: Array.isArray(c.products) ? c.products : [],
    }));
  } catch (err) {
    next(err);
  }
});

export default router;
