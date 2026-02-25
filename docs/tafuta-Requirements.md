# TAFUTA

**Kenyan Business Directory and Single Page Websites**

*Requirements Document v0.1*

---

## Document Information

**URL:** tafuta.ke
**API URL:** https://tafuta.ke/api
**Target Deployment:** Ubuntu 24 VPS, Node.js 22
**Legal Entity:** eBiashara Rahisi Ltd

---

## Executive Summary

Tafuta is a super simple low-cost business directory with single-page website hosting. It will be rolled out in Kenya and serve the low-end of the market. It also provides user and business identity management. It includes authentication, a payment hub, alerts/reminders, and a config panel for customers to manage their own content.

"I would rather make no money and create 10,000 jobs than make a boat load of money and have the economy continue to struggle." So please build me a platform that empowers businesses and creates jobs.

**Key Points:**

- Tafuta provides a business directory, web hosting, and business promotions (ads)
- User accounts are separate from business profiles. Users can manage one or more business profiles.
- Businesses can pay for website hosting, promotions, and services monthly or in advance. The system tracks the number of months of paid services per service type. The directory listing is free and always visible. Paid features (website hosting, promotions) will be deactivated when the payment period expires — alerts will be sent to business managers before expiration.
- The account will never be deactivated unless requested by the user.
- Refund process: users or businesses may request a partial or full refund of their unused prepaid services; refunds are cash-only, processed manually by Tafuta staff at the office; subject to a 5% processing fee; user must visit Tafuta office in person to request refund.
- Users (as business Owners) pay directly for business services. Payments can apply to multiple business profiles in one transaction.
- VAT (16%) is assessed at the time of payment. Refunds will reverse the appropriate amount of VAT.
- Progressive Web App (PWA) built with React SPA and Node.js backend
- PWA enables home screen installation on mobile devices for quick access
- Only PesaPal for service payments (v1.0)
- No records are physically deleted. All deletions are soft (flag-based). User PII is anonymized on deletion request; financial records are retained.

- **Pre-launch compliance requirements** — the following must be completed before launch, not after:
    1. Kenyan fintech and tax attorney review of the operating model (CBK, VAT Act, DPA 2019)
    2. ODPC registration (Kenya Data Protection Act 2019)
    3. Privacy Policy and Terms of Service published within the application
    4. KRA/ETR compliance assessment for VAT receipt generation
    5. `system_config` table populated with Tafuta's legal identity — eBiashara Rahisi Ltd (KRA PIN, VAT registration number, registered business name, business address)

---

## Project Overview

### Core Purpose

- Super simple business search for local Kenyan businesses. Based on categories and location (regions).
- Include landing pages based on specific categories of interest (e.g. restaurants, hotels, cybers, entertainment, churches, etc.)
- Click through to business website. Most businesses with a website will have a semi-custom domain (ex. dunge.machakos.tafuta.ke) and be hosted on the same server as tafuta.ke.
- Business identity and promotion
- RESTful API for backend

### Business Directory & Search

- Search functionality similar to Yelp (see reference images in docs/sample-images)
- **Main page**: displays entire list of businesses ordered by a Tafuta-defined ranking algorithm that:
    - Gives multiple businesses opportunity to be seen
    - Provides slight advantage to businesses that pay for promotion
- **Landing pages**: business list filtered by region or category based on URL parameters
- **Search bar**: users can type to filter results in real-time
- **Navigation**: users can click regions and categories to navigate to other landing pages or further filter results
- **Taxonomy structure (MVP)**: flat list for categories and regions
- **Category management**: categories created and managed by admin only (MVP)
- **Multiple categories**: businesses can select multiple categories (future: may charge for multiple category listings)
- **[Future]** User favorites: users can mark favorite businesses and share favorites with friends
- **[Future]** Favorite business handling: if a favorite business goes out of business, display "This business is no longer in business" message instead of removing from favorites list
- **Geographic scope (MVP)**: Machakos and Kisumu regions only
- **Region definition**: region includes the main town and all surrounding small towns where people travel to shop/eat (e.g., "Machakos" includes Machakos town and surrounding areas)
- **Multiple regions**: businesses can be listed in multiple regions (future: may charge for multiple region listings)
- **Geolocation**: precision based on what user enters in config panel; future: "use my current location" feature
- **Address fields**: city = business address; region = search/filter parameter; postal code (not zipcode) based on post office
- **[Future]** Local marketplaces, special events, WhatsApp business contact, and transportation integration

