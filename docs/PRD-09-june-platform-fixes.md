# PRD-09: June Platform Fixes — Payments, Images, and Business Directions

**Product Requirements Document**  
**Version:** 1.0  
**Last Updated:** June 2026  
**Status:** Implemented / QA Follow-up  

---

## 1. Overview

During June, work focused on stabilising and improving three important areas of the Tafuta platform:

1. Payment issue investigation and fixes
2. Business image upload, edit, display, and cache handling
3. Adding a "How to find us" section to business profiles

These changes support the core Tafuta goal of helping Kenyan businesses maintain accurate, useful listings and ensuring that profile updates are visible to customers quickly and reliably.

---

## 2. Goals

### 2.1 Payment Stability

- Review the payment flow and identify issues affecting payment behaviour.
- Verify frontend/backend integration points around payment initiation, callbacks, receipts, subscriptions, and transaction display.
- Ensure production deployment does not introduce payment-related regressions.

### 2.2 Business Image Reliability

- Allow business owners and Tafuta staff to upload and edit business images successfully.
- Ensure uploaded and transformed images are visible in local development and production.
- Prevent backend image processing failures for small or unusual source images.
- Reduce browser/cache issues where edited images are regenerated but the browser continues showing an old image.

### 2.3 Business Directions / "How to find us"

- Add a business-editable text field that explains how customers can find the business.
- Display the text on the public business detail page when provided.
- Store the text in existing JSON business content without requiring a database migration.

---

## 3. Non-goals

The following were not part of this June scope:

- Full redesign of payment flows or payment provider replacement.
- Full rebuild of the image manager UI.
- CDN-level cache purge automation.
- Database schema changes for image versioning.
- Multi-language UI expansion for the "How to find us" field beyond the existing `profile.en` structure.
- New public map/directions integration such as Google Maps or OpenStreetMap routing.

---

## 4. Scope of Work Completed

### 4.1 Payment Issue Investigation

The payment-related work focused on inspection and stabilisation rather than large feature changes.

Areas reviewed:

- Payment API integration points.
- Payment routing and frontend API wrappers.
- Deployment/runtime considerations that could affect payment behaviour.
- Production safety concerns around deployments, migrations, and backups.

Relevant backend/frontend areas:

- `backend/src/routes/payments.js`
- `backend/src/services/pesapal.js`
- `backend/src/services/receipt.js`
- `frontend/src/lib/api.js`
- Payment-related pages under `frontend/src/pages/dashboard/`

### 4.2 Business Image Fixes

The image work addressed several implementation and runtime issues discovered during upload/edit testing.

#### 4.2.1 Cache-busting after image edits

Problem:

- After a photo was edited or regenerated, the WebP filename often stayed the same.
- Browsers, service workers, or intermediate caches could continue showing the old image.

Implemented approach:

- Append a query-string version token to media URLs:

```txt
/media/{business_tag}/{image_type}/{slug}_{size}.webp?v={content_version}
```

- The implementation uses the business `content_version` as the version token.
- This avoids a schema migration and provides per-business cache invalidation.

Frontend areas updated:

- `frontend/src/pages/public/BusinessDetailPage.jsx`
- `frontend/src/pages/public/HomePage.jsx`
- `frontend/src/pages/public/SearchPage.jsx`
- `frontend/src/components/ImageManager.jsx`

Notes:

- This does not change the actual media file path on disk.
- The query parameter is only used to force browsers/caches to request a new URL.
- Production cache layers must respect query strings as part of the cache key.

#### 4.2.2 Local development media serving

Problem:

- Uploaded images were generated under the backend media folder but were not visible in the browser during local development.
- The frontend requested `/media/...`, but the local dev setup did not serve those files.

Implemented approach:

- Backend serves `/media/*` statically in development only.
- Vite dev server proxies `/media/*` to the backend.

Files updated:

- `backend/src/server.js`
- `frontend/vite.config.js`

Development behaviour:

```txt
Browser -> http://localhost:5173/media/... -> Vite proxy -> http://localhost:3000/media/... -> backend/media
```

Production behaviour remains unchanged:

```txt
Browser -> https://tafuta.ke/media/... -> Caddy -> /var/www/tafuta/media
```

#### 4.2.3 Image processing crop error fix

Problem:

- Some uploads caused sharp to throw:

```txt
extract_area: bad extract area
```

Cause:

- The image processing pipeline attempted to extract/crop an output area larger than the intermediate resized image.
- This was most likely with small source images or certain transform settings.

Implemented fix:

- Ensure the intermediate resized image dimensions are at least as large as the target extraction size before calling `sharp.extract()`.
- If the source image would otherwise be too small, the backend upscales the intermediate image.

File updated:

- `backend/src/services/media.js`

Trade-off:

