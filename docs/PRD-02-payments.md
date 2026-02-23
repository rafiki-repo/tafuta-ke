# PRD-02: Payments & Services

**Product Requirements Document**  
**Version**: 1.0  
**Last Updated**: Feb 21, 2026  
**Status**: Draft

---

## Overview

This PRD defines service subscriptions, payment processing, transactions, refunds, and discounts for Tafuta MVP. Focus is on simplicity and core functionality needed for launch.

**Key Principle**: No wallets, no token balances. Businesses pay for services; system tracks months of prepaid services per service type.

---

## Service Types

### Available Services

```
Service Types (enum):
  - website_hosting
  - ads
  - search_promotion
  - premium_listing
  - image_gallery
```

### Service Descriptions

- **website_hosting**: Single-page website with semi-custom subdomain (e.g., businessname.machakos.tafuta.ke)
- **ads**: Promotional ads displayed in search results and business listings
- **search_promotion**: Business appears in top 10% of search results ~2x more often
- **premium_listing**: Gold star icon; Tafuta staff review every 6 months to verify criteria
- **image_gallery**: Up to 50 product/service images in business profile

### Free vs Paid

- **Free tier**: Basic directory listing appears in search results only; no clickable link; no dedicated page; no subdomain
- **Paid services**: Monthly subscription or prepaid (pay for multiple months in advance)

---

## Service Subscriptions Model

### Service Subscriptions Table Schema

```
service_subscriptions:
  - subscription_id (UUID, primary key)
  - business_id (UUID, foreign key)
  - service_type (enum: website_hosting, ads, search_promotion, premium_listing, image_gallery)
  - months_paid (integer) - number of months prepaid
  - expiration_date (date) - when service expires
  - discount_id (UUID, foreign key, nullable)
  - status (enum: active, expired, cancelled)
  - created_at (timestamp)
  - updated_at (timestamp)
```

### How It Works

1. Business pays for service (e.g., 6 months of website hosting)
2. System creates/updates `service_subscriptions` record:
   - `months_paid = 6`
   - `expiration_date = current_date + 6 months`
   - `status = 'active'`
3. When business adds more months, system updates:
   - `months_paid += new_months`
   - `expiration_date += new_months`
4. When service expires:
   - System sets `status = 'expired'`
   - Website/ads/promotions automatically deactivated

**Each service type gets its own row** - a business with website hosting + ads will have 2 rows in `service_subscriptions`.

---

## Payment Processing

### Payment Gateway

- **MVP**: PesaPal only
- **Future**: M-Pesa, Airtel Money

### Payment Flow

1. Business Owner selects services to purchase (can select multiple)
2. System calculates total cost:
   - Base price per service × months
   - Apply discounts if eligible
   - Add 16% VAT
3. System displays total amount in KES
4. User confirms purchase
5. System redirects to PesaPal payment page
6. User completes payment via PesaPal
7. PesaPal sends webhook to Tafuta backend
8. System validates payment
9. System creates transaction record
10. System updates `service_subscriptions` (adds months to each service)
11. System generates VAT receipt
12. System sends confirmation SMS/email to user

### Multi-Service Purchase

- User can purchase multiple services in one transaction
- Example: 3 months website hosting + 6 months ads + 1 month search promotion
- Single payment covers all services
- Single VAT receipt lists all services purchased

---

## Transactions Model

### Transactions Table Schema

```
transactions:
  - tx_id (UUID, primary key)
  - business_id (UUID, foreign key)
  - transaction_type (enum: purchase, refund)
  - amount_kes (decimal) - total amount in KES including VAT
  - vat_amount (decimal) - VAT amount (16%)
  - net_amount (decimal) - amount before VAT
  - payment_method (string) - 'pesapal', 'cash' (for refunds)
  - reference_number (string) - PesaPal transaction reference
  - status (enum: pending, completed, failed, refunded)
  - receipt_id (UUID, foreign key, nullable)
  - created_at (timestamp)
  - completed_at (timestamp, nullable)
  - notes (text, nullable)
```

### Transaction Items Table Schema

```
transaction_items:
  - item_id (UUID, primary key)
  - tx_id (UUID, foreign key)
  - service_type (enum)
  - months_purchased (integer)
  - unit_price (decimal) - price per month before discount
  - discount_amount (decimal) - total discount applied
  - subtotal (decimal) - final amount for this item before VAT
  - created_at (timestamp)
```

**Why separate items table?** Allows one transaction to contain multiple services (e.g., website hosting + ads).

---

## Receipts

### Receipts Table Schema