### Target Users

- Kenya public who need to find local businesses and services
- Kenyan business owners and professionals who need to promote their business
- Tafuta development team (manages all accounts, funds, and data) — assists customers with payments, account management, website content, and business promotion
- Platform administrators:
    - **Super Admin**: full system access
    - **Admin**: business and user management
    - **Support Staff**: customer assistance

### Key Constraints

- Progressive Web App (PWA) only (no native mobile apps)
- Mobile-first design (smartphones only, optimized for 3G) — does not need to look great on desktop
- **PWA caching strategy**: Network-first for all resources (static assets, business data, listings, ads)
- Always fetch fresh data from server first; fall back to cached data only when offline
- Minimal caching to ensure users see current business listings, ads, and content changes
- **Multi-language support**: Use i18next / react-i18next library for internationalization
- Support future languages (Swahili, Kikamba, Kikuyu, and others) without code changes
- Defaults to English if translations are missing
- All user-facing strings — including UI, menus, SMS templates, and email templates — must enable translation
- No hardcoded text; no automatic translation
- Translation will be handled by admin or user entering text for each language
- Business profiles support multiple languages; all fields support multi-language; most fields are optional
- Users/admins enter translations for business content via config panel
- Low-bandwidth optimization for Kenya network conditions
- Kenya-only service (no international/GDPR considerations for MVP)

---

## Functional Requirements

### User Management

#### Registration

- Phone number (required) and email (optional) registration
- Account is created first (with terms consent recorded), then OTP is sent to verify phone
- Collect: Full name (required), phone (required), email (optional), physical address (optional)
- Explicit consent to the current version of the Privacy Policy and Terms of Service is required at registration. The system records which version was accepted and the timestamp.
- Separate opt-in consent for marketing SMS at registration (distinct from transactional notifications). Users may change marketing preferences at any time via profile settings.
- Registration flow must clearly communicate what types of communications the user will receive, and what they will NOT receive if they opt out of marketing communications.
- Three verification tiers assigned manually by admin:
    - **Unverified** — default for all new accounts
    - **Basic** — automatically assigned upon verification of phone number
    - **Verified** — admin has confirmed user identity using any method Tafuta staff deems necessary
    - **Premium** — admin has confirmed high-trust status
    - In v1.0: tiers are informational indicators for internal team use only; no functional difference in system behavior between tiers.
- Generate UUID for each user
- Business entity management — users have a many-to-many relationship with businesses; each relationship carries one of the following roles:
    - **Owner** — full control of the business account; can make payments for business services
    - **Admin** — can manage business settings and linked users but is not the "owner" of the business
    - **Employee** — can manage business profile and website content/images; limited access; full permissions defined in PRD-01
- User verification is separate from business verification
- Business verification tiers (basic, verified, premium) assigned manually by admin; verified businesses display a "verified" icon next to their listing

#### Authentication

- Password-based login with strong password requirements
- Passwordless login via SMS OTP or email OTP
- Session management: follow industry best practices for user convenience and security (implementation details in PRD-01)
- Password recovery via SMS OTP
- Security-critical communications (OTP, login alerts, account security notices) are always delivered regardless of notification preferences. These cannot be opted out of.
- Marketing SMS and email: opt-in only; user-controlled at any time
- Future: Google OAuth, biometric authentication on compatible devices

#### Profile Management

- View and edit personal information
- Optional profile photo upload (max 2MB, JPEG/PNG)
- Language preference selection
- Notification preferences management:
    - Security-critical notifications (OTP, login alerts): always delivered; cannot be opted out of
    - Marketing SMS and email: opt-in only; user-controlled at any time
    - In-app notifications are always displayed regardless of SMS/email preferences
- Three account states available to users:
    - **Active**: full access
    - **Deactivated** (user self-service): user pauses their own account; no actions available except reactivation; user may reactivate at any time without admin involvement; balance/payments are preserved
    - **Deleted** (user request, admin executes): permanent; PII anonymized; account cannot be recovered; financial records retained
- List of business profiles accessible to the user — can activate/deactivate/manage each
- If the Terms of Service or Privacy Policy has been updated since last consent, user is prompted to review and re-consent before accessing the application

#### Business Profile Management

