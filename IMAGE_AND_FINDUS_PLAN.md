# Plan: Image cache-busting and "How to find us" field

This document outlines the proposed plan for the two requests in the email:

1) Image Update after edit (cache-busting so browsers re-download updated images)
2) Add a "How to find us" field to business listings

We will not implement changes here — this is the plan only. After you review and approve, I can implement the changes in a follow-up.

---

## Summary / decision

- Use the existing `content_version` (an integer stored on the `businesses` row and incremented whenever business content or media references change) as the cache-busting token appended to public media URLs. This avoids adding DB schema changes and keeps versioning per-business.
- For the "How to find us" field, store the text inside `content_json` (JSONB) under the profile section for the relevant language, e.g. `content_json.profile.en.how_to_find` (or `directions`), and expose it in the edit UI and public business page. No DB migration required because `content_json` is JSONB.

Rationale: The codebase already increments `content_version` in the photo upload/primary/delete handlers (and on business content updates). Using it avoids schema changes and fits the existing content/version semantics.

---

## Feature 1 — Image cache-busting (details)

Goal: When a business image is updated (upload, transform update, set primary, delete), ensure browsers re-download the updated image even when the filename stays the same.

Approach:
- Append a query parameter to the image URL that changes when the business's `content_version` changes, e.g. `/media/{business_tag}/logo/1000129233_icon.webp?v=123` where `123` is `content_version`.
- Update frontend image URL generation in the small set of places that compose `/media/...` links.
- Keep long-lived Cache-Control on static files (e.g. 30d) for performance — the query param ensures the new URL is fetched when version changes.

Why query param using `content_version`?
- `content_version` is updated by the backend in the photo endpoints and in business content updates (it is already incremented in the code during uploads and content edits).
- No new DB column or additional backend endpoints required.
- Query string is part of final URL so browser will request the new resource.

Potential caveats:
- Some CDNs / caches may cache by URL but also respect query strings. If any intermediary cache is configured to ignore query strings or to strip them, we must ensure that caching configuration uses the query string as part of the cache key (Caddy default behavior respects query strings for cache (unless custom proxy caching is set) — confirm on production Caddy config).
- If a separate media CDN is used later, we must ensure query-string-based cache-busting is supported.

Implementation steps (frontend only):
1. Identify all places that construct `/media/...` URLs and append the version param using `business.content_version` (fallback to 0 or empty if not available):
   - `frontend/src/pages/public/BusinessDetailPage.jsx` — `mediaBase` and any usages
   - `frontend/src/pages/public/HomePage.jsx` — `BusinessCard` logo URL
   - `frontend/src/pages/public/SearchPage.jsx` — search result logos
   - `frontend/src/components/ImageManager.jsx` — where `imageUrl` is set for editing preview
   - Any other components that compute media urls (search with grep shows the above locations)