```
receipts:
  - receipt_id (UUID, primary key)
  - tx_id (UUID, foreign key)
  - receipt_number (string, unique) - e.g., "TFT-2026-00001"
  - receipt_type (enum: purchase, refund)
  - business_id (UUID, foreign key)
  - amount_kes (decimal)
  - vat_amount (decimal)
  - net_amount (decimal)
  - issued_at (timestamp)
  - issued_by (UUID, nullable) - admin user_id for manual receipts
```

### Receipt Generation

- **Purchase receipt**: Generated automatically when payment completes
- **Refund receipt**: Generated when admin processes refund
- **Receipt number format**: `TFT-YYYY-NNNNN` (e.g., TFT-2026-00001)
- **VAT compliance**: Receipt includes Tafuta's legal identity from `system_config`:
  - Business name: eBiashara Rahisi Ltd
  - KRA PIN
  - VAT registration number
  - Business address
  - Business registration number

### Receipt Storage & Access

- **Storage approach**: Receipt data stored in database; PDFs generated on-demand (not stored as files)
- **Data retention**: Receipt records retained for 7 years minimum (tax compliance)
- **PDF regeneration**: System generates PDF from `receipts` + `transaction_items` data when user requests download
- **User access**: Users can view/download all receipts for their businesses via config panel
- **Format updates**: Receipt template can be updated; historical receipts regenerate with current template

---

## Fee Schedule

### Fees Table Schema

```
fees:
  - fee_id (UUID, primary key)
  - service_type (enum)
  - description (string)
  - price_per_month (decimal) - in KES
  - active (boolean, default: true)
  - created_at (timestamp)
  - updated_at (timestamp)
```

### Fee Management

- Admin can update fees without code deployment
- System looks up current price at payment time
- Historical transactions retain original price (stored in `transaction_items`)
- Inactive fees are hidden but retained for historical records

### Example Pricing (TBD - to be finalized before launch)

- Website hosting: 200 KES/month
- Ads: TBD
- Search promotion: TBD
- Premium listing: TBD
- Image gallery: TBD

---

## Discounts

### Discounts Table Schema

```
discounts:
  - discount_id (UUID, primary key)
  - business_id (UUID, foreign key)
  - discount_type (string) - e.g., "5+ employees at minimum wage"
  - discount_percentage (integer) - e.g., 50 for 50% off
  - criteria (text) - description of eligibility criteria
  - last_reviewed_at (timestamp)
  - reviewed_by (UUID, admin user_id)
  - expires_at (date)
  - status (enum: active, expired, revoked)
  - created_at (timestamp)
```

### Discount Rules

- **Eligibility**: Manually determined by Tafuta admin
- **Verification**: Honor system verified by Tafuta staff
- **Multiple discounts**: Businesses can have multiple active discounts simultaneously
- **Application**: Discounts apply to all services (MVP)
- **Stacking**: If multiple discounts, system uses highest percentage (no stacking in MVP)
- **Expiration**: Price increases at next payment event (not immediately)
- **Notifications**: System sends notification before discount expires

### Discount Application Flow

1. User initiates purchase
2. System checks for active discounts for business
3. System applies highest discount percentage to each service
4. System displays original price, discount, and final price
5. User completes payment
6. Receipt shows discount applied

---

## Refunds

### Refund Requests Table Schema

```
refund_requests:
  - request_id (UUID, primary key)
  - business_id (UUID, foreign key)
  - requested_by (UUID, user_id)
  - refund_amount (decimal) - amount to refund (before processing fee)
  - processing_fee (decimal) - 5% of refund_amount
  - net_refund (decimal) - amount user receives (refund_amount - processing_fee)
  - status (enum: pending, approved, completed, rejected)
  - tx_id (UUID, foreign key, nullable) - set when refund transaction created
  - requested_at (timestamp)
  - processed_by (UUID, admin user_id, nullable)
  - processed_at (timestamp, nullable)
  - notes (text, nullable)
```

### Refund Items Table Schema

```
refund_items:
  - item_id (UUID, primary key)
  - request_id (UUID, foreign key)
  - service_type (enum)
  - months_to_refund (integer)
  - amount_per_month (decimal)
  - subtotal (decimal)
  - created_at (timestamp)
```

### Refund Process

**User-initiated (in-person at Tafuta office):**

1. User visits Tafuta office in person
2. User requests refund for specific services and months
3. Admin creates refund request in system:
   - Selects business
   - Selects services to refund
   - Specifies months to refund per service
   - System calculates refund amount
   - System calculates 5% processing fee
   - System shows net refund amount
4. Admin approves refund request
5. System updates `service_subscriptions`:
   - Reduces `months_paid` by refunded months
   - Adjusts `expiration_date`
6. System creates refund transaction record
7. System generates refund receipt
8. Admin disburses cash to user
9. Admin marks refund as completed
10. System sends confirmation SMS/email