- Create, view, and edit business profile information
- **Business data storage**: all editable content (profile, contact, location, hours, website sections) stored in `content_json` field (PostgreSQL jsonb)
- **Indexed fields**: business name, category, region duplicated in separate columns for search/filtering performance
- **Version tracking**: every content update creates a new version in `business_content_history` table with change summary, timestamp, and user who made the change
- **Rollback capability**: owners and admins can restore previous versions of content; rollback creates new version (doesn't delete history)
- Link users to a business with a role (Owner, Admin, Employee) — permission-based
- Role-based many-to-many relationship between users and businesses
- Business verification tier (basic, verified, premium) is independent of any linked user's tier; assigned manually by admin
- Business status options:
    - **Pending**: new business awaiting admin approval
    - **Active**: business is operating normally
    - **Deactivated**: temporary, user-initiated by Owner; business not listed; website disabled
    - **Out of business**: business has permanently closed; marked by owner or admin; business not listed but record preserved for user favorites
    - **Suspended**: admin-initiated; business not listed; website disabled; only admin can lift suspension
    - **Deleted**: soft delete; follows same policy as user deletion
- When Owner deactivates business, system prompts for reason (e.g., "Going out of business", "Temporary closure", "Other")
- When business is marked "out of business", users who favorited it see "This business is no longer in business" instead of record disappearing
- Business deletion follows the same soft-delete and financial record retention policy as users

See PRD-01 and PRD-02 for detailed schema.

### Business Website Hosting

- **Single-page website**: template-based with 1 template in MVP (reference: https://heartofkenya.com/machakos/doreenbeautyparlour)
- **Content storage**: all business profile and website content stored in a `content_json` field (PostgreSQL jsonb) in the businesses table
- **Version history**: separate `business_content_history` table tracks all content changes with full version history and rollback capability
- **Multi-language**: business content supports multiple languages; users enter translations via config panel; all stored in same JSON structure
- **Website generation**: `content_json` field used to dynamically generate the single-page website
- **Subdomain structure**: semi-custom subdomains (e.g., businessname.machakos.tafuta.ke)
- **Subdomain uniqueness**: first person to claim a subdomain wins; app recommends alternatives if taken; user can customize as long as it doesn't already exist
- **DNS management**: automated via Cloudflare API calls from backend (details in PRD-06)
- **SSL certificates**: handled by Caddy (details in PRD-06)
- **Images**: uploaded through config panel; stored on VPS disk; served directly from VPS; formats: JPEG, PNG, WebP; no videos in MVP; no image optimization/compression in MVP
- **Contact forms**: not included in MVP
- **Basic template**: does not include product/image gallery
- **Image gallery service**: businesses paying for image gallery service can include up to 50 product/service images
- **Payment lapse behavior**: when business reaches end of paid services period, website and promotions are automatically deactivated
- **Storage/bandwidth limits**: not enforced in MVP
- **Concurrent edits**: last write wins (no conflict resolution in MVP)

#### Business Management Dashboard (Config Panel)

- Unified config panel accessible at `/config`
- Organized with tabs/sections for:
    - Business profile content management
    - Website content management
    - Multi-language content entry
    - Image uploads
    - Ad creation and management
    - Service subscription management
- Access: all logged-in users (Owner/Admin/Employee) can access config panel; permissions determine visibility of sections

#### Service Payment Management

- Display: number of months of paid services per service type
- Transaction history with filtering and search
- Payment flow: simple and user-friendly (details in PRD-02)

#### Service Purchases

- PesaPal integration for purchasing services
- A **purchase receipt** is generated at the time of purchase documenting the KES amount paid and services purchased. This is a VAT receipt.
- Refund process:
    - Users or businesses may request a refund of some or all of their unused prepaid services (partial refunds are permitted)
    - User visits Tafuta office in person to request refund (no user-facing refund request form in MVP)
    - Tafuta Admin records refund request in the application specifying the amount to refund
    - System adjusts the number of months of prepaid services
    - Admin processes refund manually: deducts 5% processing fee, records transaction, provides cash disbursement
    - Refund is paid in cash by Tafuta staff at the Tafuta office (no automated payment system for refunds in v1.0)
    - User receives notification when refund is processed
- Future: additional payment gateways (M-Pesa, Airtel Money); digital refund disbursement

### Service Types & Pricing

- **Free tier**: basic directory listing appears in search results only; no clickable link; no dedicated page; no subdomain
- **Paid services** (monthly subscription or prepaid):
    - **Website hosting**: single-page website with semi-custom subdomain (e.g., businessname.machakos.tafuta.ke); example: 200 KES/month
    - **Ads**: promotional ads displayed in search results and business listings; can appear in different categories or on home page; priced per month
    - **Search ranking promotion**: causes business to appear in top 10% of search results more often (approximately 2x more likely); appears in organic results; priced per month
    - **Premium listing**: adds gold star icon to listing; payment covers Tafuta staff review every 6 months to verify business meets criteria; priced per month
    - **Image gallery**: allows up to 50 product/service images in business profile; separate service type; priced per month
- Service types: `website_hosting`, `ads`, `search_promotion`, `premium_listing`, `image_gallery`
- Businesses can purchase multiple services simultaneously

### Business Discounts

- **Eligibility**: businesses can qualify for discounts based on criteria (e.g., 5+ employees paid at or above minimum wage = 50% discount)
- **Determination**: Tafuta admin manually determines eligibility
- **Verification**: honor system verified by Tafuta staff
- **Multiple discounts**: businesses can have multiple discounts simultaneously
- **Application**: discounts apply to all services (MVP)
- **System tracking**: discount eligibility criteria, discount percentage, last review date, discount expiration date
- **Expiration behavior**: price increases at next payment event (not immediately)
- **Notifications**: system triggers notification to business before discount expires
- **Renewal**: discounts automatically removed upon expiration unless renewed by Tafuta staff

### Fee Schedule

- Configurable fees table maintained in the system
- Admin can update fee rates without code deployment
- Fee lookup at payment time uses **service_type**
- Additional fee entries can be added as new services are introduced
- Pricing examples (TBD — to be finalized before launch):
    - Website hosting: 200 KES/month
    - Other services: pricing to be determined

### System Configuration

- A `system_config` table stores key-value settings that are not secrets and may need to be updated without a code deployment
- Tafuta's legal identity, eBiashara Rahisi Ltd, is stored in `system_config` and used when generating VAT receipts:
    - `tafuta_business_name`
    - `tafuta_kra_pin`
    - `tafuta_vat_registration_number`
    - `tafuta_business_address`
    - `tafuta_business_registration_number`
- Infrastructure secrets (API keys, database credentials, JWT secrets) are stored in environment variables, not in `system_config`

### Messaging & Notifications

- VintEx SMS gateway integration
- Mailgun for email notifications
- In-app notification system
- Notification delivery rules:
    - **Security notifications** (OTP, login alerts, account security notices): always delivered; cannot be opted out of
    - **Transactional notifications** (purchase confirmed, refund processed, promo granted, promo expiry warning, promo voided): delivered via SMS and/or email; user may manage channel preferences
    - **Marketing notifications**: opt-in only; Tafuta central team sends via admin notification tools
    - **In-app notifications**: always displayed regardless of SMS/email preferences
- Marketing SMS: sent by Tafuta central team only via admin notification tools
- All message templates use language translation based on user preferences
- User notification preferences managed via profile settings
- Notification history: system logs all messages sent to users

### Administrative Features

- Dashboard with key metrics (users, business profiles, transactions, payments, revenue by service_type, etc.)
- User search, filtering, and profile viewing
- Manual user and business verification tier assignment (basic / verified / premium)
- Business search, filtering, and profile viewing
- Account management:
    - **Suspend user or business** (admin-initiated): blocks login and all transactions; user sees message to contact Tafuta; only admin can lift suspension
    - **Reinstate suspended account**: admin restores access
    - **Process deletion request**: admin anonymizes PII and sets `is_deleted`; financial records retained
- Refund request queue — records the cash disbursement amount and date
- Transaction reports and CSV export
- Fee schedule management — add, update, deactivate fee entries; configure service_type fee table
- Terms and Privacy Policy management:
    - PP and ToS content is stored as static HTML files deployed with the application; the app manages version numbers only, not the content itself
    - When content is updated, the admin decides whether the change is material enough to warrant a new version number; only bumping the version number triggers re-consent for all users on next login
    - If the admin does not bump the version, no re-consent is triggered — this is the mechanism for distinguishing material changes from cosmetic fixes
    - Version history is retained for audit purposes
- FUTURE: MVP will not implement system configuration management UI — `system_config` values must be updated manually in database

---

## Non-Functional Requirements

### Usability

- Mobile-first responsive design (320px to 4K)
- WCAG 2.1 Level AA accessibility
- Clear, simple language for target audience
- Language translations framework (approach deferred to PRD-01/PRD-06)
- Public search must provide rapid lookup while user types into search
- Search also allows quick selection of categories and regions/locations

### Data Retention & Account States

- No records are physically deleted from the database
- Account states for users and businesses:

    | State | Initiated By | Reversible By | Transactions | Login |
    |---|---|---|---|---|
    | Active | — | — | Yes | Yes |
    | Deactivated | User (self-service) | User (self-service) | No | No |
    | Suspended | Admin | Admin only | No | No |
    | Deleted | User request / Admin executes | Not reversible | No | No |

- On deletion: PII (name, email, phone, address, photo) is anonymized; `is_deleted = true`; financial records (transactions, receipts, refund history) are retained linked to the pseudonymous `user_id`
- Users can request data export (download their data) before deletion
- Financial records and any data required for legal compliance retained for a minimum of 7 years to meet Kenyan tax law obligations

---

## Technical Architecture

### Technology Stack

- **Backend**: Node.js 22 with Express.js
- **Database**: PostgreSQL 15+
- **Session storage**: PostgreSQL (connect-pg-simple)
- **Frontend**: React 18+ SPA
- **Build tool**: Vite
- **Internationalization**: i18next / react-i18next
- **Reverse proxy & SSL**: Caddy
- **DNS management**: Cloudflare API
- **Authentication**: jsonwebtoken (JWT), bcrypt
- **Logging**: Winston
- **Process manager**: PM2

**Note**: Technology stack optimized for lightweight, mobile-first, low-bandwidth performance.

### Ads & Promotions

- Businesses can purchase ads to promote their business on Tafuta
- **Ad content**: stored in single JSON file per ad (on VPS disk); references one image located in images/ads folder
- **Ad templates**: template-based; MVP includes standard ad templates
- **Ad creation**: created through config panel by business owner/admin or by Tafuta admin
- **Ad association**: each ad is associated with a business profile
- **Ad payment**: paid for by business owner/admin in same manner as other services (monthly subscription)
- **Ad pricing**: cost per month (not per impression or per click)
- **Ad placement**: can appear in any business list, different categories, or home page
- **Ad rotation**: based on Tafuta-defined ranking algorithm
- **Ad analytics**: simple performance tracking (impressions and clicks)

### Search Ranking Algorithm

- **Single ranking engine**: one algorithm determines order of ads and listings
- **Ranking factors**: promotion status; rotation to ensure fairness
- **Promotion advantage**: promoted businesses appear in top 10% approximately 2x more often
- **Admin configurable**: ranking parameters can be adjusted by admin
- **MVP simplicity**: start with simple approach; iterate based on feedback

### Design and Colors

- Design should be modern and fun like the Joby app — it should appeal to Gen Z young adults in Kenya (images included in the sample-images folder)
- Main colors: deep orange (R:237, G:76, B:34) and black with a white background
- Incorporate the Tafuta-icon1 and/or Tafuta-logo1 from the sample-images folder

### Infrastructure

- Deployment: Ubuntu 24 VPS
- CDN: Cloudflare (static assets, DDoS protection)
- Zero-downtime reload via PM2; blue/green deployment strategy
- Staging environment (production-identical) for pre-launch validation
- CI/CD: GitHub Actions or GitLab CI

---

## Pre-Launch Compliance Checklist

The following items are launch gates — the application must not go live until all are complete:

- [ ] Kenyan fintech and tax attorney review: CBK operating model, VAT Act compliance, DPA 2019 obligations
- [ ] ODPC registration completed (Kenya Data Protection Act 2019)
- [ ] KRA/ETR compliance assessment: confirm whether Tafuta's revenue requires Electronic Tax Register-linked receipts
- [ ] Privacy Policy drafted, reviewed, and published in the application
- [ ] Terms of Service drafted, reviewed, and published in the application
- [ ] VAT receipt format confirmed as compliant with KRA requirements
- [ ] `system_config` table populated with Tafuta's legal identity (KRA PIN, VAT registration number, registered business name, address)

---

## Document Structure

```
/docs
├── tafuta-Requirements.md   ← This document
├── PRD-01-auth.md           ← Authentication & User Management
├── PRD-02-payments.md       ← Payments, Services & Transactions
├── PRD-03-api.md            ← API & Integration Reference
├── PRD-04-ui-ux.md          ← User Interface & Experience
├── PRD-05-admin.md          ← Admin Dashboard & Configuration
└── PRD-06-infrastructure.md ← Infrastructure, Testing & DevOps
```
