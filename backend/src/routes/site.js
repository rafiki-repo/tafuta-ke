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
         b.business_id,
         b.business_name,
         b.business_tag,
         b.category,
         b.region,
         b.subdomain,
         b.logo_url,
         b.verification_tier,
         b.content_json,
         EXISTS (
           SELECT 1 FROM service_subscriptions ss
           WHERE ss.business_id = b.business_id
             AND ss.service_type = 'website_hosting'
             AND ss.status = 'active'
             AND (ss.expiration_date IS NULL OR ss.expiration_date > CURRENT_DATE)
         ) AS has_website_hosting
       FROM businesses b
       WHERE b.business_tag = $1 AND b.status = 'active'`,
      [tag]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(error('Business not found', 'NOT_FOUND'));
    }

    const b = result.rows[0];
    const c = b.content_json || {};

    // Access control: explicit false → always blocked.
    // Not set → require active website_hosting subscription.
    const websiteEnabled = c.website_enabled;
    if (websiteEnabled === false || (websiteEnabled === undefined && !b.has_website_hosting)) {
      return res.status(404).json(error('Website not available', 'WEBSITE_DISABLED'));
    }
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
      website_enabled: websiteEnabled === true || b.has_website_hosting,
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
