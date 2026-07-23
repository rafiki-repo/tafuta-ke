# PRD-10: Category Management, Navigation Fixes, and Category Landing Pages

**Product Requirements Document**  
**Version:** 1.2  
**Last Updated:** July 2026  
**Status:** Implemented  

---

## 1. Overview

This PRD covers three improvements delivered in July 2026:

1. **Admin category management** — a dedicated admin UI and backend to create, edit, and assign the business categories used across the platform.
2. **Business detail back-button fix** — the "Back" link on the public business detail page now returns the user to wherever they came from rather than always jumping to the search page.
3. **Category landing pages** — public pages at `/category/:slug` that showcase the top businesses in a category alongside promotional ad cards. Designed for QR code flyers and deep links (e.g., "Ruiru Salons" flyer → `tafuta.ke/category/salons`).

---

## 2. Goals

### 2.1 Category Management

- Give admin staff a simple tool to maintain the authoritative list of business categories without touching the database directly.
- Keep category names consistently display-cased across admin and public pages.
- Allow admin staff to rename a category typo and update assigned businesses in one action.
- Allow admin staff to reassign a business's category from within the same screen, so miscategorised businesses can be corrected quickly.
- Seed initial data corrections: DK Secondhand → Household and Electronics; Daniel's Computers → Technology; Snap Image Studio → Studio (new category).

### 2.2 Back-Button Fix

- When a user opens a business detail page and presses "Back", they are taken to the page they navigated from (search results, homepage, or any other entry point).
- Preserve any search query or filters the user had in place before they opened the detail page.

### 2.3 Category Landing Pages

- Give every category a shareable, QR-code-friendly public URL (e.g., `tafuta.ke/category/salons`).
- Surface the top 3 businesses in that category so casual visitors immediately see value.
- Display promotional ad cards alongside the businesses to generate awareness for training programs, partner services, or Tafuta itself.
- Provide a clear path to full search results when more than 3 businesses exist in the category.

---

## 3. Non-Goals

- No per-category images or custom hero photos in this release (icons are pulled from an existing code map).
- No bulk business recategorisation tool (admin assigns one business at a time).
- No automatic category suggestion based on business name or description.
- No config-driven category page JSON in this release; that remains a future enhancement.

---

## 4. Category Management

### 4.1 Problem

The category list was hardcoded in frontend dropdowns and seed data. Admin staff had no way to add, rename, or remove categories without a code or database change. Several businesses were also placed in incorrect or non-existent categories when they were first registered.

### 4.2 Data Model

Categories are stored in the existing `system_config` table under key `'categories'`.

```sql
key:   'categories'
value: '["Household and Electronics","Restaurants","Salons","Studio","Technology", ...]'
```

- Value is a JSON array of strings, sorted alphabetically.
- No schema migration required for the config store itself.
- Migration `017_categories_admin_and_updates.sql` adds the three new/corrected categories and reclassifies the three affected businesses.

### 4.3 Validation Rules

Enforced identically on both frontend and backend:

| Rule | Limit |
|---|---|
| Minimum length | 1 character (after trim) |
| Maximum length | 80 characters |
| Allowed characters | Letters, numbers, spaces, `&`, `/`, `(`, `)`, `+`, `'`, `.`, `-` |
| Must start with | Letter or number |
| Maximum categories in list | 100 |
| Duplicates | Case-insensitive deduplicated on save |

When saving categories, the backend also sorts the list alphabetically, normalises internal whitespace (multiple spaces → single space), and applies display casing.

Display casing examples:

| Input | Stored/Displayed |
|---|---|
| `salon` | `Salon` |
| `SALON` | `Salon` |
| `household and electronics` | `Household And Electronics` |

Search and category landing queries match categories case-insensitively so older lowercase business rows continue to work while the UI presents clean category labels.

When assigning a category to a business, the backend validates that the chosen category already exists in the configured list. A category cannot be assigned to a business before it has been saved to the list.

### 4.4 Admin UI

**URL:** `/admin/categories`

**Navigation:** "Categories" link in the admin sidebar, using the Tags icon.

**Required admin role:** `admin` or higher.

The page is split into two cards:

#### Card 1 — Manage category list

