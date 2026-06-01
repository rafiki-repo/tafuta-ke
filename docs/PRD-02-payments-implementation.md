# Payments Module — Implementation Notes

**Date**: 2026-05-01  
**Branch**: kelvin  
**Status**: Complete (PesaPal sandbox credentials required for end-to-end testing)

---

## Overview

This document covers what was built, why decisions were made, and how to use the payments module. It is a companion to [PRD-02-payments.md](./PRD-02-payments.md).

---

## What Was Built

### Backend

#### 1. DB Migration — `016_add_receipt_number.sql`

```sql
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(20) UNIQUE;
```

Adds a PostgreSQL sequence and a `receipt_number` column to `transactions`. Receipt numbers are formatted as `TFT-YYYY-NNNNN` (e.g. `TFT-2026-00001`) in compliance with the PRD's VAT receipt requirement.

---

#### 2. `backend/src/routes/payments.js` — Full rewrite

**Bug fixed — webhook did not activate subscriptions**

The original code had the subscription activation logic only in the browser callback (`GET /callback`). The IPN webhook (`POST /webhook`) only updated the transaction status. This meant if the user closed their browser after paying, their services would never activate.

The fix extracts a shared `processCompletedPayment(trackingId, paymentMethod)` function called by both handlers. It uses a `WHERE status != 'completed'` guard on the `UPDATE` statement as the idempotency lock — if two calls race (webhook + callback both fire), only one `UPDATE` wins rows; the other exits without touching subscriptions.

```
Webhook (server-to-server) ──┐
                              ├──→ processCompletedPayment() ──→ UPDATE transactions
Callback (browser redirect) ──┘                              ──→ UPSERT service_subscriptions
```

**New endpoints added**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/payments/pricing` | Public | Returns pricing per service + VAT rate from `system_config` |
| `GET` | `/api/payments/subscriptions/:businessId` | Owner / Admin | Returns active subscriptions for a business |
| `GET` | `/api/payments/admin/transactions` | Admin | Paginated list of all transactions with filters |
| `GET` | `/api/payments/refunds` | Admin | Paginated list of all refund requests |
| `POST` | `/api/payments/refunds` | Admin | Create a refund request (in-person, admin-initiated per PRD) |
| `GET` | `/api/payments/refunds/:id` | Admin | Get a single refund request |
| `PATCH` | `/api/payments/refunds/:id/approve` | Admin | Approve a pending refund |
| `PATCH` | `/api/payments/refunds/:id/complete` | Admin | Mark refund as paid (cash disbursed); deducts months from subscription |
| `PATCH` | `/api/payments/refunds/:id/reject` | Admin | Reject a pending or approved refund |

**Refund flow** (as defined in PRD-02 — in-person, cash only for MVP):

```
Admin creates refund request
        ↓
Admin approves (PATCH /approve)
        ↓
Admin disburses cash to customer in-person
        ↓
Admin marks complete (PATCH /complete)
    → months deducted from service_subscriptions
    → audit log entry created
```

**Validation rules enforced**
- Months per service: 1–12 per transaction
- Only business `owner` role can initiate payments
- Refund items validated against existing active subscriptions before creation
- `GREATEST(0, months_paid - refunded)` prevents subscriptions going negative

---

#### 3. `backend/src/services/receipt.js` — Updated

- Uses `receipt_number` (`TFT-2026-00001`) instead of UUID as the receipt identifier
- Improved PDF layout with proper column alignment for the items table
- Includes VAT registration number when present in `system_config.legal_identity`
- Download filename uses receipt number: `receipt-TFT-2026-00001.pdf`

---

#### 4. `backend/src/cron.js` — Expiry monitoring added

A new daily job runs at **07:00 EAT** (business hours start):

1. **Marks expired subscriptions** — sets `status = 'expired'` for any `active` subscription where `expiration_date < CURRENT_DATE`
2. **Logs renewal reminders** — finds subscriptions expiring in exactly 7, 3, or 1 days and logs the owner's details. SMS/email delivery will slot in here once VintEx/Mailgun is active.

The backup job remains unchanged at 02:00 EAT.

---

### Frontend

#### 5. `frontend/src/lib/api.js` — New payment methods

```js
paymentAPI.getPricing()
paymentAPI.getSubscriptions(businessId)
paymentAPI.adminGetTransactions(params)
paymentAPI.adminGetRefunds(params)
paymentAPI.adminCreateRefund(data)
paymentAPI.adminGetRefund(id)
paymentAPI.adminApproveRefund(id)
paymentAPI.adminCompleteRefund(id)
paymentAPI.adminRejectRefund(id, data)
```

---

#### 6. `frontend/src/pages/dashboard/Payments.jsx` — Full implementation

**Route**: `/dashboard/payments`

Features:
- Business selector pill tabs (if user owns more than one business)
- **Active Services card** — lists each subscription with status badge and expiry date; warns in amber when ≤ 7 days remaining
- **Transaction History** — paginated list with status icon, receipt number, amount, and receipt PDF download button
- Refresh button; error states handled
- Quick-link card to checkout at the bottom

**Bug fixed during implementation**: `userAPI.getBusinesses()` returns `{ businesses: [...] }` inside `data.data`, not a plain array. Changed `res.data?.data` → `res.data?.data?.businesses`.

---

#### 7. `frontend/src/pages/dashboard/PaymentCheckout.jsx` — New file

**Route**: `/dashboard/payments/checkout/:businessId`

Features:
- Loads business name and live pricing from `/api/payments/pricing`
- Service cards with checkbox toggle — selecting a service reveals a month picker (±1 buttons + direct input, clamped 1–12)
- Live order summary: per-item totals, subtotal, VAT line, grand total
- Info banner explaining PesaPal redirect and immediate activation on payment
- On confirm: calls `POST /api/payments/initiate` → redirects browser to `pesapalResponse.redirect_url`
- Error state shown inline if initiate fails

---

#### 8. `frontend/src/pages/payment/PaymentSuccess.jsx` — New file

**Route**: `/payment/success?ref=MERCHANT_REF`

Standalone page (no dashboard chrome). Shows a green tick, the merchant reference, and links to the dashboard and payments page.

---

#### 9. `frontend/src/pages/payment/PaymentFailed.jsx` — New file

**Route**: `/payment/failed?ref=MERCHANT_REF`

Standalone page. Shows a red cross, the merchant reference, and a "Try Again" link back to the payments dashboard.

---

#### 10. `frontend/src/pages/admin/AdminPayments.jsx` — Full implementation

**Route**: `/admin/payments`

Two tabs:

**Transactions tab**
- Filter buttons: All / completed / pending / failed
- Per-row: receipt number, business name, payer name + phone, date, services, total amount
- Receipt PDF download for completed transactions
- Pagination (20 per page)

**Refunds tab**
- Lists all refund requests with status badge, business name, requester, items, net refund amount
- Inline action buttons per refund state:
  - `pending` → Approve / Reject
  - `approved` → Mark as Paid (triggers complete)
- "New Refund" button opens a modal form:
  - Business ID input
  - Service type + months-to-refund rows (add/remove)
  - Optional reason field
  - Calculates 5% processing fee and VAT reversal server-side

---

#### 11. `frontend/src/App.jsx` — New routes registered

```jsx
// Inside ProtectedRoute / DashboardLayout
<Route path="payments/checkout/:businessId" element={<PaymentCheckout />} />

