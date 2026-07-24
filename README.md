# TAFUTA

**Kenyan Business Directory and single page websites**
A PWA app for businesses in Kenya

*README*

---

## Document Information

**URL:** tafuta.ke
**API URL:** https://tafuta.ke/api
**Legal Entity:** eBiashara Rahisi Ltd
**Target Server:** s4.pamoja.ke (currently managed by Rafiki OpenClaw)

---

## Executive Summary

Tafuta is a super simple low cost business directory with single page website hosting. It will be rolled out in Kenya and serve the low-end of the market.  It also provides user and business identity management. It includes authentication, a payment hub, alerts/reminders and a config panel for customers to manage their own content. 

"I would rather make no money and create 10,000 jobs than make a boat load of money and have the economy continue to struggle." So please build me a platform that empowers businesses and creates jobs.

## APP Requirements and Design
See /docs/tafuta-Vision.md
See /docs/tafuta-Requirements.md
See /docs/PRD*.md
and other related documents in the /docs folder

## APP Frontend
See /frontend/README.md

## APP Backend
See /backend/README.md

## Analytics (Google Analytics 4)

Tafuta ships with Google Analytics 4 (`gtag.js`) hardcoded into [frontend/index.html](frontend/index.html), measurement ID `G-Y9F58NBE8H`. Since `index.html` is the single entry point for the Vite SPA, this tag loads on every page.

Tafuta is a client-routed SPA (React Router) — in-app navigations don't trigger a full page load, so `gtag.js` only sees them if it's listening for `pushState`/`popstate` changes. We rely on GA4's built-in **Enhanced Measurement** for this instead of a manual `page_view` event:

- **GA4 → Admin → Data Streams → web stream → Enhanced measurement → "Page changes based on browser history events" must stay ON.** This is what makes route changes within the app register as pageviews.
- If this setting is ever turned off, in-app navigation will stop being tracked (only the initial page load will fire).
- Do **not** add a manual `gtag('event', 'page_view', ...)` call on route change while this setting is on — GA4 would then double-count every navigation (once from Enhanced Measurement, once from the manual call).

See [docs/sample-policy/Privacy Policy-07-2026.html](docs/sample-policy/Privacy%20Policy-07-2026.html) (Section 6) for what this discloses to users.

## Development / Testing OTP Bypass

If you set `BD_OTP` in `backend/.env` (non-empty) at startup, that exact value can be used as a back-door OTP during development/testing to authenticate via the normal OTP verification endpoint.

If `BD_OTP` is blank or unset, the feature is disabled.

Note: In `development`, the backend currently accepts any 6-digit OTP as a placeholder. In non-development environments (staging/production), OTP verification requires `BD_OTP` until real OTP verification is implemented.

## Bootstrapping the First Admin

Tafuta admin access is managed through the `admin_users` table. There is no web UI for creating the very first admin — this is intentional. Use the CLI script from the server:

**Step 1 — Register a normal user account** via the app (the person who will become the first admin must already have an account).

**Step 2 — SSH into the server** and run from the `backend/` directory:

```bash
npm run promote-admin -- +254712345678
```

This promotes that phone number to `super_admin` (full privileges).

**Optional: specify a different role**

```bash
npm run promote-admin -- +254712345678 admin
npm run promote-admin -- +254712345678 support_staff
```

Available roles:
| Role | Description |
|---|---|
| `super_admin` | Full system access (default) |
| `admin` | Business and user management |
| `support_staff` | Customer assistance only |

**Notes:**
- The user must already be registered before running the script
- Admin access takes effect on the user's **next login** (a new JWT is issued at login time)
- The script is idempotent — running it again on the same phone updates the role without creating duplicates
- To revoke admin access, set `is_active = false` in the `admin_users` table directly (a UI for this will be added in the admin panel)

## Backup

**Full backup** (code + media + logs + .env + database — cron target):
```bash
./scripts/backup.sh
```

**Database-only backup** (quick snapshot before migrations etc.):
```bash
./scripts/backup-db.sh
```

Backups are written to `backup/db/` and `backup/full/`. A `latest` symlink in `backup/full/` always points to the newest full archive for SFTP retrieval. The `backup/` folder is excluded from rsync and is never wiped by deployments.

The nightly backup is scheduled automatically by the backend via `node-cron` (`backend/src/cron.js`) — no manual cron setup needed. It runs at 02:00 East Africa Time. Only PM2 instance 0 schedules tasks to prevent duplicate runs in cluster mode.

See [docs/PRD-08-backup.md](docs/PRD-08-backup.md) for scheduling details, SFTP retrieval, and full restore procedure.

## Deployment
See /DEPLOYMENT.md
