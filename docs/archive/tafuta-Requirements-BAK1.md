# TAFUTA

**Kenyan Business Directory and single page websites**

*Requirements Document v0.1*

---

## Document Information

**URL:** tafuta.ke
**API URL:** https://tafuta.ke/api
**Target Deployment:** Ubuntu 24 VPS, Node.js 22
**Legal Entity:** eBiashara Rahisi Ltd

---

## Executive Summary

Tafuta is a super simple low cost business directory with single page website hosting. It will be rolled out in Kenya and serve the low-end of the market.  It also provides user and business identity management. It includes authentication, a payment hub, alerts/reminders and a config panel for customers to manage their own content.

**Key Points:**

-   Tafuta provides a business directory, web hosting, and business promotions (ads)
-   User accounts are separate from business profiles.Users can manage one or more business profiles.
-   Users can pay for website hosting, promotions, and services monthly or in advance. The system tracks the payment status and the number of months that have been paid for. The directory listing is free and always visible. Any special features or the website hosting will get turned off when payments run out - and alerts will be sent to the user/business managers. Users can pay their bill at any time to reactivate their services.

- The account will never be deactivated unless requested by the user.
-   Token refund: users or businesses may request a partial or full refund of their unused balance; refunds are cash-only, processed manually by Tafuta staff at the office; subject to a 5% processing fee.
-   Money cannot be transfered between users (accounts). Users make payments that get applied to their business profile. Uesrs can make payments that apply to multiple business profiles in one transaction.
-   VAT (16%) is assessed at the time payment. Refunds will reverse the appropriate amount of VAT.
-   React website with NodeJS backend
-   Only PesaPal for token purchases (v1.0)
-   No records are physically deleted. All deletions are soft (flag-based). User PII is anonymized on deletion request; financial records are retained.

-   **Pre-launch compliance requirements** — the following must be completed before launch, not after:
    1.  Kenyan fintech and tax attorney review of the operating model (CBK, VAT Act, DPA 2019)
    2.  ODPC registration (Kenya Data Protection Act 2019)
    3.  Privacy Policy and Terms of Service published within the application
    4.  KRA/ETR compliance assessment for VAT receipt generation
    5.  `system_config` table populated with Tafuta's legal identity - eBiashara Rahisi Ltd (KRA PIN, VAT registration number, registered business name, business address)

---

## Project Overview

### Core Purpose

-   Super simple business search for local Kenya businesses. Based on topics and location (regions).
-   Include landing pages based on specific topics of interest (e.g. restaurants, hotels, cybers, entertainment, churches, etc.)
- Click through to business website. Most buisnesses with a website will have a semi-custom domain (ex. dunge.machakos.tafuta.ke)and be hoseted on the same server as tafuta.ke.
-   Business identity and promotion
-   RESTful API for backend

### Target Users

-   Kenya public who need to find local businesses and services
Kenyan business owners and professionals who need to promote their business
-   Tafuta development team (manages all accounts, funds, and data) - assist customers with payments, account management, website content, and business promotion
-   Platform administrators

### Key Constraints

-   Mobile-first design (smartphones only, optimized for 3G) - does not need to look great on a desktop
-   Support future languages (Swahili, Kikamba, Kikuyu, and others) without code changes. Defaults to English if translations are missing. All user-facing strings — including UI, menus, SMS templates, and email templates — must enable translation. No hardcoded text. Translation will be handled by the admin or user entering text for each language (no translation engine involved)

-   Low-bandwidth optimization for Kenya network conditions

---

## Functional Requirements

### User Management

#### Registration

-   Phone number (required) and email (optional) registration

-   SMS OTP verification for phone numbers

-   Collect: Full name (required), phone (required), email (optional), physical address (optional)

-   Explicit consent to the current version of the Privacy Policy and Terms of Service is required before account creation. The system records which version was accepted and the timestamp.

-   Separate opt-in consent for marketing SMS at registration (distinct from transactional notifications). Users may change marketing preferences at any time via profile settings.

-   Registration flow must clearly communicate what types of communications the user will receive, and what they will NOT receive if they opt out of marketing communications.

-   Three verification tiers assigned manually by admin:
    -   **Unverified** — default for all new accounts
    -   **Basic** — phone number verified; automatically assigned upon verification of phone number
    -   **Verified** — admin has confirmed user identity
    -   **Premium** — admin has confirmed high-trust status
    -   In v1.0: tiers are informational indicators for internal team use only; no functional difference in system behaviour between tiers. 