```
┌───────────────────────────────────────────────────┐
│ Manage category list                              │
├───────────────────────────────────────────────────┤
│ [___________________________] [+ Add]             │
│                                                   │
│  Household And Electronics      ✎  ×              │
│  Restaurant                     ✎  ×              │
│  Salon                          ✎  ×              │
│  Studio                         ✎  ×              │
│  Technology                     ✎  ×              │
│  ...                                              │
│                                                   │
│                              [Save Categories]    │
└───────────────────────────────────────────────────┘
```

- Type a category name and press **Add** or Enter to add it to the local list.
- Newly added categories appear immediately in the category list; they are not yet saved.
- Category rows show visible text plus edit and delete icon buttons.
- Click the edit icon to rename a category inline.
- Press Enter or the check icon to save a rename.
- Press Escape or the X icon to cancel a rename.
- Renaming a category calls the backend immediately and updates all businesses currently assigned to the old category.
- Click the delete icon to remove it from the local list.
- Press **Save Categories** to persist the full list to the backend.
- Inline validation fires on Add and again on Save (catches any list that was edited in unusual ways).
- Success and error feedback shown via Alert components beneath the page heading.

#### Card 2 — Assign categories to businesses

```
┌───────────────────────────────────────────────────┐
│ Assign categories to businesses                   │
├───────────────────────────────────────────────────┤
│ 🔍 Search businesses by name...                   │
│                                                   │
│ DK Secondhand                                     │
│ Current: Household and Electronics · Ruiru        │
│                             [Household and ▼]     │
│                                                   │
│ Daniel's Computers                                │
│ Current: Technology · Ruiru                       │
│                             [Technology      ▼]   │
│                                                   │
│ Snap Image Studio                                 │
│ Current: Studio · Ruiru                           │
│                             [Studio         ▼]    │
└───────────────────────────────────────────────────┘
```

- Search input debounces 300 ms and fetches up to 30 businesses matching the name.
- Each row shows a dropdown pre-set to the business's current category.
- Selecting a different category from the dropdown immediately calls the backend and updates the record.
- A spinner appears inline next to the dropdown while the request is in flight.
- A guard prevents assigning a category that has not been saved to the list yet.

### 4.5 Initial Data Correction (Migration 017)

| Business | Old Category | New Category |
|---|---|---|
| DK Secondhand | *(various)* | Household and Electronics |
| Daniel's Computers *(name variants)* | *(various)* | Technology |
| Snap Image Studio | *(various)* | Studio |

The migration also merges `Household and Electronics`, `Technology`, and `Studio` into the configured category list without removing any existing categories.

Both the `category` column on the `businesses` table and `content_json.profile.en.category` are updated in one statement so they remain in sync.

### 4.6 API Endpoints

| Method | Path | Role Required | Description |
|---|---|---|---|
| `GET` | `/api/admin/categories` | admin | Return current category list from system_config |
| `PATCH` | `/api/admin/categories` | admin | Replace category list; validates, display-cases, and sorts |
| `PATCH` | `/api/admin/categories/rename` | admin | Rename one category and update assigned businesses |
| `PATCH` | `/api/admin/businesses/:id/category` | admin | Assign a single category to a business |

`PATCH /api/admin/categories` body:

```json
{ "categories": ["Restaurants", "Salons", "Technology"] }
```

`PATCH /api/admin/categories/rename` body:

```json
{
  "old_category": "Salons",
  "new_category": "Salon"
}
```

`PATCH /api/admin/businesses/:id/category` body:

```json
{ "category": "Technology" }
```

Category list replacement, category rename, and business category assignment write to the audit log (`updated_categories`, `renamed_category`, and `updated_business_category` actions respectively).

### 4.7 SQL Type Fix

The business category assignment endpoint originally reused the same Postgres parameter for both the `businesses.category` column and the JSONB update:

```sql
category = $1,
jsonb_set(content_json, '{profile,en,category}', to_jsonb($1::text), true)
```

Postgres inferred inconsistent types for `$1` in some executions. The fix passes the category value as a separate JSONB-update parameter:

```sql
category = $1,
jsonb_set(content_json, '{profile,en,category}', to_jsonb($3::text), true)
```

This removes the `inconsistent types deduced for parameter $1` error when assigning categories.

### 4.8 Files Changed

**Frontend**

- `frontend/src/App.jsx` — added `/admin/categories` route and `Categories` import
- `frontend/src/layouts/AdminLayout.jsx` — added Categories nav link with Tags icon
- `frontend/src/pages/admin/Categories.jsx` — new page (category list editor, inline rename, business assignment)
- `frontend/src/lib/api.js` — added `adminAPI.getCategories`, `adminAPI.updateCategories`, `adminAPI.renameCategory`, `adminAPI.getAllBusinesses`, `adminAPI.updateBusinessCategory`

