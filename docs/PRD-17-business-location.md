# PRD-17: Business Location by Coordinates

**Product Requirements Document**
**Version:** 1.0
**Last Updated:** October 2026
**Status:** Implemented — builds clean; awaiting manual verification on a phone and live Kenya coordinates

---

## 1. Overview

Today a business's location is freeform text (street address, town, region) that the owner types in. The Vibrant website template builds a Google Maps embed from that text, and the embed does not resolve correctly for Kenyan addresses. This PRD replaces the address-based map with a map driven by **GPS coordinates** (longitude and latitude) that the owner enters, or captures from their phone, and adds a **hide** switch so the owner or admin can turn the map off.

Coordinates are the only thing sent to Google. Addresses and descriptions are never passed to Google Maps.

Related: [PRD-15](PRD-15-business-website-templates.md) (templates; its §6 "no lat/lng capture" decision is superseded by this PRD).

## 2. Problem Statement

- Address text does not geocode reliably in Kenya. Informal street names, estate names and town-only entries often resolve to the wrong place or to nothing, so the Vibrant map shows the wrong area.
- Only Vibrant shows a map. Classic, Bold and Minimal link out to Google Maps from the typed address, with the same accuracy problem.
- The tafuta.ke business detail page has no way to point a visitor at the business's location.

## 3. Goals

- Owners and admins can record a business's exact location as longitude and latitude.
- Owners can capture the location from their phone's current GPS position instead of typing it.
- Owners and admins can hide the location from the public with one checkbox.
- Every website template shows a Google map of the coordinates when a location is set and not hidden.
- The business detail page on tafuta.ke links to the business on Google Maps by coordinates when a location is set and not hidden.

## 4. Requirements

### 4.1 Location tab — data entry (owner and admin)

The existing **Location** tab in `frontend/src/pages/dashboard/BusinessEditor.jsx` (shared by `/dashboard/` and `/admin/`) gains a new section:

- **Longitude** and **Latitude** numeric inputs, both optional.
  - Latitude must be between -90 and 90. Longitude must be between -180 and 180.
  - Entry may be typed by hand, with a helper note showing the expected format (decimal degrees, e.g. Machakos ≈ -1.52, 37.26).
  - Reject out-of-range or non-numeric values inline; do not save them.
- **"Use my current location"** button. Calls `navigator.geolocation.getCurrentPosition` and fills both fields from the phone's GPS fix.
  - Shows a clear message if the user denies permission, the fix times out, or the browser does not support geolocation.
  - Fills the fields only; the owner still presses Save. The captured values can be edited afterwards.
- Both coordinates must be filled for a map to show. Entering only one is allowed to save, but it is treated as "no location" for display (see §4.4).
- **"Hide location on website"** checkbox, default unchecked (false).
  - Stored as `hide_map`; a missing value is treated as false.
  - Admin and owner see and can change it.

### 4.2 Data model

All stored in `businesses.content_json.location` (no schema migration, consistent with [PRD-15 §4.2](PRD-15-business-website-templates.md)):

| Field | Type | Notes |
|---|---|---|
| `location.latitude` | number \| unset | Decimal degrees, -90 to 90 |
| `location.longitude` | number \| unset | Decimal degrees, -180 to 180 |
| `location.hide_map` | boolean \| unset | `true` hides the map and the listing-card link. Unset = false. |

Existing `street_address`, `city`, `region`, `postal_code` are unchanged and keep their current display role (text shown on the page). They no longer drive any map.

Validation happens in the frontend and again on the backend `PUT /api/businesses/:id` path (`backend/src/routes/businesses.js`), so bad coordinates cannot be saved through the API either.

### 4.3 Website templates — Google map

All four templates (`frontend/src/pages/public/templates/`) show a map under the location block when **both** coordinates are set **and** `hide_map` is not true.

- Embed: `https://maps.google.com/maps?q={latitude},{longitude}&output=embed` in an iframe, the same embed mechanism Vibrant uses today.
- "Open in Google Maps" link: `https://maps.google.com/?q={latitude},{longitude}`.
- Only the coordinates go into the URL. No street address, town or business name.
- **Vibrant:** replace the `mapQuery` (address-based) logic in `SiteVibrant.jsx` (around lines 106 and 287–307) with the coordinate logic above.
- **Classic, Bold, Minimal:** add the iframe. Today they only have a text link built from the address (`SiteClassic.jsx` ~line 335, `SiteBold.jsx` ~line 291). That address-based link is removed. The "Open in Google Maps" link is shown only when coordinates are set and `hide_map` is not true, and it uses coordinates.
- If either coordinate is missing or `hide_map` is true, no iframe and no Google Maps link are rendered. No address or text is ever sent to Google.