**Partial refunds permitted**: User can refund some of the remaining months, or all remaining months.

**MVP Note**: No automated refund disbursement; cash only; in-person only.

---

## Service Expiration & Deactivation

### Expiration Monitoring

- **Daily cron job**: Checks for services expiring in next 7 days
- **Notification schedule**:
  - 7 days before expiration: Send reminder SMS/email
  - 3 days before expiration: Send reminder SMS/email
  - 1 day before expiration: Send reminder SMS/email
  - On expiration day: Send expiration notice

### Automatic Deactivation

When service expires (`expiration_date` < current_date):

- **website_hosting**: Website becomes inaccessible; subdomain returns 404
- **ads**: Ads stop displaying
- **search_promotion**: Business returns to normal ranking
- **premium_listing**: Gold star icon removed
- **image_gallery**: Images hidden; only first 5 images shown

**Business listing remains visible** (free tier) even if all paid services expire.

### Reactivation

- User purchases more months
- System reactivates service immediately
- Website/ads/promotions become active again

---

## Payment Methods

### PesaPal Integration

- **Payment types**: M-Pesa, Airtel Money, Credit/Debit Card (via PesaPal)
- **Webhook**: PesaPal sends IPN (Instant Payment Notification) to Tafuta backend
- **Validation**: System validates payment signature and amount
- **Idempotency**: System handles duplicate webhooks gracefully

### Future Payment Methods

- Direct M-Pesa integration (Daraja API)
- Direct Airtel Money integration
- Bank transfer

**MVP**: PesaPal only.

---

## VAT Handling

### VAT Rate

- **Current rate**: 16%
- **Storage**: Stored in `system_config` table for easy updates
- **Application**: Applied to all service purchases

### VAT Calculation

```
net_amount = sum(service_price × months × (1 - discount_percentage))
vat_amount = net_amount × 0.16
total_amount = net_amount + vat_amount
```

### VAT on Refunds

- Refunds reverse the appropriate amount of VAT
- Example: User paid 1,160 KES (1,000 + 160 VAT) for 5 months
  - Refunds 2 months = 400 KES net + 64 KES VAT = 464 KES
  - Processing fee (5%) = 23.20 KES
  - Net refund = 440.80 KES

---

## System Configuration

### System Config Table Schema

```
system_config:
  - config_id (UUID, primary key)
  - key (string, unique)
  - value (string)
  - description (text)
  - updated_at (timestamp)
  - updated_by (UUID, admin user_id, nullable)
```

### Required Config Keys

**Tafuta Legal Identity:**
- `tafuta_business_name` = "eBiashara Rahisi Ltd"
- `tafuta_kra_pin` = "[KRA PIN]"
- `tafuta_vat_registration_number` = "[VAT Number]"
- `tafuta_business_address` = "[Physical Address]"
- `tafuta_business_registration_number` = "[Registration Number]"

**System Settings:**
- `vat_rate` = "0.16"
- `refund_processing_fee_percentage` = "5"
- `receipt_number_prefix` = "TFT"

**MVP Note**: Admin cannot edit legal identity via UI; must be updated manually in database or via migration.

---

## API Endpoints (Summary)

### Service Management
- `GET /api/businesses/:id/subscriptions` - List active subscriptions
- `GET /api/services/pricing` - Get current pricing for all services
- `PATCH /api/subscriptions/:id/adjust` - Admin manually adjust subscription (admin only)

### Payments
- `POST /api/payments/initiate` - Initiate payment (returns PesaPal redirect URL)
- `POST /api/payments/webhook` - PesaPal IPN webhook
- `GET /api/payments/:tx_id/status` - Check payment status

### Transactions
- `GET /api/businesses/:id/transactions` - List transactions for business
- `GET /api/transactions/:tx_id` - Get transaction details
- `GET /api/transactions/:tx_id/receipt` - Download receipt PDF

### Receipts
- `GET /api/businesses/:id/receipts` - List all receipts for business
- `GET /api/receipts/:id/download` - Generate and download receipt PDF

### Refunds
- `POST /api/refunds/request` - Create refund request (admin only)
- `GET /api/refunds/:request_id` - Get refund request details
- `PATCH /api/refunds/:request_id/approve` - Approve refund (admin only)
- `PATCH /api/refunds/:request_id/complete` - Mark refund as completed (admin only)

### Discounts
- `GET /api/businesses/:id/discounts` - List active discounts for business
- `POST /api/discounts` - Create discount (admin only)
- `PATCH /api/discounts/:id` - Update discount (admin only)
- `DELETE /api/discounts/:id` - Revoke discount (admin only)

**Detailed API specs**: See PRD-03-api.md

---

## Business Logic Rules

### Service Activation