**Backend**

- `backend/src/routes/admin.js` — added category routes with inline validation helpers, rename support, and SQL type fix
- `backend/src/utils/validation.js` — added shared category display-case formatter
- `backend/src/db/migrations/017_categories_admin_and_updates.sql` — new migration

---

## 5. Category Landing Pages

### 5.1 Problem

There was no shareable URL for a specific business category. Marketing agents producing QR-code flyers (e.g., "Machakos Salons") had nowhere useful to point the code. Users arriving from such a link landed on the generic search page with no context.

### 5.2 URL Structure

```
/category/:slug
```

The slug is the category name converted to lowercase with non-alphanumeric runs replaced by hyphens:

| Category | Slug |
|---|---|
| Salons | `salons` |
| Technology | `technology` |
| Household and Electronics | `household-and-electronics` |

The backend resolves slugs back to canonical category names by display-casing and slugifying each entry in the configured category list, then matching against the incoming slug. A 404 is returned for unknown slugs.

Category matching is case-insensitive, so `/category/salon` can still find businesses whose database row was previously stored as `salon`.

### 5.3 Page Layout

```
┌───────────────────────────────────────────┐
│ ← Back                     [orange hero] │
│                                           │
│  ✂ Salons                                │
│  24 businesses listed                     │
└───────────────────────────────────────────┘

Top Businesses                      3 shown
┌───────────────────────────────────────────┐
│ [logo] Grace Hair Studio          ✓      │
│        Machakos · 0712 345 678           │
│        Professional styling services...  │
└───────────────────────────────────────────┘
┌───────────────────────────────────────────┐
│ [logo] Doreen Beauty Parlour             │
│        Machakos · 0722 345 678           │
└───────────────────────────────────────────┘
┌───────────────────────────────────────────┐
│ [logo] Kiki's Salon                      │
│        Ruiru · 0733 345 678              │
└───────────────────────────────────────────┘

[  View all 24 Salons businesses →  ]

Promotions
┌───────────────────────────────────────────┐
│ 📣 Learn Professional Hair Styling       │
│    Come train at Heniv Hair Academy.     │
│    Build real skills and start earning.  │
│    Ask us how →                          │
└───────────────────────────────────────────┘
```

**Header:** Orange gradient matching the homepage hero. Shows the category icon (from the same icon map as the homepage category chips), the category name, and a count of active businesses.

**Top Businesses:** Up to 3 business cards using the same card design as the homepage listing. Sorted by verification tier (premium → verified → basic), then most recently updated. Each card is tappable and navigates to the business detail page.

**"View all" link:** Shown only when total businesses in the category exceeds 3. Links to `/search?category={category}` so all filters are pre-populated.

**Promotions section:** Shown only when at least one matching ad exists. Hidden when empty.

**Empty state:** When no businesses are in the category, the business area shows a dashed-border placeholder with a "Register your business free" CTA button linking to `/register`.

**Not-found state:** When the slug doesn't match any configured category, a clean 404 message is shown with a "Back to Home" button.

### 5.4 Business Ranking

Top 3 are selected by:

1. `verification_tier`: premium (1) → verified (2) → basic (3)
2. `updated_at DESC` as tiebreaker — rewards active, recently-maintained listings

### 5.5 Promotional Ads

Ads are stored in `system_config` under key `category_ads` as a JSON array:

```json
[
  {
    "id": "ad-001",
    "category": "Salons",
    "headline": "Learn Professional Hair Styling",
    "body": "Come train at Heniv Hair Academy. Build real skills and start earning income from your talent.",
    "cta": "Ask us how"
  },
  {
    "id": "ad-003",
    "category": null,
    "headline": "Is Your Business on Tafuta?",
    "body": "Get discovered by thousands of local customers. Listing your business is completely free.",
    "cta": "Register now",
    "link": "/register"
  }
]
```

- `category: null` — ad appears on all category pages
- `category: "Salons"` — ad appears only on the Salons page (case-insensitive match)
- `link` — optional internal link; wraps the entire card in a `<Link>`
- `cta` — optional call-to-action text shown as a coloured prompt below the body

Ads are currently edited directly via the System Config editor (Super Admin). A dedicated ad management UI is a future enhancement.