-   Generate UUID for each user
-   Business entity management — users have a many-to-many relationship with businesses; each relationship carries one of the following roles:
    -   **Owner** — full control of the business account; the only role permitted to transfer tokens from their personal wallet to the business wallet (one-way)
    -   **Admin** — can manage business settings and linked users but is not the "owner" of the business
    -   **Employee** — limited access; permissions defined in PRD-01
-   Verification is for users only - business profiles do not require verification

#### Authentication

-   Login with Google (social auth)
-   Password-based login with strong password requirements
-   Passwordless login via SMS OTP or email OTP
-   Session management: 60-minute timeout with activity-based extension
-   Password recovery via SMS OTP or email OTP
-   Security-critical communications (OTP, login alerts, account security notices) are always delivered regardless of notification preferences. These cannot be opted out of.
-   Marketing SMS and email: opt-in only; user controlled at any time
-   Future: Biometric authentication on compatible devices (not for MVP)

#### Profile Management

-   View and edit personal information
-   Optional profile photo upload (max 2MB, JPEG/PNG)
-   Language preference selection
-   Notification preferences management:
    -   Security-critical notifications (OTP, login alerts, account security notices): always delivered; cannot be opted out of
    -   Marketing SMS and email: opt-in only; user controlled at any time
    -   In-app notifications are always displayed regardless of SMS/email preferences

-   Three account states available to users:
    -   **Active**: full access
    -   **Deactivated** (user self-service): user pauses their own account; no actions available except reactivation; user may reactivate at any time without admin involvement; balance/payments are preserved
    -   **Deleted** (user request, admin executes): permanent; PII anonymized; account cannot be recovered; financial records retained
-   List of business profiles accessible to the user — can activate/deactivate/manage each
-   If the Terms of Service or Privacy Policy has been updated since last consent, user is prompted to review and re-consent before accessing the application

#### Business Profile Management

-   Create, view, and edit business profile information
-   Business data includes: name, type/category, phone, email, URL, full address, geolocation coordinates (latitude/longitude)
-   Link users to a business with a role (Owner, Admin, Employee) — permission based
-   Role-based many-to-many relationship between users and businesses
-   Business verification tier (basic, verified, premium) is independent of any linked user's tier; assigned manually by admin
-   Business may be deactivated (temporary, user-initiated by Owner) or suspended (admin-initiated). Both prevent the business from being listed - disables the business website; only admin can lift a suspension.
-   Business deletion follows the same soft-delete + financial record retention policy as users
-   List of users linked to the business - owner can manage all business relationships to users - admin can manage all business relationships to admins and employees but not owners. Employees can see all business relationships but cannot manage them.


#### Account/Payment Management

-   Real-time balance display: paid balance and number of months prepaid
-   Transaction history with filtering and search
-   No transfer of payments/funds between users.

#### Token Acquisition

-   PesaPal integration for purchasing services
-   A **purchase receipt** is generated at the time of token purchase documenting the KES amount paid and services purchased. This is a VAT receipt.

-   Refund process:
    -   Users or businesses may request a refund of some or all of their unused paid services balance (partial refunds are permitted)
    -   Tafuta Admin records a refund request in the application specifying the amount to refund - system adjusts the balance of months of services or promotional items
    -   Admin processes the refund manually: deducts the 5% processing fee, records the transaction (see above), and provides the user with a cash disbursement
    -   Refund is paid in cash by Pamoja staff at the Tafuta office (no automated payment system for refunds in v1.0)
    -   User receives a notification when the refund is processed

-   Future: Additional payment gateways for token purchase (M-Pesa, Airtel Money); 
-   Future: Digital refund disbursement via PesaPal, M-Pesa, etc

### Fee Schedule

-   A configurable fees table is maintained in the system; admin can update fee rates without a code deployment
-   Fee lookup at payment time uses **service_type**. Tafuta looks up the applicable fee by matching `service_type`
-   Additional fee entries can be added as new Pamoja services and promotions are introduced

### System Configuration

-   A `system_config` table stores key-value settings that are not secrets and may need to be updated without a code deployment

-   Tafuta's legal identity, eBiashara Rahisi Ltd, is stored in `system_config` and used when generating VAT receipts:
    -   `tafuta_business_name`
    -   `tafuta_kra_pin`
    -   `tafuta_vat_registration_number`
    -   `tafuta_business_address`
    -   `tafutabusiness_registration_number`