- **Immediate activation**: Services activate immediately upon successful payment
- **No grace period**: Services deactivate immediately upon expiration
- **No partial months**: All purchases and refunds in whole months only

### Payment Validation

- **Minimum purchase**: 1 month per service
- **Maximum purchase**: 12 months per service per transaction (to prevent abuse)
- **Amount validation**: System validates PesaPal payment amount matches calculated total

### Refund Validation

- **Cannot refund more than paid**: System prevents refunding more months than available
- **Cannot refund expired months**: Can only refund future months (months_paid - months_used)
- **Minimum refund**: 1 month per service

---

## Notification Templates

### Payment Confirmation

**SMS:**
```
Tafuta: Payment received! KES {amount}. Services: {service_list}. Valid until {expiration_date}. Receipt: {receipt_url}
```

**Email:**
- Subject: Payment Confirmation - Tafuta Services
- Body: Detailed receipt with service breakdown, VAT, total

### Service Expiring Soon

**SMS:**
```
Tafuta: Your {service_type} expires in {days} days ({expiration_date}). Renew now: {renewal_url}
```

### Service Expired

**SMS:**
```
Tafuta: Your {service_type} has expired. Your business listing is still visible. Renew to restore full features: {renewal_url}
```

### Refund Processed

**SMS:**
```
Tafuta: Refund processed. KES {net_refund} available for pickup at Tafuta office. Receipt: {receipt_url}
```

---

## Security Requirements

### Payment Security

- **HTTPS only**: All payment pages served over HTTPS
- **PesaPal signature validation**: Verify all webhook signatures
- **Idempotency**: Handle duplicate payment notifications
- **Amount validation**: Verify payment amount matches expected amount

### Refund Security

- **Admin-only**: Only admins can create/approve refunds
- **Audit trail**: All refund actions logged in `audit_logs`
- **In-person verification**: User must visit office (prevents fraud)

---

## Admin Manual Adjustments

### Adjustment Capabilities

Admins can manually adjust subscriptions when needed (e.g., compensation for downtime, fixing errors):

- **Adjust expiration date**: Extend or reduce expiration date
- **Adjust months paid**: Add or remove months without payment
- **Activate/deactivate service**: Override automatic activation/deactivation
- **Apply/remove discount**: Manually assign or revoke discount eligibility
- **Add complimentary months**: Grant free service months

### Audit Logging

All admin adjustments logged in `audit_logs` table:

```
audit_logs:
  - log_id (UUID, primary key)
  - actor_id (UUID, admin user_id)
  - actor_type (enum: admin, system)
  - action (string) - e.g., "adjusted_expiration", "added_months", "applied_discount"
  - entity_type (string) - e.g., "service_subscription", "discount"
  - entity_id (UUID)
  - old_value (jsonb, nullable) - previous state
  - new_value (jsonb, nullable) - new state
  - reason (text) - admin-entered explanation
  - timestamp (timestamp)
```

### Adjustment Flow

1. Admin navigates to business subscription details
2. Admin selects "Manual Adjustment"
3. System displays current values (months_paid, expiration_date, status)
4. Admin modifies values
5. Admin enters reason for adjustment (required)
6. System validates changes
7. System updates subscription
8. System logs adjustment in `audit_logs`
9. System sends notification to business owner

**Security**: Only Super Admin and Admin roles can make manual adjustments; Support Staff cannot.

---

## MVP Exclusions (Post-Launch)

- Automated refund disbursement (M-Pesa, bank transfer)
- Subscription auto-renewal
- Payment plans (installments)
- Discount codes (user-entered promo codes)
- Gift cards / vouchers
- Bulk discounts (e.g., 10% off if buying 12 months)
- Direct M-Pesa integration
- Credit/debit card storage for recurring payments

---

## Dependencies

- **Payment Gateway**: PesaPal API
- **Database**: PostgreSQL 15+
- **Notifications**: VintEx (SMS), Mailgun (Email)
- **PDF Generation**: Library for receipt PDF generation (e.g., PDFKit, Puppeteer)

---

## Testing Requirements

### Unit Tests
- Service subscription calculations (months, expiration dates)
- Discount application logic
- VAT calculation
- Refund amount calculation
- Fee lookup

### Integration Tests
- Complete payment flow (initiate → PesaPal → webhook → subscription update)
- Refund flow (request → approve → complete → subscription update)
- Service expiration and deactivation
- Multi-service purchase in single transaction

### E2E Tests
- User purchases website hosting → website becomes accessible
- User purchases 6 months → adds 3 more months → expiration date extends correctly
- Service expires → website becomes inaccessible → user renews → website reactivates
- User requests refund → admin processes → months deducted correctly

---

**End of PRD-02**
