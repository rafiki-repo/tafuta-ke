# Website Template System — Analysis & Recommendations

_Research snapshot for the business "Website" tab template system (Classic / Bold / Minimal). Written 2026-09-28. This is an analysis document only — no implementation has been done._

## Current architecture

- **Stack**: Vite 5 + React 18 SPA (no Next.js, no TypeScript) + React Router 6 (client-side routing) + Tailwind CSS 3.4, on the frontend (`frontend/`). Backend is Express 4 + raw `pg` (no ORM) in `backend/`.
- **Deployment**: a VPS running Caddy, which serves static files (e.g. uploaded business photos) directly from disk — Node is not in that read path. Deploy is via a `deploy.sh` script (see `backend/README.md`).

### Where the templates live
Three plain React components, one per design, under `frontend/src/pages/public/templates/`:
- `SiteClassic.jsx` (462 lines)
- `SiteBold.jsx` (404 lines)
- `SiteMinimal.jsx` (447 lines)
- `_booking.jsx` (271 lines) — shared cart/booking UI (`useCart`, `BookingModal`, `CartDrawer`, `CartFab`) imported by all three.

Each template takes a `business` prop and renders full markup with **hardcoded Tailwind color classes** (e.g. Bold uses `bg-gray-900`, `from-orange-600 to-orange-500`, `text-orange-400`). There is no shared/parametrized color theme passed into them.

### How `/site/:tag` actually renders (not pregenerated)
- Route: `frontend/src/App.jsx:100` — `<Route path="/site/:tag" element={<SitePage />} />`
- Page: `frontend/src/pages/public/SitePage.jsx` — on mount, calls `siteAPI.getByTag(tag)`, then picks a component from a lookup map and renders it:
  ```js
  const TEMPLATES = { classic: SiteClassic, bold: SiteBold, minimal: SiteMinimal };
  const Template = TEMPLATES[previewTemplate] || TEMPLATES[business.site_template] || SiteClassic;
  return <Template business={business} />;
  ```
- Backend: `GET /api/site/:tag` in `backend/src/routes/site.js` runs a **live Postgres query on every request** (reads `content_json`), checks `website_enabled`/hosting subscription for 404 gating, and returns JSON. The server never renders HTML — it only serves data.
- The "Preview Classic/Bold/Minimal" links in the dashboard just append `?template=<id>` to override which component renders client-side.

**Bottom line: this is a client-rendered SPA that re-fetches and re-assembles the page on every visit** — there is no caching, SSR, ISR, or static pregeneration anywhere in the pipeline today.

### Data model
Single JSONB blob on the `businesses` table (`backend/src/db/migrations/002_create_businesses.sql`):
```sql
content_json JSONB NOT NULL DEFAULT '{}',
content_version INTEGER DEFAULT 1,
```
with a GIN index on `content_json`. Relevant keys (untyped, no schema beyond convention):
- `content_json.site_template` — `'classic' | 'bold' | 'minimal'` string, defaults to `'classic'`. **Not** a DB enum/CHECK constraint — just a string read by the frontend lookup map, so adding a new value requires no migration.
- `content_json.website_enabled` — tri-state boolean/undefined; `undefined` falls back to an active `website_hosting` subscription.
- `content_json.profile.en`, `.contact`, `.location`, `.hours`, `.media`, `.products[]` — the rest of the page content.

Every save writes the whole `content_json` blob and is versioned into a `business_content_history` audit table (`backend/src/routes/businesses.js` ~line 328).

### Dashboard "Website" tab
`frontend/src/pages/dashboard/BusinessEditor.jsx`:
- Tab registration: line 76.
- Template picker grid (matches the screenshot): lines 1112–1172. Selecting a card just sets local state (`handleChange("siteTemplate", tpl.id)`, line 1139) — it's only persisted when the form is submitted (line 455 puts it into the PUT payload), which is why the UI says "Save changes below to apply the selected template."
- Live/offline toggle: lines 1178–1243 → `PATCH /admin/businesses/:id/toggle-website` → `backend/src/routes/admin.js` does `jsonb_set(content_json, '{website_enabled}', ...)`.
- Products & Services catalog editor starts right after, at line 1248.