-   Infrastructure secrets (API keys, database credentials, JWT secrets) are stored in environment variables, not in `system_config`

### Messaging & Notifications

-   VintEx SMS gateway integration (provided interface/example code)
-   Mailgun for email notifications
-   In-app notification system
-   Notification delivery rules:
    -   **Security notifications** (OTP, login alerts, account security notices): always delivered; cannot be opted out of
    -   **Transactional notifications** (purchase confirmed, refund processed, promo granted, promo expiry warning, promo voided): delivered via SMS and/or email; user may manage channel preferences
    -   **Marketing notifications**: opt-in only; Tafuta central team sends via admin tools
    -   **In-app notifications**: always displayed regardless of SMS/email preferences
-   Marketing SMS: sent by Tafuta central team only via admin notification tools.
-   All message templates use language translation based on user preferences
-   User notification preferences managed via profile settings

### API & App Integration

#### Authentication Model

-   Web users: JWT tokens in HTTP-only cookies
-   Short-lived JWT tokens (60 min)



### Administrative Features

-   Dashboard with key metrics (users, business profiles, transactions, payments, usage,revenue by serivce_type, etc)
-   User search, filtering, and profile viewing
-   Manual user and business verification tier assignment (basic / verified / premium)
-   Business search, filtering, and profile viewing
-   Account management:
    -   **Suspend user or business** (admin-initiated): blocks login and all transactions; user sees message to contact Pamoja; only admin can lift suspension
    -   **Reinstate suspended account**: admin restores access
    -   **Process deletion request**: admin anonymizes PII and sets `is_deleted`; financial records retained

-   Refund request queue — records the cash disbursement amount and date
-   Transaction reports and CSV export
-   Fee schedule management — add, update, deactivate fee entries; configure service_type fee table
-   Terms and Privacy Policy management:
    -   PP and ToS content is stored as static HTML files deployed with the application; the app manages version numbers only, not the content itself
    -   When content is updated, the admin decides whether the change is material enough to warrant a new version number; only bumping the version number triggers re-consent for all users on next login
    -   If the admin does not bump the version, no re-consent is triggered — this is the mechanism for distinguishing material changes from cosmetic fixes
    -   Version history is retained for audit purposes
-   FUTURE: MVP will not implement system configuration management — `system_config` values (Tafuta legal identity and other non-secret settings)

## Non-Functional Requirements

### Usability

-   Mobile-first responsive design (320px to 4K)
-   WCAG 2.1 Level AA accessibility
-   Clear, simple language for target audience
-   Language translations framework (approach deferred to PRD-01/PRD-05)
-   Public search must provide rapid lookup while user types into search
    - Search also allows quick selection of topics/categories and regions/locations

### Data Retention & Account States

-   No records are physically deleted from the database

-   **Account states for users and businesses** (implementation — single `status` field vs. flags — is a PRD-01 decision):

    | State | Initiated By | Reversible By | Transactions | Login |
    |---|---|---|---|---|
    | Active | — | — | Yes | Yes |
    | Deactivated | User (self-service) | User (self-service) | No | No |
    | Suspended | Admin | Admin only | No | No |
    | Deleted | User request / Admin executes | Not reversible | No | No |

-   On deletion: PII (name, email, phone, address, photo) is anonymized; `is_deleted = true`; financial records (transactions, receipts, refund history) are retained linked to the pseudonymous `user_id`

-   Financial records retained for a minimum of 7 years to meet Kenyan tax law obligations

## Technical Architecture

### Technology Stack

-   Backend: Node.js 22 with Express.js

-   Database: PostgreSQL 15+ (transactional data), Redis (cache/sessions)

-   Frontend: React 18+ with Next.js

-   Authentication: Passport.js with JWT

-   Background jobs: Bull (Redis-based queue)

-   Logging: Winston

-   Language translation framework (approach deferred to PRD-01/PRD-05)

### Ads
- Business can purchase ads to promote their business on Tafuta
- Ads are displayed in the search results
- Ads are displayed in the business profile
- Ads are displayed in the business listing
- Ads are displayed in the business category listing

### Infrastructure

-   Deployment: Ubuntu 24 VPS
-   CDN: Cloudflare (static assets, DDoS protection)
-   CI/CD: GitHub Actions or GitLab CI