- Very small source images may appear less sharp after upscaling.
- This is preferred over failing the upload with a 500 error.
- A future enhancement could reject very small images or pad them instead of upscaling.

#### 4.2.4 Production media path validation

Production media expectations:

- Production media path should remain:

```txt
/var/www/tafuta/media
```

- `app-config.jfx` must exist at:

```txt
/var/www/tafuta/media/app-config.jfx
```

- If `app-config.jfx` is missing, photo configuration and upload endpoints fail.

Deployment note:

- `deploy.sh` intentionally excludes the `media/` directory from rsync to avoid wiping uploaded files.
- The deployment script should ensure `app-config.jfx` is copied into the production media directory when updated.

---

## 5. "How to find us" Feature

### 5.1 Problem

Business listings may not provide enough practical location guidance. A customer may know the region or street but still struggle to locate the shop, stall, office, school, church, hotel, or service provider.

Examples of useful guidance:

- Nearby landmarks
- Gate or entrance instructions
- Floor or building details
- Bus stop or matatu stage references
- Colour/signage descriptions
- Directions from a known road or market

### 5.2 Requirement

Business owners and Tafuta staff should be able to enter a free-text "How to find us" description when editing a business profile.

### 5.3 Data Model

No database migration is required.

The field is stored inside `content_json`:

```txt
content_json.profile.en.how_to_find
```

Example:

```json
{
  "profile": {
    "en": {
      "business_name": "Grace Pharmacy",
      "description": "Licensed pharmacy stocking prescription and OTC medicines.",
      "how_to_find": "We are next to the main bus stage, opposite the blue supermarket. Enter through the side gate."
    }
  }
}
```

### 5.4 Frontend Changes

Business editor:

- Add a textarea field labelled "How to find us".
- Save the value as part of `content_json.profile.en`.
- Provide helper text encouraging useful landmarks and directions.

Public business detail page:

- Display a "How to find us" section only when the field has content.
- Preserve line breaks for readability.

Files updated:

- `frontend/src/pages/dashboard/BusinessEditor.jsx`
- `frontend/src/pages/public/BusinessDetailPage.jsx`

---

## 6. Admin Role Compatibility Fix

During testing, an admin user payload returned this shape:

```json
{
  "role": "admin"
}
```

The Tafuta frontend expected:

```json
{
  "is_admin": true,
  "admin_role": "admin"
}
```

This caused the user to appear as a normal non-admin account in the frontend even though their backend payload included an admin role.

Implemented fix:

- Normalise the user object in the frontend auth store.
- If the backend returns `role: "admin"` or `role: "super_admin"`, the frontend maps it to:
  - `is_admin: true`
  - `admin_role: role`

File updated:

- `frontend/src/store/useAuthStore.js`

Long-term recommendation:

- Backend responses should consistently return canonical admin fields:
  - `is_admin`
  - `admin_role`

---

## 7. Deployment and Workflow Notes

### 7.1 GitHub Actions Deployment

The production deployment workflow is defined in:

- `.github/workflows/deploy.yml`

The workflow:

1. Runs on pushes to `main` or manual dispatch.
2. SSHs into the production server.
3. Pulls the latest `main` branch.
4. Runs `./deploy.sh` on the server.

### 7.2 Deployment Script Behaviour

The production deployment script is:

- `deploy.sh`

Important behaviours:

- The script uses `rsync --delete` to sync code from the workspace to `/var/www/tafuta`.
- It explicitly excludes sensitive/runtime folders and files, including:
  - `backend/.env`
  - `frontend/.env`
  - `media`
  - `backup`
  - `uploads`
  - `node_modules`
- This means uploaded media should not be wiped by normal deployment.
- The script creates the production media directory if missing.
- The script copies `backend/media/app-config.jfx` into the production media directory when missing or outdated.

Production media directory:

```txt
/var/www/tafuta/media
```

Production app config:

```txt
/var/www/tafuta/media/app-config.jfx
```

### 7.3 Production Cache Considerations

Image updates may still appear delayed on production if a cache layer serves an old file.

Possible cache layers:

- Browser cache
- PWA service worker cache
- Caddy/static file cache headers
- CDN or reverse proxy in front of Tafuta

Expected mitigation:

- Front
end image URLs include `?v={content_version}`.
- Production cache configuration should respect query strings as part of the cache key.
- If users still see stale images, perform a hard refresh or clear service worker/cache during testing.

---

## 8. QA Checklist

### 8.1 Payment QA

- [ ] Confirm payment initiation endpoint responds successfully.
- [ ] Confirm successful payment callback updates transaction status.
- [ ] Confirm subscription records reflect completed payments.
- [ ] Confirm receipt download works for completed transactions.
- [ ] Confirm admin/payment history pages display expected records.
- [ ] Confirm deployment does not change production `DATABASE_URL` or payment environment variables.

### 8.2 Business Image QA

