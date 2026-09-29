# PRD-07: Business Photos & Image Management

**Product Requirements Document**
**Version**: 1.0
**Last Updated**: Sep 28, 2026
**Status**: Draft — MVP

---

## Overview

This PRD defines how business photos are uploaded, transformed, stored, and served on Tafuta. The image system is part of MVP.

Key design goals:
- Images are stored on the VPS filesystem and served directly by Caddy — the Node.js backend is never in the read path for images.
- Each business's images live in a folder identified by a human-readable slug (`business_tag`) combined with the business UUID for global uniqueness.
- Image transform parameters (crop, zoom, rotation, etc.) are stored in per-image flex-json (`.jfx`) config files alongside the generated WebP output files. This lets any image be regenerated at any time from the original source file.
- Business profile content (`content_json`) references images by a short name-tag only — the system constructs the full URL at render time.

---

## 1. Business Tag (`business_tag`)

The `business_tag` is a short, human-readable slug that identifies a business in the filesystem and in media URLs. It is a **new database field**, separate from `subdomain`.

### Format

- Lowercase letters, numbers, and hyphens only: `^[a-z0-9-]+$`
- Max 64 characters
- Examples: `heniv`, `daniels-salon`, `grace-hair-studio`

### Uniqueness

- Must be globally unique across all businesses (enforced by database UNIQUE constraint).
- Suggested automatically from `business_name` at creation time; owner can customise.

### Folder Naming

The business media folder is named after the `business_tag` only (which is unique across all businesses):

```
{business_tag}
```

Example: `daniels-salon`

### Renaming

If the `business_tag` is updated, the media folder on disk must be renamed:

```
old-tag  →  new-tag
```

The system renames the folder atomically and refuses if a rename is already in progress. `content_json` image references are unaffected (they store only image name-tags, not the folder path). However, any external URLs pointing to the old folder path will break — the owner is warned before confirming a rename.

### Relationship to `subdomain`

| Field | Purpose | Example |
|-------|---------|---------|
| `subdomain` | DNS/hosting (`subdomain.region.tafuta.ke`) | `daniels` |
| `business_tag` | Media folder slug and media URL segment | `daniels-salon` |

These are independent fields. A business may have one, both, or neither.

---

## 2. App Configuration (`app-config.jfx`)

`app-config.jfx` is a **flex-json** configuration file that defines all image types, output sizes, and upload limits for the platform.

### What is flex-json?

flex-json is a human-friendly superset of JSON designed for configuration files. Key differences from standard JSON:

| Feature | flex-json (.jfx) | Standard JSON |
|---------|-----------------|---------------|
| Comments | `//` and `/* */` | Not allowed |
| Quote requirement | Optional for simple strings | Required for all strings |
| Quote style | Single or double | Double only |
| Unquoted keys | Allowed | Not allowed |

Files use the `.jfx` extension. The `flex-json` npm package (`npm install flex-json`) parses and writes `.jfx` files. Package: https://www.npmjs.com/package/flex-json — Repository: https://github.com/tedtyree/FlexJson

### File Location

```
/var/www/tafuta/media/app-config.jfx
```

Managed by Tafuta staff only — not editable by business owners. Changes take effect on the next upload or re-transform; no server restart required.

### Structure and Example

```
/* Tafuta Media Configuration */
{
  // Maximum size of an uploaded source image in megabytes
  max_upload_size_mb: 10,

  // Accepted upload formats
  accepted_formats: [jpg, png, gif, webp],

  /* image_types: each key becomes a subfolder per business.
     sizes: each key is the size-tag used in the output filename.
     Dimensions in pixels (width x height). */
  image_types: {

    logo: {
      label: Business Logo,
      max_images: 1,
      sizes: {
        icon:   { width: 64,   height: 64  },
        small:  { width: 128,  height: 128 },
        medium: { width: 256,  height: 256 },
        large:  { width: 512,  height: 512 }
      }
    },

    banner: {
      label: Banner Image,
      max_images: 3,
      sizes: {
        "300x100":  { width: 300,  height: 100 },
        "600x200":  { width: 600,  height: 200 },
        "1200x400": { width: 1200, height: 400 }
      }
    },

    profile: {
      label: Profile / Hero Image,
      max_images: 5,
      sizes: {
        thumb: { width: 150, height: 150 },
        small: { width: 300, height: 300 },
        large: { width: 800, height: 600 }
      }
    },

    gallery: {
      label: Product / Service Gallery,
      max_images: 50,
      sizes: {
        thumb:  { width: 150, height: 150 },
        medium: { width: 600, height: 450 }
      }
    }
  }
}
```