// Standalone (no layout)
<Route path="/payment/success" element={<PaymentSuccess />} />
<Route path="/payment/failed"  element={<PaymentFailed />} />
```

---

## Payment Flow (End-to-End)

```
1. Owner opens /dashboard/payments
2. Clicks "Buy / Renew" → navigates to /dashboard/payments/checkout/:businessId
3. Selects services + months, reviews order summary
4. Clicks "Pay via PesaPal"
   → POST /api/payments/initiate
   → creates transactions row (status: pending)
   → submits order to PesaPal API
   → returns redirect_url
   → browser redirects to PesaPal hosted page
5. Owner pays via M-Pesa / Airtel / card on PesaPal
6a. PesaPal fires IPN webhook → POST /api/payments/webhook
    → processCompletedPayment() called
    → transactions.status = 'completed', receipt_number assigned
    → service_subscriptions upserted (months extended)
6b. PesaPal redirects browser → GET /api/payments/callback
    → processCompletedPayment() called (idempotent — skips if already done)
    → browser redirected to /payment/success?ref=...
7. Owner sees success page → navigates to /dashboard/payments
8. Subscriptions card shows updated services and expiry dates
9. Receipt available for download
```

---

## Subscription Expiry

The daily cron at 07:00 EAT handles two things:

- **Immediate expiry**: Any active subscription past its `expiration_date` is set to `expired`. The business listing stays visible (free tier); only paid features stop working.
- **Reminders**: At 7, 3, and 1 days before expiry the owner's phone/email is logged (ready for SMS/email once VintEx/Mailgun is wired).

Reactivation is immediate on payment — the subscription `ON CONFLICT DO UPDATE` extends from the later of today or the current expiry date.

---

## Known Limitations / Not Yet Done

| Item | Notes |
|------|-------|
| PesaPal `notification_id` | PesaPal v3 requires registering an IPN URL to get an `ipn_id`, which must be passed as `notification_id` in `submitOrder`. The `pesapalService.registerIPN()` method exists but isn't called at startup. Without this, IPN webhooks may not fire in production — the browser callback is the fallback. |
| SMS/Email on payment | Templates defined in PRD. VintEx + Mailgun are wired in `emailService.js` but not yet sending. Reminder logs in cron are the placeholder. |
| Discounts | Defined in PRD-02 (admin-assigned, highest-percentage wins). Not yet implemented — no `discounts` table in schema. Post-launch addition. |
| Amount validation on webhook | PesaPal status response should be cross-checked against the stored `total_amount` before completing. Currently trusts PesaPal's `Completed` status. |
| Subscription status in search | Free-tier vs paid-tier filtering in search results is not yet connected to `service_subscriptions.status`. |

---

## Files Changed

```
backend/src/db/migrations/016_add_receipt_number.sql   ← new
backend/src/routes/payments.js                         ← rewritten
backend/src/services/receipt.js                        ← updated
backend/src/cron.js                                    ← updated
frontend/src/lib/api.js                                ← updated
frontend/src/pages/dashboard/Payments.jsx              ← rewritten
frontend/src/pages/dashboard/PaymentCheckout.jsx       ← new
frontend/src/pages/payment/PaymentSuccess.jsx          ← new
frontend/src/pages/payment/PaymentFailed.jsx           ← new
frontend/src/pages/admin/AdminPayments.jsx             ← rewritten
frontend/src/App.jsx                                   ← updated
```