### 4.4 Listing card on tafuta.ke

Listing cards do **not** show a map image. **Scope:** the business **detail page** only (`frontend/src/pages/public/BusinessDetailPage.jsx`). The search-results and category list cards (`HomePage.jsx`, `CategoryPage.jsx`, `SearchPage.jsx`) do **not** get this link.

When `hide_map` is not true and both coordinates are set, the detail page shows a text link:

> **View location on google maps** → `https://maps.google.com/?q={latitude},{longitude}`

- Opens in a new tab.
- Uses only coordinates in the URL.
- Hidden when `hide_map` is true or coordinates are missing.
- The detail page's data source must return `latitude` and `longitude` when `hide_map` is not true (see §4.5).

### 4.5 Privacy and public exposure

- `hide_map` is the owner's control over whether the business's coordinates appear publicly. When it is true, the coordinates must not be rendered or linked anywhere on the public site.
- The browser needs the coordinates to build the Google URLs, so the public API responses for the site (`GET /api/site/:tag`) and the detail page include `latitude` and `longitude` only when `hide_map` is not true. When `hide_map` is true, the API **omits** both fields, so they are not exposed even in the page's data.

## 5. Implementation Plan

Build order, each step verifiable on its own:

1. **Backend validation** — range-check `location.latitude` / `longitude` in the business save path (`backend/src/routes/businesses.js`, `PUT` around line 236–380). Return `INVALID_LOCATION` on bad values.
2. **Public API** — in `backend/src/routes/site.js` and the detail page's data endpoint, return `latitude`, `longitude` only when `hide_map` is not true.
3. **Location tab** — in `BusinessEditor.jsx` add the two inputs, the "Use my current location" button (`navigator.geolocation`), and the hide checkbox. Add the three fields to `formData`, the load mapping (~line 211), and `buildContentJson` (~line 450).
4. **Shared helper** — one small module (e.g. `frontend/src/lib/location.js`) with `hasMapLocation(location)`, `mapEmbedUrl(lat, lng)` and `mapLinkUrl(lat, lng)`, so all four templates and the cards use the same rule.
5. **Templates** — Vibrant first (it is the one with the reported bug), then Classic, Bold, Minimal.
6. **Detail page** — add the "View location on google maps" link to `BusinessDetailPage.jsx`. Search and category cards are not changed.
7. **Docs** — mark PRD-15 §4.3 (Vibrant map) and §6 (geocoding out of scope) as superseded by this PRD.

## 6. Verification

- Save a business with coordinates in Kenya (e.g. Nairobi ≈ -1.286, 36.817). Confirm the map on each of the four templates (`/site/:tag?template=classic|bold|minimal|vibrant`) is centred on that point.
- Enter an out-of-range value (lat 95) — save is refused in the UI and the API returns `INVALID_LOCATION`.
- "Use my current location" on a phone over HTTPS: fills the fields after permission; shows a message when permission is denied.
- Tick "hide": map and detail-page link disappear everywhere; `GET /api/site/:tag` and the detail page's data no longer return the coordinates.
- Search and category result cards show no location link, with or without coordinates.
- Business with no coordinates: no map, no card link, nothing breaks (regression for all existing businesses).
- Confirm the Google URLs contain only `q=lat,lng` (inspect the rendered `src`/`href`).

## 7. Decisions

1. **Google link placement:** only the business detail page gets the "View location on google maps" link. Search and category cards do not.
2. **No address-based Google links:** no Google Maps link or map is built from an address or text description. Only coordinates are sent to Google.
3. **Field name:** `hide_map`. Developer-facing only.
4. **Embed method:** the keyless `maps.google.com/maps?q=lat,lng&output=embed` form, as Vibrant uses today. It is an unofficial embed URL with no published guarantee of continued support (see note below).

**Note on the embed method:** the risk is not a known restriction. The keyless `maps.google.com/maps?...&output=embed` URL is undocumented: Google does not publish it as an API and makes no promise to keep it working. Google could change or block it without notice. The supported option is the Google Maps Embed API, which requires a Google Cloud API key and a referrer restriction on that key. For now the keyless form is used, and we switch if it stops working.

## 8. Out of Scope

- Geocoding (address → coordinates) or reverse geocoding. Owners enter or capture coordinates directly.
- Interactive maps or pins inside tafuta.ke. Maps open only via Google.
- Distance-based or "near me" search. Recorded as a possible follow-up, not built here.
- Verifying that the owner's coordinates are correct.