2. Replace URLs like:
   `/media/${business.business_tag}/logo/${logoSlug}_icon.webp`
   with:
   `/media/${business.business_tag}/logo/${logoSlug}_icon.webp?v=${business.content_version}`

   - Example places to change (readers' references only — implement later):
     - `tafuta-ke/frontend/src/pages/public/HomePage.jsx` where `logoUrl` is built
     - `tafuta-ke/frontend/src/pages/public/SearchPage.jsx` where `logoUrl` is built
     - `tafuta-ke/frontend/src/pages/public/BusinessDetailPage.jsx` where `mediaBase` is used
     - `tafuta-ke/frontend/src/components/ImageManager.jsx` open-edit preview (`imageUrl`) — when preview in editor, use the version too so the preview updates after regeneration

3. Service worker / PWA considerations:
   - Update the PWA caching strategy (vite-plugin-pwa or service worker code) so image caching is cache-first but keyed by full URL (which includes the `?v=`). Typically this requires no change if the SW caches by request URL.
   - If the SW caches requests by ignoring query params, update SW to include query params when building cache keys.

4. Server / CDN considerations:
   - Confirm production Caddy / any CDN respects query strings as part of cache key. If a caching proxy strips query strings, we must configure it not to.
   - Recommended Caddy header: set `Cache-Control: public, max-age=2592000, immutable` for media files to allow long caching.
   - No backend code changes required for cache-busting itself if using `content_version`.

5. Edge cases & testing:
   - Upload a new photo, confirm the backend increments `content_version` (photo upload handler writes to `businesses` and does `content_version = content_version + 1`).
   - Hard refresh business page; confirm the image URL includes updated `?v=` and the browser fetches new file.
   - Confirm image manager preview updates after transform change.
   - Confirm search/home list images show updated version after content change.

Alternate approach (if you prefer separate versioning):
- Add a `media_version` integer column to `businesses` and bump it only when media changes. This separates media changes from other content changes. Example migration (not applied here):

  ALTER TABLE businesses ADD COLUMN media_version INTEGER DEFAULT 1;
  -- bump media_version when uploading / deleting / transforming images

- Pros: More granular invalidation (only media updates bump this counter). Cons: migration + small backend changes to bump the new counter.

---

## Feature 2 — "How to find us" field

Goal: Allow business owners / team members to add free-form directions describing how to find a business (text box) and display it on the public listing.

Data model:
- Store under `content_json.profile.<lang>.how_to_find` or `content_json.profile.<lang>.directions`.
- Example (English): `content_json.profile.en.how_to_find = "Near the large red mall, enter via the side gate..."`

Why store in `content_json`?
- `content_json` already contains multi-language profile content and is returned by the API.
- No schema migration required (JSONB is flexible).

Frontend changes required:
1. Business editor (dashboard): add a textarea input under the profile tab for the chosen language. Save into `content_json.profile.en.how_to_find` when the business form is saved. Show character count and a reasonable limit (e.g., 1000 chars).
   - File: `frontend/src/pages/dashboard/BusinessEditor.jsx` (profile tab UI)

2. Display on public business page: render the field under contact/location section if present. Optionally include small icon and label "How to find us".
   - File: `frontend/src/pages/public/BusinessDetailPage.jsx`

3. Admin UI: expose the field in admin business edit / approval flows if desired.

Backend changes required:
- None required strictly. `PATCH /api/businesses/:id` already validates and writes `content_json`. The backend will increment `content_version` when content_json changes (so this will also help cache-bust images indirectly).
- Add validation if you want server-side length limit enforcement (optional). This can be a small change in `backend/src/routes/businesses.js` where `content_json` is accepted.

UX considerations:
- Provide a small help text hinting at useful directions (landmarks, gates, colors, public transport info).
- Provide multi-language editing UI (existing pattern for content_json seems to be `profile.en` etc.).

---

## Tests / QA checklist

For cache-busting:
- [ ] Upload a new image for a business, confirm `content_version` increments in DB.
- [ ] Visit the business public page and confirm image URLs contain `?v={content_version}`.
- [ ] Verify browser fetches updated image URL (network tab shows 200 from server and not 304 from cache unless file unchanged).
- [ ] Test transform update (regenerate WebP) and confirm `?v` changed and new image shown.
- [ ] Test search/home logos reflect new `?v` after change.
- [ ] Confirm PWA service worker cache still returns the latest image when v param matches cached key; ensure SW doesn't ignore query params.

For "How to find us":
- [ ] Add text in business editor, save, confirm API `PATCH` and DB `content_json` now includes the field and `content_version` increments.
- [ ] Public business page shows the new text for unauthenticated and authenticated users.
- [ ] Admin/owner can edit and clear the field.

---

## Rollout plan

1. Implement frontend changes to append `?v=${business.content_version}` to media URLs and add the "how to find us" UI in the BusinessEditor and BusinessDetailPage.
2. Smoke test locally (frontend + backend dev) to confirm URLs and content are present.
3. Confirm production Caddy/CDN cache config doesn't ignore query strings. If needed, update Caddy / CDN to include query string in cache key.
4. Deploy to staging and perform QA with a test business (photo upload, transform, set primary, delete).
5. Deploy to production.

Note: Because the chosen approach relies on `content_version`, there is no backend schema migration required. If you want independent media-only invalidation, follow the alternate approach and add `media_version` column plus small backend changes to bump it in photo endpoints.

---

## Files to edit (implementation step - for later)

- Frontend
  - `frontend/src/pages/public/BusinessDetailPage.jsx` — append `?v=${business.content_version}` when composing media asset URLs, render "How to find us".
  - `frontend/src/pages/public/HomePage.jsx` — include version in logo URL construction for BusinessCard.
  - `frontend/src/pages/public/SearchPage.jsx` — include version in results list logo URL.
  - `frontend/src/pages/dashboard/BusinessEditor.jsx` — add textarea for `content_json.profile.en.how_to_find` and save as part of the content_json payload.
  - `frontend/src/components/ImageManager.jsx` — when previewing edited/regenerated images, include version so preview updates.
  - (Optional) Service worker config / vite-plugin-pwa settings to ensure caching is keyed by full URL including query string.

- Backend (optional)
  - `backend/src/routes/businesses.js` — optional server-side validation for `how_to_find` length
  - `backend/src/routes/photos.js` — if you choose to use `media_version` instead of `content_version`, update the photo endpoints to bump `media_version`.
  - (Optional) DB migration file for `media_version` if using the alternate approach.

---

## Example code snippets (implementation reference only)

How a media URL would change on the frontend (example replacement):

- Current (example):
  `/media/${business.business_tag}/logo/${logoSlug}_icon.webp`

- Proposed (appending version):
  `/media/${business.business_tag}/logo/${logoSlug}_icon.webp?v=${business.content_version}`

Files to update: `frontend/src/pages/public/HomePage.jsx`, `frontend/src/pages/public/SearchPage.jsx`, `frontend/src/pages/public/BusinessDetailPage.jsx`, `frontend/src/components/ImageManager.jsx`.

---

If this plan looks good to you, tell me which approach you prefer (use `content_version` — recommended, or add a separate `media_version` column). After you confirm, I will:

- Implement the frontend changes and any small optional backend validations/migrations you approve.
- Add unit/integration checks and a PR with the changes and a testing checklist.

If you want me to change the plan (for example, to use `media_version` or to change cache TTLs on Caddy), let me know and I will update this document accordingly.