Migration `018_seed_category_ads.sql` seeds three starter ads:

| Ad | Category | Description |
|---|---|---|
| `ad-001` | Salons | Heniv Hair Academy training promo |
| `ad-002` | Technology | IT skills training |
| `ad-003` | *(global)* | Tafuta business registration CTA |

### 5.6 API Endpoint

`GET /api/search/categories/:slug`

**Response:**

```json
{
  "success": true,
  "data": {
    "category": "Salons",
    "slug": "salons",
    "total": 24,
    "businesses": [ /* up to 3 */ ],
    "ads": [ /* matching ads */ ]
  }
}
```

No authentication required.

### 5.7 Files Changed

**Frontend**

- `frontend/src/App.jsx` — added `/category/:slug` route and `CategoryPage` import
- `frontend/src/pages/public/CategoryPage.jsx` — new page
- `frontend/src/lib/api.js` — added `searchAPI.getCategoryPage(slug)`

**Backend**

- `backend/src/routes/search.js` — added `slugify` helper and `GET /search/categories/:slug` endpoint
- `backend/src/routes/search.js` — public category list and category landing queries now return display-cased categories and match category filters case-insensitively
- `backend/src/db/migrations/018_seed_category_ads.sql` — new migration

---

## 6. Back-Button Fix

### 5.1 Problem

The "Back to Search" button on the public business detail page (`/business/:id`) was a hardcoded `<Link to="/search">`. This meant:

- A user who arrived from the homepage was sent to `/search` instead of back to the homepage.
- A user who arrived from search results with filters and a query string (e.g., `/search?q=salons&region=Ruiru`) lost their search context entirely.

### 5.2 Fix

Replace the hardcoded link with `navigate(-1)` from React Router's `useNavigate` hook.

```jsx
// Before
<Link to="/search">
  <Button variant="ghost" size="sm">
    <ArrowLeft className="h-4 w-4 mr-2" />
    Back to Search
  </Button>
</Link>

// After
<Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate(-1)}>
  <ArrowLeft className="h-4 w-4 mr-2" />
  Back
</Button>
```

`navigate(-1)` steps back one entry in the browser's history stack, preserving:
- The previous route (homepage, search, or any other page)
- All query parameters (search term, region, category filters)
- Scroll position (browser-handled)

**Edge case — direct navigation (no history):** If the user opened the business detail URL directly (e.g., from a shared link), `navigate(-1)` does nothing, which is standard browser behaviour. The button is still visible; it simply has no effect when there is no prior history entry.

The fix also removes the same hardcoded `/search` link in the error state (when the business fails to load).

### 5.3 Files Changed

- `frontend/src/pages/public/BusinessDetailPage.jsx`
  - Added `useNavigate` import, removed `Link` import (no longer used)
  - Replaced both `<Link to="/search">` instances with `navigate(-1)` button

---

## 7. Admin Review Drawer — Edit Button Spacing

A minor spacing issue was also corrected: the "Edit Business" button at the bottom of the admin business review slide-over drawer had no top margin, making it appear visually attached to the tier-update controls above it.

**Fix:** Added `mt-2 block` to the `<Link>` wrapper of the Edit Business button in `AdminBusinesses.jsx`.

---

## 8. QA Checklist

### Category Management

- [ ] Navigate to `/admin/categories` and confirm the page loads with the current category list.
- [ ] Add a new category and confirm it appears in the visible category list without saving.
- [ ] Press Save Categories and confirm the list persists after a page reload.
- [ ] Add `salon` and confirm it displays as `Salon`.
- [ ] Edit a category typo inline and confirm the changed name persists after reload.
- [ ] Rename a category with assigned businesses and confirm those businesses move to the new category.
- [ ] Attempt to add a duplicate category (case-insensitive) and confirm an error is shown.
- [ ] Attempt to save with a blank category name and confirm validation rejects it.
- [ ] Search for "DK Secondhand" in the business assignment section and confirm its category shows as "Household and Electronics".
- [ ] Search for "Daniel" and confirm Daniel's Computers shows as "Technology".
- [ ] Search for "Snap Image Studio" and confirm it shows as "Studio".
- [ ] Change a business category via the dropdown and confirm the change persists after reload.
- [ ] Confirm category assignment no longer throws `inconsistent types deduced for parameter $1`.
- [ ] Confirm that an unregistered category cannot be assigned (requires saving the list first).
- [ ] Confirm the audit log records `updated_categories`, `renamed_category`, and `updated_business_category` entries.

