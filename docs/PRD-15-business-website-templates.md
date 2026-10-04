# PRD-15: Business Website Templates & One-Page Site Builder

**Product Requirements Document**
**Version:** 1.2
**Last Updated:** October 2026
**Status:** Implemented — display-only mode active (cart/book suspended, see §4.7)

---

## 1. Overview

Every business with an active `website_hosting` subscription (see [PRD-02](PRD-02-payments.md)) gets a public one-page site at `tafuta.ke/site/:business_tag`. The owner (or an admin, from the same shared form) picks a visual design from a small set of pre-built templates and fills in business content once — the template renders that content automatically. This PRD documents the template system as it actually exists: what designs are available, how content maps into them, how the page is served, and the "Locally Owned Business" badge that's part of every template.

This is a documentation-only PRD — the feature described here is already built and live. It exists to close a gap: no PRD ever specified this system, so it grew organically past what [PRD-04](PRD-04-ui-ux.md) originally sketched.

## 2. Problem Statement

PRD-04's "Website Content Editor" section describes a single generic content form — no design choice, with `[EN] [SW] [KK] [KY]` multi-language tabs. What was actually built diverged from that in two ways: it added a template picker (multiple fixed visual designs, not one generic layout) and it dropped multi-language content entirely (only `profile.en` exists; there's no Swahili/Kikamba/Kikuyu content model). Because no PRD tracked this divergence, the template system — including a WhatsApp-based ordering/booking flow that PRD-04 also never mentioned — existed only as code, discoverable by reading `frontend/src/pages/public/templates/`.

## 3. Goals

- Give an accurate, current record of the template system: the four designs, the rendering pipeline, and the data model behind them.
- Document the "Locally Owned Business" badge as a first-class, per-business flag available in every template.
- Record what was explicitly considered and set aside, so future work doesn't quietly re-litigate the same calls (see §6).
- Point at where the *next* increment of this work is already scoped, without committing to it here (see §5).

## 4. Current Implementation

### 4.1 Stack & rendering pipeline

The public site is **not** pregenerated or server-rendered. `/site/:tag` is a client-side React Router route:

- Route: `frontend/src/App.jsx` → `<Route path="/site/:tag" element={<SitePage />} />`
- Page: `frontend/src/pages/public/SitePage.jsx` fetches `GET /api/site/:tag` on mount, then picks a template component from a lookup map keyed by `business.site_template` and renders it with the fetched data as its `business` prop.
- Backend: `backend/src/routes/site.js` runs a live Postgres query per request (no caching layer), gates access on `content_json.website_enabled` / an active `website_hosting` subscription, and returns JSON — it never renders HTML.

A `?template=<id>` query param on the `/site/:tag` URL overrides which design renders, without persisting anything — this is what powers the "Preview Classic / Bold / Minimal / Vibrant" links in the dashboard.

### 4.2 Data model

Everything lives in the `businesses.content_json` JSONB column (`backend/src/db/migrations/002_create_businesses.sql`) — no dedicated tables or typed schema. Fields relevant to the site builder:

| Field | Type | Notes |
|---|---|---|
| `site_template` | string | `"classic"` \| `"bold"` \| `"minimal"` \| `"vibrant"`, default `"classic"`. Free text, not a DB-constrained enum. |
| `locally_owned` | boolean | Drives the "Locally Owned Business" badge (§4.4). Defaults to unset/false. |
| `website_enabled` | boolean \| unset | Tri-state: explicit `false` always blocks the site; unset falls back to an active `website_hosting` subscription. |
| `profile.en.{tagline,description,how_to_find}` | string | English-only; no other locale exists despite PRD-04's original multi-language mockup. |
| `contact.{phone,email,whatsapp,website}` | string | `website` is a single generic outbound link field — there's no dedicated Facebook/Instagram field. |
| `location.{street_address,city,region,postal_code}` | string | Freeform text entered by the owner; never geocoded or verified (see §6). |
| `hours` | object | Per-day open/close times. |
| `products[]` | array of `{id, name, type, price, description, image_url}` | `type` is `"product"` or `"service"`; both feed the WhatsApp cart/booking flow. |
| `images` / `media_primary` | object | Populated separately by the photo pipeline ([PRD-07](PRD-07-photos.md)), not edited on this form. |

### 4.3 The four templates

All under `frontend/src/pages/public/templates/`, each a self-contained React component taking a `business` prop, with hardcoded (not owner-configurable) colors:

- **Classic** (`SiteClassic.jsx`) — dark full-bleed hero image with overlaid logo/name, sticky contact bar, white body.
- **Bold** (`SiteBold.jsx`) — dark background throughout, large type, orange accent.
- **Minimal** (`SiteMinimal.jsx`) — black-and-white, single column, text-forward, alternating black/white sections.
- **Vibrant** (`SiteVibrant.jsx`) — hot-pink card-stack layout, modeled on a legacy heartofkenya.com site design the business owner supplied as a reference. Adds a live Google Maps `output=embed` iframe built from the freeform address text. *Superseded by [PRD-17](PRD-17-business-location.md):* the map is now built from owner-entered coordinates, and all four templates show it.

A shared module, `_booking.jsx`, gives every template the same WhatsApp-based commerce layer: an in-memory cart (`useCart`), a booking modal for services, and a cart drawer for products. "Checkout" and "booking" both resolve to opening a pre-filled `wa.me` link — there is no payment processing, order storage, or inventory tracking (see §6).

### 4.4 Locally Owned Business badge

A boolean flag, editable by both the business owner and an admin from the same shared **Basic Info** tab (`frontend/src/pages/dashboard/BusinessEditor.jsx` — a single component gated by `isAdminContext`, not two separate forms). When set, every template renders a badge:

