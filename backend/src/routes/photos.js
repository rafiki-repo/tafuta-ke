/**
 * photos.js — Photo upload and management endpoints (PRD-07)
 *
 * Mounted at /api in server.js. Routes:
 *   GET  /api/photos/config
 *   POST /api/businesses/:id/photos
 *   GET  /api/businesses/:id/photos
 *   PATCH /api/businesses/:id/photos/:slug
 *   DELETE /api/businesses/:id/photos/:slug
 */

import express from 'express';
import multer from 'multer';
import { promises as fs } from 'fs';
import path from 'path';
import { requireAuth } from '../middleware/auth.js';
import { success, error } from '../utils/response.js';
import { isValidUUID } from '../utils/validation.js';
import { checkBusinessPermission } from '../utils/permissions.js';
import pool from '../config/database.js';
import logger from '../utils/logger.js';
import {
  readAppConfig,
  getBusinessFolder,
  slugifyName,
  resolveSlugConflict,
  getExistingSlugs,
  processImage,
  writeTransformSpec,
  readTransformSpec,
  deleteImageFiles,
  countImages,
  listImagesForType,
} from '../services/media.js';

const router = express.Router();

// multer: store in memory; enforce a hard cap of 10 MB (config can be stricter)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ---------------------------------------------------------------------------
// Magic-byte file type detection
// ---------------------------------------------------------------------------

function detectImageExt(buffer) {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'jpg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return 'png';
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'gif';
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) return 'webp';
  return null;
}

// ---------------------------------------------------------------------------
// Normalise transform body — coerce types and apply defaults
// ---------------------------------------------------------------------------

function normaliseTransform(raw = {}) {
  return {
    zoom:             Math.max(1.0, Number(raw.zoom)             || 1.0),
    offset_x:         Number(raw.offset_x)          || 0,
    offset_y:         Number(raw.offset_y)          || 0,
    rotation:          Number(raw.rotation)           || 0,
    flip_horizontal:   Boolean(raw.flip_horizontal),
    flip_vertical:     Boolean(raw.flip_vertical),
    brightness:        Number(raw.brightness)         || 0.0,
    contrast:          Number(raw.contrast)           || 0.0,
    saturation:        Number(raw.saturation)         || 0.0,
  };
}

// ---------------------------------------------------------------------------
// GET /api/photos/config
// ---------------------------------------------------------------------------

