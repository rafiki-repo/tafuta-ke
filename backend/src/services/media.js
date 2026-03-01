/**
 * media.js — Business image processing service (PRD-07)
 *
 * Handles: app-config caching, business folder resolution, slug generation,
 * image transform/WebP output via sharp, transform spec (.jfx) read/write,
 * and image file deletion.
 */

import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import flexJson from 'flex-json';
import config from '../config/index.js';
import logger from '../utils/logger.js';

// ---------------------------------------------------------------------------
// App config cache
// ---------------------------------------------------------------------------

let _appConfigCache = null;
let _appConfigCacheTime = 0;
const CONFIG_TTL_MS = 60_000; // 60 seconds

function getConfigPath() {
  return path.join(config.media.path, 'app-config.jfx');
}

/**
 * Read and parse app-config.jfx, with a 60-second in-memory cache.
 * Returns { max_upload_size_mb, accepted_formats, image_types }.
 */
export async function readAppConfig() {
  const now = Date.now();
  if (_appConfigCache && now - _appConfigCacheTime < CONFIG_TTL_MS) {
    return _appConfigCache;
  }

  const configPath = getConfigPath();
  const fj = new flexJson();
  fj.DeserializeFlexFile(configPath);

  const maxUploadSizeMb = fj.getNum('max_upload_size_mb') || 10;

  // accepted_formats: hardcoded because flex-json array iteration is not
  // straightforward for simple value arrays; these formats rarely change.
  const accepted_formats = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

  // image_types: iterate the object whose keys are type names
  const image_types = {};
  fj.item('image_types').forEach((typeItem) => {
    const typeName = typeItem._key;
    if (!typeName) return;

    const label = typeItem.getStr('label');
    const max_images = typeItem.getNum('max_images');

    const sizes = {};
    typeItem.item('sizes').forEach((sizeItem) => {
      const sizeTag = sizeItem._key;
      if (!sizeTag) return;
      sizes[sizeTag] = {
        width: sizeItem.getNum('width'),
        height: sizeItem.getNum('height'),
      };
    });

    image_types[typeName] = { label, max_images, sizes };
  });

  _appConfigCache = { max_upload_size_mb: maxUploadSizeMb, accepted_formats, image_types };
  _appConfigCacheTime = now;
  return _appConfigCache;
}

export function invalidateAppConfigCache() {
  _appConfigCache = null;
  _appConfigCacheTime = 0;
}

// ---------------------------------------------------------------------------
// Folder helpers
// ---------------------------------------------------------------------------

/**
 * Returns the absolute path to a business's media folder.
 * e.g. /var/www/media/daniels-salon_550e8400-e29b-41d4-a716-446655440000
 */
export function getBusinessFolder(businessTag, businessId) {
  return path.join(config.media.path, `${businessTag}_${businessId}`);
}

// ---------------------------------------------------------------------------
// Slug helpers
// ---------------------------------------------------------------------------

export function slugifyName(displayName) {
  return (
    displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'image'
  );
}

export function resolveSlugConflict(baseSlug, existingSlugs) {
  if (!existingSlugs.includes(baseSlug)) return baseSlug;
  let i = 2;
  while (existingSlugs.includes(`${baseSlug}-${i}`)) i++;
  return `${baseSlug}-${i}`;
}

/**
 * Returns all slugs that already exist for a given image type in a business folder
 * (based on .jfx files present in the type subfolder).
 */