- **Vibrant** — a standalone bordered card reading "Locally Owned Business" (matches the reference design's equivalent element).
- **Bold** / **Classic** — a pill alongside the existing category/region pills.
- **Minimal** — a bordered uppercase pill under the tagline.

All four use a `Heart` icon for visual consistency. The flag is exposed publicly via `GET /api/site/:tag` (`locally_owned: c.locally_owned === true`).

### 4.5 Dashboard editing flow — owner vs. admin differentiation

`BusinessEditor.jsx` is a single shared component used by two routes:

- **Owner route** — `/dashboard/businesses/:id/edit`
- **Admin route** — `/admin/businesses/:id/edit`

Both routes render the same JSX, but the component switches behaviour based on `isAdminContext = pathname.startsWith('/admin/')` — a URL check, not a role check. This matters for the website tab:

| Action | Admin (`/admin/`) | Owner (`/dashboard/`) |
|---|---|---|
| Website toggle | Toggle switch — flips `website_enabled` immediately via `PATCH /api/admin/businesses/:id/toggle-website` | Not shown if inactive. If inactive, shows "Activate Website" button that opens a payment modal. |
| Toggle when no subscription | Allowed (admin override) | N/A — owner sees payment modal instead |
| Website already live | Toggle switch visible | Green status badge + site link |

The `PATCH` toggle endpoint updates only `website_enabled` inside `content_json` using `jsonb_set` — it does not touch any other key. The main form save (`businessAPI.update`) preserves `website_enabled` from the current DB value, so saving the form after toggling never overwrites the toggle state.

Saving submits the entire `content_json` in one PUT with `website_enabled` preserved (see §4.6 for why this matters). `site_template` and `locally_owned` are plain top-level keys in that payload.

### 4.6 Website subscription lifecycle

The site is gated by an active `website_hosting` subscription. The full lifecycle:

1. **Owner activates** — on the website tab (`/dashboard/`), an inactive business shows a payment modal with a period selector (weekly / monthly / annual, matching billing types configured in admin → Services). Submitting initiates a PesaPal payment. On successful payment callback, `processCompletedPayment` auto-sets `website_enabled = true` in `content_json` and inserts an active row in `service_subscriptions`.

2. **Admin activates** — from `/admin/`, the toggle switch sets `website_enabled` directly via `PATCH /api/admin/businesses/:id/toggle-website` without requiring a payment. This is the override path for comped or manually arranged accounts.

3. **Auto-expiry** — a daily cron job at 07:00 EAT (`backend/src/cron.js → checkSubscriptionExpiry`) marks expired subscriptions as `'expired'` and, for any business whose `website_hosting` just expired, sets `website_enabled = false`. The site becomes inaccessible to visitors until renewed.

4. **Auto-invoicing** — a daily cron job at 08:00 EAT (`backend/src/services/autoInvoice.js → generateDueInvoices`) creates a pending invoice 7 days before any recurring subscription's expiry, giving the owner advance notice. The invoice description includes "Weekly renewal / Monthly renewal / Annual renewal — expires {date}" based on the subscription's billing type. SMS/email delivery is queued but delivery integration is pending (see §5).

5. **Renewal** — the owner pays the auto-invoice or returns to the payment modal. On payment completion, `processCompletedPayment` extends the existing subscription's `expiration_date` rather than inserting a new row (idempotent upsert).

Billing types supported: `weekly`, `monthly`, `annual`, `one_time`. All four are configurable in admin → Services. The "period selector" in the owner's payment modal adapts its label (Weeks / Months / Years) and summary text to the service's billing type.

### 4.7 Display-only mode (cart/book suspended)

As of October 2026, the WhatsApp ordering and booking layer has been **temporarily suspended** across all four templates. The site now serves as a display showcase only — contact buttons (Phone, WhatsApp, Email) remain active, but:

- **Book button** (services) — commented out in all four template files. Search for `// BOOK:` to restore.
- **Add to Cart button** (products) — `onAddToCart={null}` in all four templates; the card's button renders only when `onAddToCart` is non-null.
- **Cart FAB** — commented out. Search for `// ── CART FAB` to restore.
- **Booking modal** — commented out. Search for `// ── BOOKING MODAL` to restore.
- **Cart drawer** — commented out. Search for `// ── CART DRAWER` to restore.
- **`_booking.jsx` import** — commented out at the top of each template. Restore the import line alongside the UI elements above.

The `_booking.jsx` module itself is unchanged. Re-enabling the full flow requires uncommenting the import and the six JSX blocks (one per template file × four templates). No DB changes are needed; the cart was always in-memory only.

**Decision:** The commerce layer was suspended because the WhatsApp-redirect model needs UX review before going live with paying subscribers. No timeline for restoration has been committed. This section and the in-code comments are the record of where to resume.

## 5. Future / Not Yet Built

These were discussed and scoped at a high level but **not started**. Full detail is in [`docs/template-features-analysis.md`](template-features-analysis.md), written during the initial research pass on this feature area — treat this PRD as the record of what shipped, and that doc as the working notes for what's next.

- **A 5th+ template.** Low effort in the current architecture — copy an existing `.jsx` file, restyle, register it in `SitePage.jsx`'s lookup map and the dashboard's picker array. No migration needed since `site_template` is unconstrained text.
- **Per-business theming (light/dark mode, custom background/accent colors).** Would need new `content_json.theme` fields, a color-picker UI, and refactoring all four templates from hardcoded Tailwind color classes to CSS-variable-driven styling.
- **Architectural shift to pregenerated static HTML.** The current SPA-fetch-per-visit pipeline (§4.1) does real, avoidable work for content that's otherwise static. The analysis doc recommends rendering a static HTML file per business at save time and serving it directly via Caddy from disk — the same pattern already used for photos, bypassing Node entirely. This would improve load time, SEO, and DB load, and would make theming and future templates cheaper to add. Not scoped into a concrete plan yet; open questions include whether to migrate all four existing templates or only use it going forward, and photos were explicitly agreed to stay on the current upload/serving pipeline regardless.
- **Multi-language content.** PRD-04's original `[EN][SW][KK][KY]` tabs were never built. Revisiting this would likely piggyback on whichever of the above gets built first (theming or pregeneration), since both already require touching every template.

## 6. Out of Scope

Explicit boundaries, so future work on this feature doesn't quietly grow past what's needed:

- **Owner-uploaded or marketplace templates.** The template set is a fixed, developer-maintained list. There is no plan for businesses to upload custom HTML/CSS or choose from a marketplace of third-party designs.
- **Online payment/checkout.** The WhatsApp cart and booking flow (`_booking.jsx`) is intentionally the entire extent of "commerce" considered for the site builder — a deep link to a pre-filled WhatsApp message. No payment gateway integration, no order persistence, no inventory management is planned. The commerce layer is currently suspended (see §4.7) pending UX review, but the implementation is intact in `_booking.jsx` and will be restored when ready.
- **A dedicated "owner profile" content type.** The legacy reference site (Vibrant's inspiration) had a named owner photo/bio section ("Joyce Mbole Mwendwa – Business Owner"). No such field exists in `content_json`, and none is planned — `profile.how_to_find` covers the equivalent "come visit us" copy without impersonating a specific unverified person.
- **Geocoding or verified addresses.** *Superseded by [PRD-17](PRD-17-business-location.md).* `location.*` address fields stay freeform text. Map pins now come from owner-entered `location.latitude` / `location.longitude`, not from the address; no address geocoding or verification is planned.
- **SEO tooling.** No per-business meta tags, structured data (JSON-LD), sitemap entries, or social share card editor. (Pregeneration, if built per §5, would incidentally help crawlability, but that's a side effect, not a goal.)
- **Site analytics.** No visit tracking, click tracking, or conversion reporting for the public site is planned here.

## 7. Related Docs

- [PRD-02: Payments, Services & Transactions](PRD-02-payments.md) — `website_hosting` as a purchasable subscription; this PRD covers what that subscription unlocks.
- [PRD-04: UI & UX](PRD-04-ui-ux.md) — contains the original (superseded) "Website Content Editor" mockup this PRD replaces as the source of truth for this feature area.
- [PRD-07: Photos](PRD-07-photos.md) — the upload/transform pipeline that populates `images`/`media_primary`, consumed but not modified by this feature.
- [`docs/template-features-analysis.md`](template-features-analysis.md) — working notes and recommendations for the Future items in §5.