Size-tag keys (e.g., `icon`, `300x100`, `thumb`) appear in output filenames and must be URL-safe.

---

## 3. Directory Structure

```
/var/www/tafuta/media/
├── app-config.jfx
└── {business_tag}/                         e.g. daniels-salon
    │
    ├── city-view.jpg                       ← uploaded source files (original format)
    ├── cover-banner.gif
    ├── my-logo.png
    │
    ├── logo/
    │   ├── my-logo.jfx                     ← transform spec
    │   ├── my-logo_icon.webp               ← generated outputs
    │   ├── my-logo_small.webp
    │   ├── my-logo_medium.webp
    │   └── my-logo_large.webp
    │
    ├── banner/
    │   ├── cover-banner.jfx
    │   ├── cover-banner_300x100.webp
    │   ├── cover-banner_600x200.webp
    │   └── cover-banner_1200x400.webp
    │
    ├── profile/
    │   ├── city-view.jfx
    │   ├── city-view_thumb.webp
    │   ├── city-view_small.webp
    │   └── city-view_large.webp
    │
    └── gallery/
        ├── product-1.jfx
        ├── product-1_thumb.webp
        ├── product-1_medium.webp
        ├── product-2.jfx
        └── ...
```

**Rules:**
- Source files live in the **business root folder** in their original format (unchanged).
- Each image type has its own **subfolder** containing: one `.jfx` transform spec per image, and the generated `.webp` output files for each size.
- Output filename format: `{image-name-tag}_{size-tag}.webp`

---

## 4. Image Naming

The user provides a display name when uploading (e.g., `"Daniel's Profile Image"`). The system generates a file-friendly slug:

1. Lowercase the string.
2. Replace spaces and special characters with hyphens.
3. Strip leading/trailing hyphens; collapse consecutive hyphens.
4. Result: `daniels-profile-image`

**Conflict resolution:**
- Check for an existing source file or `.jfx` with the same slug within the same business + type folder.
- If a conflict exists, append `-2`, `-3`, etc.: `daniels-profile-image-2`.
- Warn the user that the name was modified due to a conflict.

**Storage:**
- Display name → stored in the `.jfx` file (`name` field)
- Slug → used as the actual filename on disk and as the image-tag in `content_json`

**MVP note:** A single image cannot be assigned to more than one type. The same source image can be uploaded twice (once per type) — the system appends `-2` to one if slugs would conflict.

---

## 5. Upload Flow

1. User opens the **Photos** section in the config panel and selects an image type (e.g., Banner).
2. System checks the `max_images` limit for that type from `app-config.jfx`. If the limit is reached, upload is blocked: *"You have reached the maximum number of [type] images. Delete one to make room."*
3. User picks a file from their device.
4. Client validates: file format must be in `accepted_formats`; file size must be ≤ `max_upload_size_mb`.
5. User enters a display name for the image.
6. The image loads into the **transform preview** (see §8).
7. User adjusts transform parameters using sliders/controls.
8. User clicks **Upload**.
9. Frontend sends a `multipart/form-data` POST containing:
   - `file` — the original source file (not modified by the browser)
   - `image_type` — e.g., `banner`
   - `image_name` — display name
   - `transform` — JSON object with all parameter values
10. Backend processes the upload (see §9).

---

## 6. Transform Spec File (`.jfx`)

For each uploaded image the backend writes a `.jfx` file in the image-type subfolder. This file is the single source of truth for how the source image is transformed into its WebP outputs.

**Filename:** `{slug}.jfx` — same base name as the source file.

**Example** (`/profile/city-view.jfx`):