export async function getExistingSlugs(businessFolder, imageType) {
  const typeFolder = path.join(businessFolder, imageType);
  try {
    const files = await fs.readdir(typeFolder);
    return files.filter((f) => f.endsWith('.jfx')).map((f) => f.slice(0, -4));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Image processing
// ---------------------------------------------------------------------------

/**
 * Transform a source image buffer into a WebP output buffer at targetSize.
 *
 * Transform pipeline order (matches Canvas preview in §8):
 *   1. brightness + saturation (modulate)
 *   2. contrast (linear)
 *   3. rotate
 *   4. flip (horizontal / vertical)
 *   5. resize to zoomed dimensions (cover fit)
 *   6. extract crop region (offset_x / offset_y)
 *   7. encode as WebP
 *
 * @param {Buffer} sourceBuffer
 * @param {object} transform  - all 9 transform parameters
 * @param {{ width: number, height: number }} targetSize
 * @returns {Promise<Buffer>} WebP-encoded buffer
 */
export async function processImage(sourceBuffer, transform, targetSize) {
  const {
    zoom = 1.0,
    offset_x = 0,
    offset_y = 0,
    rotation = 0,
    flip_horizontal = false,
    flip_vertical = false,
    brightness = 0.0,
    contrast = 0.0,
    saturation = 0.0,
  } = transform;

  const { width: targetW, height: targetH } = targetSize;

  let img = sharp(sourceBuffer);

  // 1. Brightness + saturation
  //    sharp modulate: 1.0 = no change. Our range -1..+1 maps to 0..2.
  const brightnessMult = Math.max(0, 1 + brightness);
  const satMult = Math.max(0, 1 + saturation);
  img = img.modulate({ brightness: brightnessMult, saturation: satMult });

  // 2. Contrast: linear(a, b) where output = a * input + b
  //    a = 1 + contrast; b chosen so the midpoint (128) stays at 128.
  if (contrast !== 0) {
    const a = 1 + contrast;
    const b = 128 * (1 - a);
    img = img.linear(a, b);
  }

  // 3. Rotation (clockwise degrees); fill exposed corners with black.
  if (rotation !== 0) {
    img = img.rotate(rotation, { background: { r: 0, g: 0, b: 0, alpha: 1 } });
  }

  // 4. Flips
  if (flip_horizontal) img = img.flop(); // mirror left–right
  if (flip_vertical) img = img.flip();   // mirror top–bottom

  // 5. Zoom: resize so the zoomed image fully covers the target dimensions.
  const safeZoom = Math.max(1.0, zoom);
  const zoomedW = Math.round(targetW * safeZoom);
  const zoomedH = Math.round(targetH * safeZoom);
  img = img.resize(zoomedW, zoomedH, { fit: 'cover', position: 'centre' });

  // 6. Extract the target region, centred on the zoomed image + offset.
  let cropLeft = Math.round((zoomedW - targetW) / 2 + offset_x);
  let cropTop = Math.round((zoomedH - targetH) / 2 + offset_y);
  cropLeft = Math.max(0, Math.min(cropLeft, zoomedW - targetW));
  cropTop = Math.max(0, Math.min(cropTop, zoomedH - targetH));
  img = img.extract({ left: cropLeft, top: cropTop, width: targetW, height: targetH });

  // 7. Encode as WebP
  return img.webp({ quality: 85 }).toBuffer();
}

// ---------------------------------------------------------------------------
// Transform spec (.jfx) read/write
// ---------------------------------------------------------------------------

export async function writeTransformSpec(businessFolder, imageType, slug, spec) {
  const typeFolder = path.join(businessFolder, imageType);
  await fs.mkdir(typeFolder, { recursive: true });
  const specPath = path.join(typeFolder, `${slug}.jfx`);
  await fs.writeFile(specPath, JSON.stringify(spec, null, 2), 'utf8');
}

export async function readTransformSpec(businessFolder, imageType, slug) {
  const specPath = path.join(businessFolder, imageType, `${slug}.jfx`);
  const raw = await fs.readFile(specPath, 'utf8');
  return JSON.parse(raw);
}

// ---------------------------------------------------------------------------
// Delete helpers
// ---------------------------------------------------------------------------

/**
 * Delete all files associated with one image:
 *   - {imageType}/{slug}.jfx
 *   - {imageType}/{slug}_*.webp  (all size outputs)
 *   - {slug}.{sourceExt}         (source file in business root)
 */
export async function deleteImageFiles(businessFolder, imageType, slug, sourceExt) {
  const typeFolder = path.join(businessFolder, imageType);

  // Delete .jfx spec
  await fs.unlink(path.join(typeFolder, `${slug}.jfx`)).catch(() => {});

  // Delete all WebP outputs for this slug
  try {
    const files = await fs.readdir(typeFolder);
    await Promise.all(
      files
        .filter((f) => f.startsWith(`${slug}_`) && f.endsWith('.webp'))
        .map((f) => fs.unlink(path.join(typeFolder, f)).catch(() => {}))
    );
  } catch {}

  // Delete source file from business root
  if (sourceExt) {
    await fs.unlink(path.join(businessFolder, `${slug}.${sourceExt}`)).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Count / list helpers
// ---------------------------------------------------------------------------

/** Returns the number of images of a given type (count of .jfx files). */
export async function countImages(businessFolder, imageType) {
  const typeFolder = path.join(businessFolder, imageType);
  try {
    const files = await fs.readdir(typeFolder);
    return files.filter((f) => f.endsWith('.jfx')).length;
  } catch {
    return 0;
  }
}

/**
 * List all images for a given type. Returns an array of:
 *   { slug, name, source, uploaded_at, sizes: { sizeTag: '/media/...' } }
 */
export async function listImagesForType(businessFolder, imageType, appConfig, businessTag, businessId) {
  const typeFolder = path.join(businessFolder, imageType);
  const imageSizes = appConfig.image_types[imageType]?.sizes ?? {};

  try {
    const files = await fs.readdir(typeFolder);
    const jfxFiles = files.filter((f) => f.endsWith('.jfx'));

    const results = [];
    for (const jfxFile of jfxFiles) {
      const slug = jfxFile.slice(0, -4);
      try {
        const spec = await readTransformSpec(businessFolder, imageType, slug);
        const sizes = {};
        for (const sizeTag of Object.keys(imageSizes)) {
          sizes[sizeTag] = `/media/${businessTag}_${businessId}/${imageType}/${slug}_${sizeTag}.webp`;
        }
        results.push({
          slug,
          name: spec.name,
          source: spec.source,
          uploaded_at: spec.uploaded_at,
          sizes,
        });
      } catch {
        // Skip any unreadable specs
      }
    }
    return results;
  } catch {
    return [];
  }
}