- [ ] Confirm `/api/photos/config` returns image type configuration.
- [ ] Confirm production media path contains `app-config.jfx`.
- [ ] Upload a logo image and confirm WebP outputs are generated.
- [ ] Upload a banner image and confirm all configured sizes are generated.
- [ ] Upload a small image and confirm no `extract_area: bad extract area` error occurs.
- [ ] Edit an image transform and confirm generated WebP files update on disk.
- [ ] Confirm public image URLs include a cache-busting query string.
- [ ] Confirm the browser displays the updated image after version change.
- [ ] Confirm `/media/*` URLs work locally through Vite/backend dev proxy.
- [ ] Confirm `/media/*` URLs work on production through Caddy.

### 8.3 "
How to find us" QA

- [ ] Add "How to find us"
 text in the business editor.
- [ ] Save the business profile successfully.
- [ ] Confirm `content_json.profile.en.how_to_find` is present in API response.
- [ ] Confirm the public business page displays the section.
- [ ] Confirm the section is hidden when the field is empty.
- [ ] Confirm line breaks are preserved on the public page.

### 8.4 Admin Compatibility QA

- [ ] Login as an admin user whose payload contains `role: "admin"`.
- [ ] Confirm frontend normalises the account to admin.
- [ ] Confirm admin navigation/actions are visible.
- [ ] Confirm protected admin routes are accessible.

---

## 9. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Browser or CDN cache ignores updated image content | Users see stale photos | Use `?v={content_version}` and ensure cache layer respects query strings |
| Missing production `app-config.jfx` | Photo endpoints return 500 | Deploy script copies config; ops should verify file exists |
| Very small uploaded images become blurry | Lower visual quality | Accept for MVP; future enhancement can reject small images or pad instead |
| Backend and frontend disagree on admin user shape | Admin UI hidden | Frontend normalises user role payload; backend should standardise long-term |
| Media path mismatch between backend and Caddy | Uploaded files exist but are not served | Keep backend `MEDIA_PATH` and Caddy `/media` root aligned |

---

## 10. Future Improvements

### 10.1 Payments

- Add deeper automated tests for payment callbacks and subscription updates.
- Add clearer admin visibility into failed or pending transactions.
- Add reconciliation tooling for PesaPal transactions.

### 10.2 Images

- Add `version` or `business_content_version` to `GET /api/businesses/:id/photos` response.
- Add server-side validation for minimum source image dimensions.
- Consider padding instead of upscaling tiny images.
- Add a production startup check for `app-config.jfx`.
- Add automated media health check endpoint.
- Add admin-visible warnings for missing or invalid image outputs.

### 10.3 "How to find us"

- Add multilingual support for the field.
- Add optional map pin / GPS location.
- Add preview in the editor showing how the text will appear publicly.
- Add suggested examples per business category.

---

## 11. June Timesheet Summary

The June work can be summarised as 4 hours per week across the month.

| Week | Hours | Focus | Summary |
|---|---:|---|---|
| Week 1 | 4 hrs | Payments | Investigated payment flow, API integration, deployment/runtime concerns, and payment-related stability issues. |
| Week 2 | 4 hrs | Business images | Investigated image edit/update behaviour, browser cache issue, media URLs, and cache-busting approach. |
| Week 3 | 4 hrs | Business images | Implemented image URL versioning, dev media serving/proxy, and backend sharp crop error fix. |
| Week 4 | 4 hrs | Business directions | Added "How to find us" editor field and public display, plus documentation and QA planning. |

**Total June time:** 16 hours

---

## 12. Acceptance Criteria

This work is considered complete when:

- Business images can be uploaded and displayed locally and in production.
- Edited/regenerated images are fetched by browsers using a versioned URL.
- Small image uploads do not crash the backend image pipeline.
- Business editors can save a "How to find us" description.
- Public business pages display the "How to find us" text when available.
- Admin users with `role: "admin"` are recognised correctly by the frontend.
- Payment-related investigation findings are captured and payment flows remain operational after deployment.

---

## 13. Related Files

### Frontend

- `frontend/src/pages/dashboard/BusinessEditor.jsx`
- `frontend/src/pages/public/BusinessDetailPage.jsx`
- `frontend/src/pages/public/HomePage.jsx`
- `frontend/src/pages/public/SearchPage.jsx`
- `frontend/src/components/ImageManager.jsx`
- `frontend/src/store/useAuthStore.js`
- `frontend/vite.config.js`

### Backend

- `backend/src/server.js`
- `backend/src/services/media.js`
- `backend/src/routes/photos.js`
- `backend/src/routes/payments.js`
- `backend/src/services/pesapal.js`
- `backend/src/services/receipt.js`

### Deployment / Docs

- `.github/workflows/deploy.yml`
- `deploy.sh`
- `docs/PRD-07-photos.md`
- `IMAGE_AND_FINDUS_PLAN.md`