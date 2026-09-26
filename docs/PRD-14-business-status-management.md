# PRD-14: Business Status Management & Soft Delete

**Product Requirements Document**
**Version:** 1.0
**Last Updated:** September 2026
**Status:** Implemented

---

## 1. Overview

The `businesses.status` column has always had a `deleted` value reserved in its `CHECK` constraint (alongside `deactivated` and `out_of_business`), but no code path ever wrote it. In practice only two transitions existed: `pending → active` (approve) and `pending → suspended` (reject, reusing "suspended" to mean "rejected"). There was no way to suspend an already-active business, no way to soft-delete a listing, and no way to reverse any of it.

This PRD documents a single generalized capability that replaces that gap: a platform admin can move a business between any of the four in-use statuses (`pending`, `active`, `suspended`, `deleted`) from one control, with a reason required and logged every time.

---

## 2. Problem Statement

- The only status-changing endpoints (`approve`, `reject`) only fired from `pending`, leaving no way to suspend an active business or delete a listing outright.
- Nothing ever set `status = 'deleted'`, so soft delete did not functionally exist despite the schema anticipating it — `businesses.js` even had a dormant `403 Cannot edit deleted business` check with no code path that could ever trigger it.
- The admin business list endpoint's base filter was `status != 'deleted'`, unconditionally ANDed with any requested `?status=` filter. Requesting `status=deleted` therefore always produced zero rows — even once a deleted business existed, there was no way to see it in the admin console.
- Background jobs (auto-invoicing, subscription-expiry reminders, website-disable-on-expiry) and several admin service-management actions never checked `businesses.status` at all, so a business excluded from public view could still accumulate invoices or have services granted/toggled.

---

## 3. Goals

- Let a platform admin at `admin` level or higher change a business's status to any of `pending`/`active`/`suspended`/`deleted`, and back again, from a single control — restoring is just another status change, not a distinct action.
- Require a reason for every status change and log it to `audit_logs` (`action: business_status_changed`) with the old and new status.
- Make `status = 'deleted'` hide the business everywhere a visitor or owner would normally see it — public storefront, search, subdomain site, and the owner's "My Businesses" list — while keeping it visible and editable to admins via a new "Deleted" tab in the admin business list.
- Exclude deleted businesses from background jobs (auto-invoicing, expiry reminders, auto-disable-website) and from admin/owner actions that would newly activate paid services on them.

## 4. Non-Goals

- **Owner self-service delete/restore.** Deferred — see the ownership-transfer precedent in [PRD-13](PRD-13-business-owner-transfer.md) for the same call on a related feature. Worth revisiting later: it would reduce cases where an owner re-creates a duplicate listing because their original was deleted and they can't see why.
- **Owner notification on status change.** No live SMS/email provider is wired to this event, matching the "logged, not sent" state PRD-13 established for ownership transfer.
- **Distinct per-action confirmation UX.** PRD-05's original (never-built) design sketched separate Suspend and Delete modals, the latter requiring the admin to type the business name to confirm and framed as irreversible ("This action cannot be undone"). That framing no longer fits: since any status is reversible to any other, a single "Change Status" control with a required reason replaced both mockups.
- **Freeing up `subdomain`/`business_tag` for reuse.** Both remain plain `UNIQUE` constraints; a deleted business still permanently holds its subdomain and tag. Adding a partial unique index (as already exists for `uniq_business_active_owner`) to free these on delete was considered and deferred.
- **Blocking every conceivable action on a deleted business.** Only paths that could newly activate/expose a deleted business were closed off (see Ripple-Effect Audit). Historical documents and cancelling a lingering service were deliberately left alone.

## 5. Design Decisions

**Reused the existing enum value.** `'deleted'` was already legal in the `businesses.status` `CHECK` constraint; no migration was needed, only wiring code paths to write and honor it.

**One endpoint, not several.** Rather than separate suspend/delete/restore actions, `PATCH /api/admin/businesses/:id/status` takes any of the four live values as a target and requires a `reason`. This directly reflects the requirement that admin can move a business from any status to any other — there is no special "restore" concept.