### Category Landing Pages

- [ ] Navigate to `/category/salons` and confirm the page loads with the correct category name and icon.
- [ ] Confirm up to 3 businesses are shown, ordered by verification tier.
- [ ] Confirm the business count in the header is accurate.
- [ ] Confirm clicking a business card navigates to the correct business detail page.
- [ ] Confirm the "View all" link appears only when total > 3 and links to `/search?category=Salons`.
- [ ] Confirm the Promotions section appears with the Salons-specific ad and the global ad.
- [ ] Navigate to `/category/technology` and confirm the Technology-specific ad and global ad appear.
- [ ] Navigate to `/category/household-and-electronics` and confirm the slug resolves correctly.
- [ ] Confirm category pages still show businesses whose stored category casing differs from the configured category casing.
- [ ] Navigate to `/category/does-not-exist` and confirm the 404 not-found state is shown.
- [ ] Navigate to a category with no businesses and confirm the empty state and "Register your business" CTA appear.
- [ ] Confirm the Back button returns to the previous page.

### Back-Button Fix

- [ ] Navigate from the homepage to a business detail page and press Back — confirm return to homepage.
- [ ] Search for businesses, open a result, press Back — confirm return to search results with original query and filters intact.
- [ ] Open a business detail URL directly (no referrer) and confirm the Back button is visible but does not error.

### Admin Drawer Spacing

- [ ] Open the business review drawer for any business and confirm the Edit Business button has visible spacing above it.

---

## 9. Acceptance Criteria

This work is considered complete when:

- Admin users can add and remove categories from the configured list and save successfully.
- Admin users can edit a category typo inline and update assigned businesses.
- Admin users can reassign a business category from the admin categories page.
- Category names are display-cased consistently in admin and public category APIs.
- Categories `Household and Electronics`, `Technology`, and `Studio` exist in the system.
- DK Secondhand, Daniel's Computers, and Snap Image Studio are in their correct categories.
- Every configured category has a working public landing page at `/category/:slug`.
- Category landing pages show the correct top 3 businesses and matching promotional ads.
- An unknown slug returns a clean 404 page.
- The "View all" link correctly pre-filters the search page by category.
- The "Back" button on the business detail page returns users to their actual previous page, including preserving search query strings.

---

## 10. Migration and Production Deployment Notes

### Required on production if not already applied

Run pending migrations through the normal migration runner:

```bash
cd backend
npm run migrate
```

For this PRD, production needs:

- `017_categories_admin_and_updates.sql` — adds/merges category values and corrects initial business categories.
- `018_seed_category_ads.sql` — seeds category landing page promotional ads.

### Not required as a new migration

The following changes are code-only and do not require a new schema migration:

- Inline category rename endpoint.
- Category display-case normalization in API responses.
- Case-insensitive category matching.
- Postgres `$1` type fix for category assignment.
- Visible row UI for categories.

If production has already run migrations through `018`, there are no additional category migrations required for the latest fixes.

---

## 11. Future Improvements

- Allow categories to have icons or emoji for visual browsing on the public homepage.
- Add a category usage count to the admin list so unused categories can be identified.
- Add a dedicated admin UI for managing category ads (currently edited via raw system config).
- Make the homepage category chips link to the category landing page instead of filtering in-place.
- Restrict business registration form to only show configured categories (currently uses a hardcoded list in BusinessEditor).
- Add a public category index page (`/categories`) listing all configured categories with their business counts.
- Add config-driven category pages backed by JSON, including custom title, ordered business IDs, ads, and resource links.

---

## 12. Related Files

### Frontend

- `frontend/src/App.jsx`
- `frontend/src/layouts/AdminLayout.jsx`
- `frontend/src/pages/admin/Categories.jsx`
- `frontend/src/pages/admin/AdminBusinesses.jsx`
- `frontend/src/pages/public/CategoryPage.jsx`
- `frontend/src/pages/public/BusinessDetailPage.jsx`
- `frontend/src/lib/api.js`

### Backend

- `backend/src/routes/admin.js`
- `backend/src/routes/search.js`
- `backend/src/utils/validation.js`
- `backend/src/db/migrations/017_categories_admin_and_updates.sql`
- `backend/src/db/migrations/018_seed_category_ads.sql`

---

**End of PRD-10**
