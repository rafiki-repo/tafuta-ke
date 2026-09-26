# PRD-13: Business Owner Visibility & Admin-Initiated Ownership Transfer

**Product Requirements Document**
**Version:** 1.0
**Last Updated:** September 2026
**Status:** Implemented

---

## 1. Overview

The "Basic Info" tab exists in two places that already share one React component: under "My Businesses" (business owner/staff view) and under Admin Console > Businesses (platform admin view). Neither surfaced who the recorded owner of a business actually is, and there was no way for a platform admin to reassign ownership when needed (e.g. a business changes hands, an owner loses access to their account, a dispute is resolved).

This PRD documents the addition of an owner-identity display on both Basic Info tabs, and a platform-admin-only capability to transfer ownership to a different user.

---

## 2. Problem Statement

Ownership of a business is not a column on the `businesses` table — it is modeled as a row in the `user_business_roles` join table (`role = 'owner'`), written once at business-creation time and never updated afterward in production code. This meant:

- Neither the business owner nor an admin could see, at a glance, which user account was recorded as the owner of a listing.
- If a business needed to change hands, the only way to do it was a manual database update, with no audit trail and no built-in safeguard against ending up with zero or multiple owners.

---

## 3. Goals

- Show the current owner's name/email on the Basic Info tab in both the dashboard ("My Businesses") and Admin Console contexts, as a read-only confirmation of record.
- Allow a platform admin at `admin` level or higher to reassign a business's owner to any existing user in the system.
- Require a reason for every transfer and record it in the audit trail (`audit_logs`), alongside the old and new owner IDs.
- Guarantee at the database level that a business never ends up with more than one active owner.

## 4. Non-Goals

- Building a general staff/team management UI (adding/removing `admin`/`employee` roles on a business). No such UI exists today, and none is introduced by this change — see the ripple-effect note below for how that shaped the transfer behavior.
- Owner self-service transfer (an owner handing off their own business to someone else). This is an admin-only action.
- Notifying the old/new owner automatically. The platform's notification delivery for this kind of event is not yet wired to a live SMS/email provider elsewhere in the codebase, so this follows the same "logged, not sent" state as other admin-triggered notifications.

---

## 5. Design Decisions

**Full removal of the previous owner, not a demotion.** Because there is currently no UI anywhere in the product for managing a business's staff list (the backend's admin/employee endpoints exist but are not called from any frontend page), demoting the outgoing owner to an `admin`/`employee` role would leave them with access that nobody could later review or revoke through the UI. Transferring ownership therefore fully removes the previous owner's association with the business. If staff management is built in the future, this can be revisited to offer a choice.

**Required admin level: `admin` or higher** (`admin_users.role` hierarchy: `support_staff < admin < super_admin`), matching the bar already used for other sensitive business actions like tier updates and subscription grants.

**Reason required on every transfer**, stored in `audit_logs` (`action: 'business_owner_transferred'`) with the old and new owner's user IDs.

**New-owner search is unrestricted** — any user in the system can be selected as the new owner, using the same search (`GET /api/admin/users?q=`) already used on the admin Users page.

## 6. Ripple-Effect Audit

Before implementing, the following were checked to confirm a transfer wouldn't have unintended side effects elsewhere in the system:

**Unaffected (safe):**
- `refunds.user_id` — snapshotted at refund-request time, not re-derived from current ownership.
- `transactions.user_id` — set to whoever paid, independent of the `owner` role.
- `invoices.created_by` — the staff member who generated the invoice, not the owner.
- `business_content_history` — a permanent per-edit log, unaffected retroactively.

**Intentionally affected (this is the point of the feature):**
- The business moves from the old owner's to the new owner's "My Businesses" list.
- Invoice visibility for the business moves from the old owner to the new owner.
- Subscription-expiry reminder logic now targets the new owner.
- The admin business list's owner column updates immediately.

**New safeguard:** a partial unique index (`uniq_business_active_owner` on `user_business_roles(business_id) WHERE role='owner' AND is_deleted=false`) now enforces "at most one active owner per business" at the database level — previously this was only true because there was a single code path that ever inserted an owner row.

---

## 7. API

- `GET /api/businesses/:id` now includes an `owner: { user_id, full_name, email } | null` field. It is only populated for authorized viewers (someone with a role on the business, or a platform admin) — this endpoint also serves the public storefront page and must not leak owner PII to anonymous visitors.
- `PATCH /api/admin/businesses/:id/owner` (new, `admin` level or higher) — body `{ new_owner_user_id, reason }`. Removes the current owner's role row, inserts the new one, and writes an audit log entry.

---

## 8. Related Documentation Updates

- `docs/PRD-01-auth.md` — Permissions Matrix updated to note the platform-admin override on ownership assignment.
- `docs/PRD-05-admin.md` — Admin Permission Matrix, Business Actions, and API Endpoints sections updated to reflect the new capability.