### Theming / dark mode today
`frontend/tailwind.config.js` has `darkMode: ['class']` and shadcn/ui-style CSS variable tokens (`--background`, `--foreground`, `--accent`, etc.) in `frontend/src/index.css` — but this is boilerplate for the **dashboard app's own UI chrome only**. There's no `.dark {...}` variant block defined, no `ThemeProvider`/`useTheme`/toggle anywhere in the codebase, and none of it is wired into the public site templates (which use raw hardcoded Tailwind classes, not the CSS-variable tokens). It's inert scaffolding, not a working feature.

---

## Q1: How difficult would a 4th design be?

**Low effort**, in the current architecture — roughly a few hours:
1. Copy one of the existing `.jsx` templates and restyle it.
2. Add it to the `TEMPLATES` map in `SitePage.jsx`.
3. Add a card entry to the picker array in `BusinessEditor.jsx` (~line 1112).
4. No DB migration needed — `site_template` is a free-text string, not a constrained column.

## Q2: Where are the templates stored?
Answered above — `frontend/src/pages/public/templates/{SiteClassic,SiteBold,SiteMinimal,_booking}.jsx`.

## Q3: Could owners pick light/dark mode and custom background/highlight colors?

Feasible, but a **moderate refactor** in the current architecture, since colors are hardcoded Tailwind classes rather than parametrized:
- Add theme fields to `content_json` (e.g. `content_json.theme = { mode: 'light'|'dark', background: '#...', accent: '#...' }`).
- Refactor all three templates to read CSS custom properties (e.g. `style={{ '--accent': theme.accent }}` + Tailwind arbitrary-value utilities like `bg-[var(--accent)]`) instead of fixed classes like `bg-orange-500`.
- Add a color-picker / mode-toggle UI to the Website tab.
- The unused `darkMode: 'class'` Tailwind scaffolding could be leveraged for the *dashboard's* own dark mode too, but that's a separate, unrelated concern from per-business site theming.

## Q4: Would a JSON-config + single HTML/CSS template + pregeneration approach be more efficient?

**Yes.** The current pipeline does real, avoidable per-visit work for a page that's otherwise static content: load the JS bundle → fetch `/api/site/:tag` (live DB query) → client-side render. A config-driven template rendered to static HTML **at save time** and served directly by Caddy from disk would:
- Cut load time (no bundle/JS-render wait, no request-time DB query).
- Improve SEO (crawlable static HTML instead of client-rendered SPA content).
- Reduce backend/DB load — no query per visitor.
- Make theming trivial — colors/mode become CSS variables injected once at generation time, not per-request logic.
- Make future designs cheap to add — a new HTML/CSS "skin" file, no React/JS build knowledge required.

This also fits the existing deployment model well: business photos are **already** served this way — uploaded via the API but read directly off disk by Caddy, bypassing Node entirely (`backend/README.md:121`). A pregenerated site page would follow the same established pattern rather than introducing a new one.

### What this would require (if pursued later — not scoped or implemented here)
- A small template-rendering step (e.g. simple string/mustache-style substitution, or a minimal render function) that takes `content_json` (+ new `theme` fields) and produces a final HTML file per business.
- A regenerate-on-save hook wherever `content_json` is currently persisted (`backend/src/routes/businesses.js`, `backend/src/routes/admin.js`'s toggle-website path, etc.) so the static file stays in sync.
- A decision on migrating the 3 existing React templates to the new HTML/CSS skin format (vs. keeping them as React and only using pregeneration for new designs).
- **Photo handling**: leave the existing photo upload/serving pipeline (multer/sharp → filesystem → Caddy) as-is. A pregenerated template would just reference the same photo URLs/paths it does today.

---

## Possible next step (not scoped here)
If this direction is pursued, a natural first slice would be porting one template (e.g. Classic) to the config + static-HTML approach as a proof of concept, including the regenerate-on-save hook, before migrating Bold/Minimal or adding a 4th design.