```
/* Transform spec — city-view, profile type */
{
  name: "City View",            // display name (user-provided)
  source: city-view.jpg,        // source filename in business root folder
  type: profile,
  uploaded_by: "a1b2c3d4-...",
  uploaded_at: "2026-03-01T10:00:00Z",

  transform: {
    zoom:             1.2,      // 1.0 = no zoom
    offset_x:          0,       // pixels, applied after zoom
    offset_y:         -15,
    rotation:           0,      // degrees, clockwise
    flip_horizontal: false,
    flip_vertical:   false,
    brightness:        0.0,     // -1.0 to +1.0
    contrast:          0.0,     // -1.0 to +1.0
    saturation:        0.0      // -1.0 to +1.0
  }
}
```

---

## 7. Transform Parameters

| Parameter | Type | Default | Range / Notes |
|-----------|------|---------|---------------|
| `zoom` | float | 1.0 | Scale factor. 1.0 = no zoom; 2.0 = 2× zoom in. Must be ≥ 1.0. |
| `offset_x` | int | 0 | Horizontal pan in pixels, applied after zoom. Positive = right. |
| `offset_y` | int | 0 | Vertical pan in pixels, applied after zoom. Positive = down. |
| `rotation` | float | 0 | Degrees clockwise. Range: −180 to +180. |
| `flip_horizontal` | bool | false | Mirror left–right. |
| `flip_vertical` | bool | false | Mirror top–bottom. |
| `brightness` | float | 0.0 | Range: −1.0 (black) to +1.0 (white). 0.0 = no change. |
| `contrast` | float | 0.0 | Range: −1.0 to +1.0. 0.0 = no change. |
| `saturation` | float | 0.0 | Range: −1.0 (grayscale) to +1.0 (vivid). 0.0 = no change. |

---

## 8. Frontend Transform Preview (Canvas API)

The upload UI provides a live crop/transform preview before the image is submitted. This uses the **browser's native Canvas 2D API** — no client-side image library. The Canvas API is built into every modern browser, adds zero bytes to the JavaScript bundle, and handles all required transforms natively. A client-side image library would add ~1 MB to the bundle, which is unacceptable for a 3G-optimised PWA.

### Preview Canvas

- Displayed at the **same aspect ratio** as the target output for the selected image type.
- For types with multiple sizes (e.g., banner: 300×100, 600×200, 1200×400 — all 3:1 ratio), any size can drive the preview.
- All parameter changes update the canvas in real time.

### Canvas Transform Order

```
1. Save context
2. Apply brightness/contrast/saturation via ctx.filter:
   ctx.filter = `brightness(${1 + brightness})
                 contrast(${1 + contrast})
                 saturate(${1 + saturation})`
3. Translate to canvas center
4. Rotate (degrees → radians)
5. Scale for flip_horizontal / flip_vertical (negate axis)
6. Scale for zoom
7. Translate by (offset_x, offset_y)
8. Draw image centered
9. Restore context
```

### Controls

| Parameter | Control |
|-----------|---------|
| zoom | Slider (1.0 – 5.0) |
| offset_x, offset_y | Sliders (or drag on canvas as a future enhancement) |
| rotation | Slider (−180 to +180) |
| flip_horizontal | Toggle button |
| flip_vertical | Toggle button |
| brightness | Slider (−1.0 to +1.0) |
| contrast | Slider (−1.0 to +1.0) |
| saturation | Slider (−1.0 to +1.0) |

A **Reset** button restores all parameters to their defaults.

---

## 9. Backend Processing (sharp)

The backend uses **sharp** to produce WebP output files from the source image and transform parameters.

> **Implementation note:** The PRD originally specified JIMP for backend processing. During implementation it was discovered that JIMP v1 has no WebP output support (`@jimp/js-webp` does not exist on npm). **sharp** was substituted — it has native WebP support, prebuilt binaries for Linux and Windows, and processes images faster than JIMP.

**Dependency:** `sharp` (npm).

### Processing Steps

1. Receive `multipart/form-data`: `file`, `image_type`, `image_name`, `transform`.
2. Validate file type (check magic bytes, not just extension) and file size.
3. Validate `image_type` exists in `app-config.jfx`.
4. Count existing images of this type; reject if at `max_images` limit.
5. Generate slug from `image_name`; resolve conflicts.
6. Save source file to `/{business_folder}/{slug}.{ext}` (original format, no conversion).
7. Write transform spec to `/{business_folder}/{image_type}/{slug}.jfx`.
8. For each size defined in `app-config.jfx` for this `image_type`:
   - Load source with sharp.
   - Apply transform parameters in the order below.
   - Resize/crop to target `{ width, height }`.
   - Save as `/{business_folder}/{image_type}/{slug}_{size-tag}.webp`.