**Required admin level: `admin` or higher**, matching the bar already used for ownership transfer (PRD-13) and other sensitive business actions.

**Every transition is audited, including reversals.** Each call — deleting, suspending, or bringing a business back to `pending`/`active` — writes an `audit_logs` entry with actor, old status, new status, and reason. An initial idea to skip logging reversals was dropped in favor of logging everything, for consistency with other audited admin actions.

**Admins can still edit a deleted business.** The dormant `403 Cannot edit deleted business` check in `businesses.js` now excludes admins, so a deleted listing stays editable (e.g. to correct data before restoring it) even though non-admin staff/owners cannot edit it.

**Fixed a latent query bug as part of this work.** The admin business list's base condition (`status != 'deleted'`) previously applied unconditionally, contradicting any explicit `?status=deleted` filter and making the value permanently unreachable through the API. The base exclusion now only applies when no status filter is requested — this is also what makes the new "Deleted" tab function at all.

## 6. Ripple-Effect Audit

**Unaffected (already correct before this change):**
- Public storefront (`GET /api/businesses/:id`), search/listing (`search.js`), and subdomain site resolution (`site.js`) already whitelist `status = 'active'`, so a deleted business was already invisible there with no code changes required.
- Invoice PDF generation (`invoice.js`) is unaffected — an invoice issued before a business was deleted still renders.
- Admin-triggered subscription deactivation (cancelling a single paid service) remains unrestricted on a deleted business — cancelling a lingering service there is desirable housekeeping, not something to block.

**Intentionally affected (newly excluded once a business is `deleted`):**
- The owner's "My Businesses" list (`GET /api/users/me/businesses`, via `getUserBusinesses`) now excludes deleted businesses.
- Auto-invoicing (`services/autoInvoice.js`) no longer generates renewal invoices for a deleted business's subscriptions.
- The subscription-expiry reminder job and the website-auto-disable-on-hosting-expiry job (`cron.js`) now skip deleted businesses.
- Admin can no longer grant/extend a paid service (`POST /admin/businesses/:id/subscriptions`) or re-enable the website (`PATCH /admin/businesses/:id/toggle-website`, `enabled: true` only) on a deleted business — both return `409 BUSINESS_DELETED`.
- Customer-initiated checkout (`POST /payments/initiate`) now rejects starting a payment for a deleted business — previously an owner with a stale page open could still pay for services on a listing invisible everywhere else.
- The admin business list's new "Deleted" tab surfaces exactly the businesses in this state; the shared Basic Info editor (`BusinessEditor.jsx`) remains reachable and editable there for admins.

**No new database safeguard was needed** — existing constraints (`subdomain`, `business_tag`, `uniq_business_active_owner`) are untouched.

---

## 7. API

- `PATCH /api/admin/businesses/:id/status` (new, `admin` level or higher) — body `{ status, reason }`, `status` one of `pending | active | suspended | deleted`. Rejects a no-op (new status equal to current) and a missing `reason`. Writes an `audit_logs` entry (`action: business_status_changed`, old/new status, reason) on every call.
- `GET /api/admin/businesses?status=deleted` now actually returns deleted businesses (previously always empty due to the query bug described above).
- `POST /api/admin/businesses/:id/subscriptions` and `PATCH /api/admin/businesses/:id/toggle-website` (when `enabled: true`) now return `409 BUSINESS_DELETED` if the target business is deleted.
- `POST /api/payments/initiate` now returns `409 BUSINESS_DELETED` if the business being paid for is deleted.

---

## 8. Related Documentation Updates

- `docs/PRD-01-auth.md` — Business Account States table updated (Suspended/Deleted are admin-reversible, not permanent); Permissions Matrix note added pointing to this PRD.
- `docs/PRD-05-admin.md` — replaced the never-built, separate Suspend/Delete modal mockups with the unified "Change Status" control actually implemented; updated the All Businesses List (Deleted tab/filter), Business Detail View action buttons, and API Endpoints section.