### Database Schema (High-Level)

-   **users:** user_id, full_name, phone, email, password_hash, verification_tier, language_preference, profile_photo_url, status (active/deactivated/suspended/deleted), status_changed_at, created_at, last_active_at

-   **businesses:** business_id, business_name, business_type, phone, email, url, city, region, street_address1, street_address2, zipcode, lat_coord, long_coord, verification_tier, status (active/deactivated/suspended/deleted), status_changed_at, created_at

-   **user_business_roles:** id, user_id, business_id, role (owner/admin/employee), is_deleted, created_at

-   **balances:** business_id, service_type, paid_balance, status, timestamp

-   **transactions:** tx_id, business_id, service_type, transaction_type, amount, fee_amount, fee_id, vat_amount, receipt_id, reference_number, app_id, status, timestamp, notes

-   **receipts:** receipt_id, transaction_id, receipt_type (purchase/vat), entity_id, entity_type, amount_tokens, amount_kes, vat_rate, vat_amount, issued_at

-   **fees:** fee_id, fee_code, description, service_type (nullable — null matches any service type), rate, is_percentage, app_id (nullable — null applies to all apps), active, created_at

-   **promo_grants:** grant_id, wallet_id, token_amount, granted_by (admin user_id), expires_at, voided_at, created_at

-   **refund_requests:** request_id, wallet_id, requested_amount, fee_amount, net_refund_amount, status, transaction_id (set when processed), requested_at, processed_by, processed_at, notes

-   **spending_limits:** limit_id, wallet_id, app_id, limit_amount, period (daily/weekly/monthly), created_at, updated_at

-   **api_keys:** key_id, app_name, key_hash, scopes, active, created_at, last_used_at, created_by

-   **sessions:** session_id, user_id, token, expires_at

-   **system_config:** config_id, key, value, description, updated_at, updated_by

-   **terms_versions:** version_id, document_type (privacy_policy/terms_of_service), version_number, notes, published_at, published_by

-   **user_terms_consent:** consent_id, user_id, version_id, consented_at

-   **audit_logs:** log_id, actor_id, actor_type (user/admin/system), action, entity_type, entity_id, timestamp, metadata

-   **webhook_configs:** config_id, app_id, url, secret_hash, events, active, created_at

-   **notification_preferences:** pref_id, user_id, marketing_sms_opt_in, marketing_email_opt_in, updated_at

## Testing & Deployment

### Testing

-   Unit tests: 80% code coverage (Jest)

-   Integration tests: All API endpoints

-   E2E tests: Critical user flows (Cypress/Playwright)

-   Load testing: 2x expected peak load

-   Logging of all critical errors

-   Debug mode: log of all critical events and all errors

### Deployment

-   Blue-green deployment strategy

-   Staging environment (production-identical)

-   Database migrations with rollback capability

-   Automated smoke tests post-deployment

-   CI/CD documentation for automated deployments

## Documentation

-   Inline code documentation where needed

-   API documentation (OpenAPI/Swagger)

-   Intuitive UI design (minimal user documentation needed)

-   Privacy Policy and Terms of Service hosted within the Yangu application as static HTML files

## Pre-Launch Compliance Checklist

The following items are launch gates — the application must not go live until all are complete:

-   [ ] Kenyan fintech and tax attorney review: CBK operating model, VAT Act treatment of prepaid tokens, DPA 2019 obligations
-   [ ] ODPC registration completed (Kenya Data Protection Act 2019)
-   [ ] KRA/ETR compliance assessment: confirm whether Pamoja's revenue requires Electronic Tax Register-linked receipts
-   [ ] Privacy Policy drafted, reviewed, and published in the application
-   [ ] Terms of Service drafted, reviewed, and published in the application
-   [ ] VAT receipt format confirmed as compliant with KRA requirements
-   [ ] `system_config` table populated with Pamoja's legal identity (KRA PIN, VAT registration number, registered business name, address)

---

## Requirements/PRD Document Structure:
/docs
├── Yangu-REQUIREMENTS.md    ← This document
├── PRD-01-auth.md           ← Authentication & User Management
├── PRD-02-tokens.md         ← Token Wallet & Transactions
├── PRD-03-api.md            ← API, Integration & Webhooks
├── PRD-04-admin.md          ← Admin Dashboard & Configuration
└── PRD-05-infrastructure.md ← Deployment, Testing, DevOps