### sharp Transform Order

```
1. modulate({ brightness: 1 + brightness, saturation: 1 + saturation })
2. linear(1 + contrast, 128 * (1 - (1 + contrast)))   // contrast with fixed midpoint
3. rotate(rotation)
4. flop() if flip_horizontal; flip() if flip_vertical
5. Zoom + offset crop:
   - resize(targetW * zoom, targetH * zoom, { fit: 'cover' })
   - extract({ left: centreX + offset_x, top: centreY + offset_y, width, height })
6. webp({ quality: 85 }).toBuffer()
```

---

## 10. Editing an Existing Image

### Updating Transform Parameters Only (No New Upload)

1. User adjusts parameters in the preview and submits.
2. Backend deletes all existing `.webp` output files for that image + type.
3. Rewrites the `.jfx` with the new parameters (preserving `name`, `source`, `uploaded_by`, `uploaded_at`).
4. Re-runs sharp to regenerate all size outputs.

The source file is not touched.

### Replacing the Source File

1. Old source file, `.jfx`, and all `.webp` outputs are deleted.
2. New source file is saved.
3. Transform parameters reset to defaults.
4. New WebP outputs are generated with default transform.

---

## 11. Image URLs

Images are served directly by Caddy — the Node.js backend is not in the read path.

**Caddy block:**
```
handle /media/* {
    root * /var/www/tafuta/media
    file_server
}
```

**URL format:**
```
https://tafuta.ke/media/{business_tag}/{type}/{slug}_{size-tag}.webp
```

**Examples:**
```
https://tafuta.ke/media/daniels-salon_550e8400-.../logo/my-logo_medium.webp
https://tafuta.ke/media/daniels-salon_550e8400-.../banner/cover-banner_600x200.webp
https://tafuta.ke/media/daniels-salon_550e8400-.../profile/city-view_large.webp
https://tafuta.ke/media/daniels-salon_550e8400-.../gallery/product-1_thumb.webp
```

---

## 12. Referencing Images in `content_json`

`content_json` stores only the **image name-tag** (slug), not the full URL or path. The system constructs the full URL at render time from: business `business_tag`, the render context (image type), and the required size for that context.

**In `content_json`:**
```json
{
  "media": {
    "logo": "my-logo",
    "hero": "city-view",
    "banner": ["cover-banner", "summer-promo"],
    "gallery": ["product-1", "product-2", "product-3"]
  }
}
```

**URL resolution at render time:**
```
"city-view"  +  type "profile"  +  size "large"
  →  /media/daniels-salon/profile/city-view_large.webp
```

Because `content_json` stores only name-tags, renaming a `business_tag` (and its folder) does not require updating `content_json`.

---

## 13. Access Control

| Role | Upload | Edit Transform | Delete |
|------|--------|----------------|--------|
| Owner | Yes | Yes | Yes |
| Admin (business) | Yes | Yes | Yes |
| Employee | Yes | Yes | No |
| Tafuta Admin | Yes | Yes | Yes |

---

## 14. Deletion

### Deleting an Image

1. Delete the `.jfx` file and all corresponding `.webp` outputs in the type subfolder.
2. Delete the source file from the business root folder.
3. Remove the image name-tag from `content_json.media` if present.

Employees cannot delete images.

### Business Deletion (Soft Delete)

Following the platform-wide soft-delete policy, the media folder is **retained on disk** when a business is deleted. Images are no longer surfaced in the application (gated by business status). Post-MVP: archive media when a business record is permanently purged.

---

## 15. Database Changes

New column in the `businesses` table:

```sql
business_tag  VARCHAR(64)  UNIQUE  NOT NULL
```

- Set at business creation (owner chooses; system suggests one from `business_name`).
- Updatable by owner or Tafuta admin; triggers a media folder rename (see §1).
- Pattern enforced at application level: `^[a-z0-9-]+$`.
- Indexed for fast lookup.

---