router.get('/photos/config', async (req, res, next) => {
  try {
    const appConfig = await readAppConfig();
    res.json(success(appConfig));
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/businesses/:id/photos — Upload a new photo
// ---------------------------------------------------------------------------

router.post('/businesses/:id/photos', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json(error('Invalid business ID', 'INVALID_ID'));
    }

    if (!req.file) {
      return res.status(400).json(error('No file uploaded', 'NO_FILE'));
    }

    const { image_type, image_name } = req.body;
    if (!image_type || !image_name) {
      return res.status(400).json(error('image_type and image_name are required', 'VALIDATION_ERROR'));
    }

    let rawTransform = {};
    if (req.body.transform) {
      try {
        rawTransform = typeof req.body.transform === 'string'
          ? JSON.parse(req.body.transform)
          : req.body.transform;
      } catch {
        return res.status(400).json(error('transform must be a valid JSON string', 'INVALID_TRANSFORM'));
      }
    }
    const transform = normaliseTransform(rawTransform);

    // Permission: employee or higher
    const { hasPermission } = await checkBusinessPermission(req.user.userId, id, 'employee');
    if (!hasPermission && !req.user.isAdmin) {
      return res.status(403).json(error('You do not have permission to upload photos', 'FORBIDDEN'));
    }

    const bizResult = await pool.query(
      'SELECT business_tag FROM businesses WHERE business_id = $1',
      [id]
    );
    if (bizResult.rows.length === 0) {
      return res.status(404).json(error('Business not found', 'NOT_FOUND'));
    }
    const { business_tag } = bizResult.rows[0];

    const appConfig = await readAppConfig();

    // Validate image_type
    if (!appConfig.image_types[image_type]) {
      return res.status(400).json(error(`Unknown image type: ${image_type}`, 'INVALID_IMAGE_TYPE'));
    }

    // Validate file via magic bytes
    const detectedExt = detectImageExt(req.file.buffer);
    if (!detectedExt) {
      return res.status(400).json(error('File does not appear to be a valid image', 'INVALID_FILE_TYPE'));
    }

    // Validate file size against config
    const maxBytes = appConfig.max_upload_size_mb * 1024 * 1024;
    if (req.file.buffer.length > maxBytes) {
      return res.status(400).json(error(
        `File exceeds the maximum upload size of ${appConfig.max_upload_size_mb} MB`,
        'FILE_TOO_LARGE'
      ));
    }

    const businessFolder = getBusinessFolder(business_tag, id);
    const typeConfig = appConfig.image_types[image_type];

    // Check max_images limit
    const existingCount = await countImages(businessFolder, image_type);
    if (existingCount >= typeConfig.max_images) {
      return res.status(400).json(error(
        `You have reached the maximum number of ${image_type} images (${typeConfig.max_images}). Delete one to make room.`,
        'MAX_IMAGES_REACHED'
      ));
    }

    // Generate slug, resolve conflicts
    const baseSlug = slugifyName(image_name);
    const existingSlugs = await getExistingSlugs(businessFolder, image_type);
    const slug = resolveSlugConflict(baseSlug, existingSlugs);
    const nameModified = slug !== baseSlug;

    // Ensure business folder exists
    await fs.mkdir(businessFolder, { recursive: true });

    // Save source file (original format, unchanged)
    const sourceFilename = `${slug}.${detectedExt}`;
    await fs.writeFile(path.join(businessFolder, sourceFilename), req.file.buffer);

    // Build and write transform spec
    const spec = {
      name: image_name,
      source: sourceFilename,
      type: image_type,
      uploaded_by: req.user.userId,
      uploaded_at: new Date().toISOString(),
      transform,
    };
    await writeTransformSpec(businessFolder, image_type, slug, spec);

    // Generate WebP outputs for each configured size
    const sizes = {};
    for (const [sizeTag, sizeConfig] of Object.entries(typeConfig.sizes)) {
      const webpBuffer = await processImage(req.file.buffer, transform, sizeConfig);
      const webpPath = path.join(businessFolder, image_type, `${slug}_${sizeTag}.webp`);
      await fs.writeFile(webpPath, webpBuffer);
      sizes[sizeTag] = `/media/${business_tag}_${id}/${image_type}/${slug}_${sizeTag}.webp`;
    }

    logger.info('Photo uploaded', { businessId: id, imageType: image_type, slug });

    res.status(201).json(success({
      slug,
      image_type,
      name: image_name,
      sizes,
      ...(nameModified ? { warning: `Image name was modified to "${slug}" to avoid a filename conflict.` } : {}),
    }, 'Photo uploaded successfully'));

  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/businesses/:id/photos — List all photos grouped by type
// ---------------------------------------------------------------------------

router.get('/businesses/:id/photos', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json(error('Invalid business ID', 'INVALID_ID'));
    }

    const { hasPermission } = await checkBusinessPermission(req.user.userId, id, 'employee');
    if (!hasPermission && !req.user.isAdmin) {
      return res.status(403).json(error('You do not have permission to view photos', 'FORBIDDEN'));
    }

    const bizResult = await pool.query(
      'SELECT business_tag FROM businesses WHERE business_id = $1',
      [id]
    );
    if (bizResult.rows.length === 0) {
      return res.status(404).json(error('Business not found', 'NOT_FOUND'));
    }
    const { business_tag } = bizResult.rows[0];

    const appConfig = await readAppConfig();
    const businessFolder = getBusinessFolder(business_tag, id);

    const result = {};
    for (const imageType of Object.keys(appConfig.image_types)) {
      result[imageType] = await listImagesForType(
        businessFolder, imageType, appConfig, business_tag, id
      );
    }

    res.json(success(result));

  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/businesses/:id/photos/:slug — Update transform (no re-upload)
// ---------------------------------------------------------------------------

router.patch('/businesses/:id/photos/:slug', requireAuth, async (req, res, next) => {
  try {
    const { id, slug } = req.params;
    const { image_type, transform: rawTransform } = req.body;

    if (!isValidUUID(id)) {
      return res.status(400).json(error('Invalid business ID', 'INVALID_ID'));
    }
    if (!image_type || !rawTransform || typeof rawTransform !== 'object') {
      return res.status(400).json(error('image_type and transform object are required', 'VALIDATION_ERROR'));
    }

    const transform = normaliseTransform(rawTransform);

    const { hasPermission } = await checkBusinessPermission(req.user.userId, id, 'employee');
    if (!hasPermission && !req.user.isAdmin) {
      return res.status(403).json(error('You do not have permission to edit photos', 'FORBIDDEN'));
    }

    const bizResult = await pool.query(
      'SELECT business_tag FROM businesses WHERE business_id = $1',
      [id]
    );
    if (bizResult.rows.length === 0) {
      return res.status(404).json(error('Business not found', 'NOT_FOUND'));
    }
    const { business_tag } = bizResult.rows[0];

    const appConfig = await readAppConfig();
    if (!appConfig.image_types[image_type]) {
      return res.status(400).json(error(`Unknown image type: ${image_type}`, 'INVALID_IMAGE_TYPE'));
    }

    const businessFolder = getBusinessFolder(business_tag, id);

    // Load existing spec (confirms the image exists)
    let existingSpec;
    try {
      existingSpec = await readTransformSpec(businessFolder, image_type, slug);
    } catch {
      return res.status(404).json(error('Image not found', 'NOT_FOUND'));
    }

    // Delete stale WebP outputs before regenerating
    const typeFolder = path.join(businessFolder, image_type);
    try {
      const files = await fs.readdir(typeFolder);
      await Promise.all(
        files
          .filter((f) => f.startsWith(`${slug}_`) && f.endsWith('.webp'))
          .map((f) => fs.unlink(path.join(typeFolder, f)).catch(() => {}))
      );
    } catch {}

    // Write updated spec (preserve original metadata)
    const updatedSpec = { ...existingSpec, transform };
    await writeTransformSpec(businessFolder, image_type, slug, updatedSpec);

    // Regenerate all WebP outputs from the source file
    const sourceBuffer = await fs.readFile(path.join(businessFolder, existingSpec.source));
    const typeConfig = appConfig.image_types[image_type];
    const sizes = {};
    for (const [sizeTag, sizeConfig] of Object.entries(typeConfig.sizes)) {
      const webpBuffer = await processImage(sourceBuffer, transform, sizeConfig);
      await fs.writeFile(path.join(typeFolder, `${slug}_${sizeTag}.webp`), webpBuffer);
      sizes[sizeTag] = `/media/${business_tag}_${id}/${image_type}/${slug}_${sizeTag}.webp`;
    }

    logger.info('Photo transform updated', { businessId: id, imageType: image_type, slug });

    res.json(success({
      slug,
      image_type,
      name: updatedSpec.name,
      sizes,
    }, 'Photo transform updated successfully'));

  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/businesses/:id/photos/:slug — Delete a photo
// ---------------------------------------------------------------------------

router.delete('/businesses/:id/photos/:slug', requireAuth, async (req, res, next) => {
  try {
    const { id, slug } = req.params;
    const { image_type } = req.body;

    if (!isValidUUID(id)) {
      return res.status(400).json(error('Invalid business ID', 'INVALID_ID'));
    }
    if (!image_type) {
      return res.status(400).json(error('image_type is required', 'VALIDATION_ERROR'));
    }

    // Employees cannot delete (PRD-07 §13)
    const { hasPermission } = await checkBusinessPermission(req.user.userId, id, 'admin');
    if (!hasPermission && !req.user.isAdmin) {
      return res.status(403).json(error('You do not have permission to delete photos', 'FORBIDDEN'));
    }

    const bizResult = await pool.query(
      'SELECT business_tag, content_json FROM businesses WHERE business_id = $1',
      [id]
    );
    if (bizResult.rows.length === 0) {
      return res.status(404).json(error('Business not found', 'NOT_FOUND'));
    }
    const { business_tag, content_json } = bizResult.rows[0];

    const businessFolder = getBusinessFolder(business_tag, id);

    // Read spec to confirm existence and get source filename
    let spec;
    try {
      spec = await readTransformSpec(businessFolder, image_type, slug);
    } catch {
      return res.status(404).json(error('Image not found', 'NOT_FOUND'));
    }

    const sourceExt = spec.source.includes('.') ? spec.source.split('.').pop() : null;

    // Delete all files (source + .jfx + .webp outputs)
    await deleteImageFiles(businessFolder, image_type, slug, sourceExt);

    // Remove slug from content_json.media if referenced, then save new content version
    let contentUpdated = false;
    const mediaRef = content_json?.media;
    if (mediaRef) {
      const typeRefs = mediaRef[image_type];
      if (typeRefs === slug) {
        content_json.media[image_type] = null;
        contentUpdated = true;
      } else if (Array.isArray(typeRefs) && typeRefs.includes(slug)) {
        content_json.media[image_type] = typeRefs.filter((s) => s !== slug);
        contentUpdated = true;
      }
    }

    if (contentUpdated) {
      await pool.query(
        `UPDATE businesses
         SET content_json = $1, content_version = content_version + 1, updated_at = NOW()
         WHERE business_id = $2`,
        [JSON.stringify(content_json), id]
      );
    }

    logger.info('Photo deleted', { businessId: id, imageType: image_type, slug });

    res.status(204).send();

  } catch (err) {
    next(err);
  }
});

export default router;