## 16. New Backend Dependencies

| Package | Purpose |
|---------|---------|
| `sharp` | Server-side image transformation and WebP output (replaces JIMP — see §9) |
| `flex-json` | Read/write `.jfx` transform spec and config files |
| `multer` | Multipart/form-data file upload handling |

---

## 17. Public Display: Click-to-Enlarge

On the public business detail page, the logo thumbnail is clickable. Clicking it opens an overlay showing the same logo rendered at the largest configured size (`large`, 512×512 — see §2) rather than the `medium` (256×256) size used for the inline thumbnail.

**Important:** the enlarged view is always a *rendered* WebP output — it goes through the same sharp pipeline and the same stored transform spec (§6) as every other size. It is never the raw uploaded source file. This keeps the enlarged image visually consistent with the thumbnail (same crop, zoom, brightness, etc.), just at higher resolution.

**Fallback:** if a business's `large` output does not yet exist on disk (e.g., it was uploaded before the `large` size tier was added to `app-config.jfx` and hasn't been backfilled — see §18), the overlay falls back to the `medium` size via an `onerror` handler on the `<img>`, so the feature degrades gracefully instead of showing a broken image.

This same click-to-enlarge pattern (thumbnail → largest configured size, rendered not raw) is the intended approach for other image types (banner, profile, gallery) as they get similar treatment.

---

## 18. Bulk Reprocessing (Regenerate Photo Sizes)

When a size is added or changed for an image type in `app-config.jfx` (as happened when `large` was added to `logo` — see §2), only *new* uploads and *edited* images automatically get the new size, because size generation only runs on upload and on transform-update (§9, §10). Existing images need to be backfilled.

A shared backend function, `regeneratePhotoSizes()`, re-renders WebP outputs for already-uploaded photos from each image's original source file + its stored `.jfx` transform spec — identical in principle to §10 ("Updating Transform Parameters Only"), but run in bulk across some or all businesses instead of one image at a time. It is exposed two ways:

### CLI script

```
npm run regenerate-photo-sizes
npm run regenerate-photo-sizes -- --tag=<business_tag>
npm run regenerate-photo-sizes -- --type=<image_type>
npm run regenerate-photo-sizes -- --force
```

- `--tag` limits the run to one business; `--type` limits it to one image type (e.g. `logo`).
- By default, a size is only generated if it's missing on disk (fast, idempotent re-run after a partial failure). `--force` regenerates every size even if it already exists.

### Admin panel action

Tafuta Admin → **System Config** → **Maintenance** → **Regenerate Photo Sizes**, gated to `super_admin` (`POST /api/admin/system/regenerate-photo-sizes`). Runs the same function across the full catalog, logs an audit trail entry (`regenerated_photo_sizes`), and returns a summary (`generated`, `skipped`, `failed`, plus per-image error messages) that the admin UI displays once the run completes.

### Response shape

```json
{
  "generated": 42,
  "skipped": 118,
  "failed": 0,
  "errors": []
}
```

**Future consideration:** this action currently runs synchronously within the HTTP request — the admin's browser waits for the entire catalog to finish processing, matching how a single upload is already processed synchronously with sharp. This is fine at current catalog size, but as the number of businesses/photos grows, a full-catalog run risks hitting an HTTP or reverse-proxy request timeout. If that becomes a problem, this should move to an async background job (e.g., queued and processed off the request thread, with the admin UI polling a job-status endpoint) rather than blocking the request.

---

## 19. MVP Scope

**In scope for MVP:**
- Full upload, transform preview, and WebP generation pipeline
- All nine transform parameters
- All four image types: logo, banner, profile, gallery
- `business_tag` field and media folder naming
- Caddy-served media at `/media/...`
- Per-image `.jfx` transform specs
- Click-to-enlarge on the public business detail page (logo; §17)
- Bulk reprocessing when `app-config.jfx` sizes change, via CLI script and admin panel action (§18)

**Out of scope for MVP:**
- Drag-to-pan directly on the preview canvas (sliders only for MVP)
- Async/background bulk reprocessing — current implementation runs synchronously in the request (see the future-consideration note in §18)
- CDN offloading of media files (VPS filesystem only in MVP)
- Video uploads

---

**End of PRD-07**
