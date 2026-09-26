# PRD-01: Authentication & User Management

**Product Requirements Document**
**Version**: 1.1
**Last Updated**: Mar 5, 2026
**Status**: Draft

---

## Overview

This PRD defines authentication, user management, and business profile management for Tafuta MVP. Focus is on simplicity and core functionality needed for launch.

---

## User Model

### User Table Schema

```
users:
  - user_id (UUID, primary key)
  - full_name (string, required)
  - nickname (string, optional) - preferred name for friendly communications
  - phone (string, nullable, unique) — required for SMS OTP login; nullable for Google OAuth users who have not provided a phone
  - email (string, optional, unique if provided)
  - google_id (string, nullable, unique) — Google OAuth subject identifier; set on first Google login
  - password_hash (string, nullable - null for passwordless users; uses bcrypt with embedded salt)
  - verification_tier (enum: unverified, basic, verified, premium)
  - language_preference (string, default: 'en')
  - profile_photo_url (string, nullable)
  - status (enum: active, deactivated, suspended, deleted)
  - status_changed_at (timestamp)
  - created_at (timestamp)
  - last_active_at (timestamp)
```

### Verification Tiers

- **Unverified**: Default for all new accounts
- **Basic**: Auto-assigned after phone verification
- **Verified**: Admin manually confirms identity
- **Premium**: Admin manually confirms high-trust status

**MVP Note**: Tiers are informational only; no functional differences in MVP.

---

## Business Model

### Business Table Schema

```
businesses:
  - business_id (UUID, primary key)
  - business_name (string, required) - duplicated from content_json for search/indexing
  - category (string, required) - duplicated from content_json for filtering
  - region (string, required) - duplicated from content_json for filtering
  - subdomain (string, unique, nullable) - only for paid hosting
  - logo_url (string, nullable) - primary logo URL
  - verification_tier (enum: basic, verified, premium)
  - status (enum: pending, active, deactivated, out_of_business, suspended, deleted)
  - status_changed_at (timestamp)
  - deactivation_reason (string, nullable)
  - rejection_reason (string, nullable) - reason if business rejected during approval
  - approved_by (UUID, nullable) - admin user_id who approved
  - approved_at (timestamp, nullable)
  - content_json (jsonb) - all editable business profile and website content
  - content_version (integer, default: 1) - current version number
  - created_at (timestamp)
  - updated_at (timestamp)
```

**Content JSON Structure:**

The `content_json` field contains all editable business profile and website content in a structured format. This design enables future AI-assisted content management and provides flexibility for adding new fields without schema migrations.

```json
{
  "profile": {
    "en": {
      "business_name": "Doreen Beauty Parlour",
      "tagline": "Professional hair and beauty services",
      "description": "We offer professional hair styling, braiding, makeup, and nail services for all occasions.",
      "services": ["Hair styling", "Braiding", "Makeup", "Nail services"]
    },
    "sw": {
      "business_name": "Doreen Beauty Parlour",
      "tagline": "Huduma za nywele na urembo wa kitaalamu",
      "description": "Tunatoa huduma za kitaalamu..."
    }
  },
  "contact": {
    "phone": "+254712345678",
    "email": "doreen@example.com",
    "whatsapp": "+254712345678"
  },
  "location": {
    "city": "Machakos Town",
    "street_address1": "Kenyatta Avenue",
    "street_address2": "Next to Machakos Bus Station",
    "zipcode": "90100"
  },
  "hours": {
    "monday": {"open": "08:00", "close": "18:00"},
    "tuesday": {"open": "08:00", "close": "18:00"},
    "wednesday": {"open": "08:00", "close": "18:00"},
    "thursday": {"open": "08:00", "close": "18:00"},
    "friday": {"open": "08:00", "close": "18:00"},
    "saturday": {"open": "08:00", "close": "18:00"},
    "sunday": {"closed": true}
  },
  "website": {
    "en": {
      "hero": {
        "title": "Welcome to Doreen Beauty Parlour",
        "subtitle": "Your beauty is our priority"
      },
      "about": {
        "title": "About Us",
        "content": "Established in 2020, Doreen Beauty Parlour has been serving Machakos..."
      },
      "services": {
        "title": "Our Services",
        "items": [
          {
            "name": "Hair Styling",
            "description": "Professional cuts, styling, and treatments",
            "price": "From 500 KES"
          }
        ]
      }
    },
    "sw": {
      "hero": {
        "title": "Karibu Doreen Beauty Parlour",
        "subtitle": "Uzuri wako ni kipaumbele chetu"
      }
    }
  },
  "metadata": {
    "last_updated": "2026-02-22T20:00:00Z",
    "updated_by": "owner"
  }
}
```

**Note**: Fields like `business_name`, `category`, and `region` are duplicated in both the main table columns and `content_json` for performance (indexing/filtering). The `content_json` version is the source of truth for display.

### Business Content History Table

```
business_content_history:
  - history_id (UUID, primary key)
  - business_id (UUID, foreign key)
  - content_json (jsonb) - snapshot of content at this version
  - content_version (integer) - version number
  - changed_by (UUID) - user_id who made the change
  - change_type (enum: owner_edit, admin_edit, ai_edit, approval, system)
  - change_summary (text, nullable) - brief description of changes
  - created_at (timestamp)
```

**Purpose**: Track all changes to business content for audit trail, version history, and rollback capability.

**Workflow**: When business content is updated:
1. Current version from `businesses.content_json` is saved to `business_content_history`
2. New content is written to `businesses.content_json`
3. `businesses.content_version` is incremented
4. `businesses.updated_at` is updated

**Future Use**: Enables AI-assisted content management by providing complete change history and rollback capability.

---

### User-Business Relationship

```
user_business_roles:
  - id (UUID, primary key)
  - user_id (UUID, foreign key)
  - business_id (UUID, foreign key)
  - role (enum: owner, admin, employee)
  - is_deleted (boolean, default: false)
  - created_at (timestamp)
```

**Roles:**
- **Owner**: Full control; can make payments; manage all users
- **Admin**: Manage settings and users (except owners)
- **Employee**: Manage content only; view-only for users

---

## Registration Flow

### User Registration

1. User provides: phone (required), full_name (required), nickname (optional), email (optional)
2. User accepts Terms of Service and Privacy Policy (required)
3. User opts in/out of marketing SMS (separate from transactional)
4. System creates user account with `verification_tier = 'unverified'`
5. System records consent in `user_terms_consent` table
6. System sends SMS OTP to phone number
7. User enters OTP
8. System verifies OTP and upgrades `verification_tier` to `'basic'`

**Phone Verification**: Phone is verified after account creation via OTP. The account exists in an unverified state until OTP is confirmed.

**Email Verification**: Email is optional and does not require verification in MVP. If provided, email is saved without verification.

**MVP Simplification**: No password required for initial registration; passwordless login via OTP.

### Business Registration

1. User (must be logged in) creates business profile
2. User provides: business_name, category, region, phone (required)
3. System creates business with `status = 'pending'`, `verification_tier = 'basic'`
4. System creates `user_business_roles` entry with `role = 'owner'`
5. System sends notification to owner: "Your business is pending approval. We'll notify you within 24 hours."
6. System notifies admin team of new pending business

**Approval Flow:**
- Business remains `status = 'pending'` until admin/staff approves
- Business NOT visible in public search/listings while pending
- Owner can view and edit pending business in config panel
- Admin reviews business details and approves or rejects

**If Approved:**
1. Admin sets `status = 'active'`, records `approved_by` and `approved_at`
2. System sends SMS/email to owner: "Your business [name] has been approved and is now live!"
3. Business becomes visible in public listings
4. Owner can update profile anytime without re-approval

**If Rejected:**
1. Admin keeps status as `pending` with `rejection_reason`
2. System sends notification to owner with rejection reason
3. Owner can edit and resubmit (updates trigger new review)

**MVP Note**: Once approved, subsequent profile updates do not require re-approval (build trust).

---

## Authentication Methods

### Identifier Field

All login methods accept a single **identifier** field that is either a phone number or an email address. The system detects the type by the presence of `@`:

- **Phone** (`+254…`) → OTP delivered via VintEx SMS; password lookup by phone column
- **Email** (`user@example.com`) → OTP delivered via Mailgun; password lookup by email column

### 1. OTP Login (Primary)

**Flow:**
1. User enters phone number or email address
2. System looks up user by phone or email
3. System generates 6-digit OTP, stores hashed copy in `otp_sessions` table (10-min expiry)
4. System delivers OTP:
   - Phone → VintEx SMS
   - Email → Mailgun transactional email ("Your Tafuta login code is: XXXXXX")
5. User enters OTP
6. System validates against stored hash; increments attempt counter; marks session used
7. System creates JWT session (60-minute expiry)
8. System updates `last_login_at`

### 2. Password-Based Login (Optional)

**Flow:**
1. User sets password (min 8 chars, 1 uppercase, 1 number, 1 special char)
2. User logs in with identifier (phone or email) + password
3. System looks up user by phone or email, validates bcrypt hash
4. System creates session

**Note**: Password is optional; users can remain passwordless.

### 3. Google OAuth

**Flow:**
1. User clicks "Continue with Google"
2. Browser redirects to `GET /api/auth/google` (Passport.js initiates consent)
3. Google returns authorization code to `GET /api/auth/google/callback`
4. Backend exchanges code, receives Google profile (email, name, google_id)
5. Account lookup order: by `google_id` → by `email` → create new account
6. If found by email and `google_id` not yet stored, `google_id` is saved
7. If creating new account: `phone = null`, `verification_tier = 'basic'`
8. Backend creates JWT, redirects to `{appUrl}/auth/google?token={JWT}&new={0|1}`
9. Frontend reads token from URL, stores in auth state
10. If `new=1` and account has no phone: show optional phone capture dialog

**Phone capture after Google login:**
- Dialog: "Would you like to add your phone number for SMS login? (optional)"
- If user provides phone: `PATCH /api/auth/google/phone` — validates format, checks uniqueness, saves to `users.phone`
- Skippable — phone is not required for Google-authenticated users

---

## Session Management

Auth is a single, stateless mechanism — a JWT sent via `Authorization: Bearer`. There is no server-side session store. (An earlier `express-session` + `connect-pg-simple` mechanism existed alongside this from the project's first commit but was never actually used for authorization — it was leftover scaffolding from an incomplete initial implementation of a cookie-based design that was never finished. It has since been removed; see "History" below.)

### Session Rules

- **Token type**: JWT (`jsonwebtoken`), signed with `JWT_SECRET`, expiry from `JWT_EXPIRY` env var (default `60m`)
- **Token delivery**: returned in the JSON response body on `/login` and `/verify-otp`, or as a `?token=` query param on the Google OAuth callback redirect — never set as a cookie
- **Frontend storage**: the frontend stores the JWT in `localStorage` and sends it as `Authorization: Bearer <token>` on every API request (`frontend/src/lib/api.js`)
- **Authorization check**: `requireAuth`/`optionalAuth` middleware (`backend/src/middleware/auth.js`) reads the `Authorization` header and does a stateless `jwt.verify()` (signature + expiry) — no database lookup
- **Expiry**: 60 minutes
- **Refresh**: Not implemented in MVP; user re-authenticates after expiry. See [Post-Login Redirect](#post-login-redirect) below — the frontend preserves the page the user was trying to reach before bouncing them to `/login`.
- **Logout**: `POST /api/auth/logout` (requires auth) logs a `logout` event to `auth_logs`. The frontend's `useAuthStore.logout()` calls this endpoint (best-effort) before clearing the token from `localStorage`. **Known limitation**: since the JWT is stateless and not blacklisted, a token already in a client's possession remains valid until natural expiry even after logout — logout clears local storage and logs the event, but does not revoke server-side access. True revocation (e.g. a token blocklist) is unimplemented and would be a separate feature.

**MVP Simplification**: No refresh tokens; no "remember me"; no max session duration; no JWT revocation/blacklist on logout.

### History: removed server-side session mechanism

The original scaffold (first commit) included `express-session` + `connect-pg-simple`, writing a copy of `{ token, userId }` to a `sessions` table (the generic connect-pg-simple `sid/sess/expire` schema) on every login, and Passport/Google OAuth was added later configured with `session: false` (i.e. explicitly independent of it). Nothing in the codebase ever read from that table for authorization or any other feature — `requireAuth` only used it as a fallback ahead of the `Authorization` header, and no request in practice relied on that fallback since the frontend never sent session cookies. It was removed (migration `024_drop_sessions_table.sql`, dependencies dropped from `backend/package.json`) since it added a DB write per login with no functional benefit. Login history and auditing were never dependent on it — see [Authentication & Security Logging](#authentication--security-logging) — so removal had no effect on audit capability.

### Post-Login Redirect

When an unauthenticated or expired request hits a protected/admin route — via the `ProtectedRoute`/`AdminRoute` guards, or a `401` from any API call while a session has expired mid-use — the frontend stores the originally-requested path (`pathname + search`) in `sessionStorage` under the key `postLoginRedirect` before sending the user to `/login`.

On successful login — password, OTP, or Google OAuth (including after the optional phone-capture step) — the app reads and clears that value, then navigates there; it falls back to `/dashboard` if nothing was stored.

`sessionStorage` (not React Router location state) is used deliberately: the Google OAuth flow does a full-page redirect out to Google and back, which router state does not survive.

Implementation: `frontend/src/lib/redirect.js`, invoked from `App.jsx` (route guards), `lib/api.js` (401 interceptor), `LoginPage.jsx`, and `GoogleCallbackPage.jsx`.

---

## Account States

### User Account States

| State | Who Can Set | Can Login | Can Revert |
|-------|-------------|-----------|------------|
| Active | System (default) | Yes | N/A |
| Deactivated | User (self-service) | No | User (self-service) |
| Suspended | Admin | No | Admin only |
| Deleted | Admin (after user request) | No | No (permanent) |

### Business Account States

| State | Who Can Set | Visible in Listings | Website Active |
|-------|-------------|---------------------|----------------|
| Pending | System (default for new) | No | No |
| Active | Admin (after approval) | Yes | Yes (if paid) |
| Deactivated | Owner | No | No |
| Out of business | Owner or Admin | No | No |
| Suspended | Admin | No | No |
| Deleted | Admin | No | No |

**Deactivation Prompt**: When Owner deactivates business, system prompts for reason: "Going out of business", "Temporary closure", "Other".

**Note on Suspended/Deleted**: an admin at `admin` level or higher can move a business between any of `pending`/`active`/`suspended`/`deleted` from a single "Change Status" control — a reason is required and every change is logged to the audit trail (see [PRD-14](PRD-14-business-status-management.md)). So in practice these two states are admin-reversible, not permanent: the table above records who can set each state on the happy path, not a hard restriction on reversal. `Deactivated` and `Out of business` remain unimplemented (no owner self-service exists yet for any business status change).

---

## Password Recovery

**Flow:**
1. User requests password reset (enters phone or email identifier)
2. System sends OTP via SMS (phone) or Mailgun email
3. User enters OTP
4. User sets new password
5. System invalidates all existing sessions

---

## Profile Management

### User Profile

**Editable fields:**
- full_name
- nickname (optional)
- email (optional)
- language_preference
- profile_photo (max 2MB, JPEG/PNG)

**Notification preferences:**
- marketing_sms_opt_in (boolean)
- marketing_email_opt_in (boolean)

**Non-editable:**
- phone (contact admin to change)
- verification_tier (admin only)

### Business Profile

**Editable by Owner/Admin:**
- business_name, description, category, region
- Contact info (phone, email, website_url)
- Address fields
- logo_url

**Editable by Owner only:**
- subdomain (if website hosting paid)
- User role assignments

**Non-editable:**
- verification_tier (admin only)
- status (owner can deactivate; admin can set to any status — pending/active/suspended/deleted — see [PRD-14](PRD-14-business-status-management.md))

---

## Permissions Matrix

| Action | Owner | Admin | Employee |
|--------|-------|-------|----------|
| Edit business profile | ✓ | ✓ | ✓ |
| Upload images | ✓ | ✓ | ✓ |
| Manage website content | ✓ | ✓ | ✓ |
| Create/edit ads | ✓ | ✓ | ✗ |
| Make payments | ✓ | ✗ | ✗ |
| Add/remove Employees | ✓ | ✓ | ✗ |
| Add/remove Admins | ✓ | ✓ | ✗ |
| Add/remove Owners | ✓ | ✗ | ✗ |
| Deactivate business | ✓ | ✗ | ✗ |
| View user list | ✓ | ✓ | ✓ (read-only) |

**Platform admin override:** the columns above are business-level roles (`user_business_roles`), distinct from platform admin levels (`admin_users.role`; see [PRD-05](PRD-05-admin.md)). A platform admin at `admin` level or higher can reassign a business's owner via the Admin Console regardless of the business-level table above — see [PRD-13](PRD-13-business-owner-transfer.md). This removes the previous owner's access to the business entirely, since there is currently no UI to manage a demoted owner's continued staff access. The same `admin`-level bar also gates changing a business's status (including soft-delete) to any other status — see [PRD-14](PRD-14-business-status-management.md).

---

## Data Retention & Deletion

### User Deletion

**Process:**
1. User requests deletion (must visit Tafuta office in person for MVP)
2. Admin executes deletion in system
3. System anonymizes PII:
   - full_name → "Deleted User [user_id]"
   - phone → null
   - email → null
   - profile_photo_url → null
4. System sets `status = 'deleted'`
5. System retains: user_id, transactions, financial records (7 years minimum)

### Business Deletion

**Process:**
1. Owner requests deletion OR admin initiates
2. System follows same anonymization as user deletion
3. Business content (JSON files, images) retained but not publicly accessible
4. Financial records retained (7 years minimum)

**MVP Note**: No automated data export; user must request manually.

---

## Terms of Service & Privacy Policy

### Consent Tracking

```
terms_versions:
  - version_id (UUID, primary key)
  - document_type (enum: privacy_policy, terms_of_service)
  - version_number (string, e.g., "1.0")
  - notes (text)
  - published_at (timestamp)
  - published_by (UUID, admin user_id)

user_terms_consent:
  - consent_id (UUID, primary key)
  - user_id (UUID, foreign key)
  - version_id (UUID, foreign key)
  - consented_at (timestamp)
```

### Re-consent Flow

1. Admin publishes new version (bumps version_number)
2. On next login, system checks if user has consented to latest version
3. If not, system blocks access until user reviews and accepts
4. System records new consent in `user_terms_consent`

**MVP Note**: ToS and Privacy Policy are static HTML files deployed with app; system only tracks version numbers.

---

## Multi-Language Support

### Implementation

- **Library**: i18next / react-i18next
- **Default language**: English
- **Supported languages (MVP)**: English, Swahili, Kikamba, Kikuyu
- **Translation method**: Manual entry by admin/users (no automatic translation)
- **Fallback**: If translation missing, display English

### User Language Preference

- Stored in `users.language_preference`
- User can change via profile settings
- Applies to: UI, notifications, email templates, SMS templates

### Business Content Language

- Business profiles support multi-language content
- Users enter translations via config panel
- All fields support multi-language (stored in JSON)

**MVP Note**: UI translations managed by admin; business content translations managed by business owners.

---

## Notification Preferences

```
notification_preferences:
  - pref_id (UUID, primary key)
  - user_id (UUID, foreign key)
  - marketing_sms_opt_in (boolean, default: false)
  - marketing_email_opt_in (boolean, default: false)
  - updated_at (timestamp)
```

### Notification Rules

**Cannot opt out:**
- OTP codes
- Login alerts
- Account security notices
- Business approval/rejection notifications

**Can opt out:**
- Marketing SMS
- Marketing emails

**Always delivered:**
- In-app notifications (regardless of SMS/email preferences)

---

## API Endpoints (Summary)

### Authentication
- `POST /api/auth/register` - User registration (creates account, sends OTP to phone)
- `POST /api/auth/request-otp` - Request OTP; body: `{ identifier }` (phone or email)
- `POST /api/auth/verify-otp` - Verify OTP; body: `{ identifier, otp }`
- `POST /api/auth/login` - Password login; body: `{ identifier, password }`
- `POST /api/auth/logout` - End session
- `POST /api/auth/password/reset` - Request password reset OTP; body: `{ identifier }`
- `POST /api/auth/password/update` - Set new password
- `GET /api/auth/google` - Initiate Google OAuth (browser redirect)
- `GET /api/auth/google/callback` - Google OAuth callback (handled server-side)
- `PATCH /api/auth/google/phone` - Save phone number after Google login (optional; requires auth)

### User Profile
- `GET /api/users/me` - Get current user profile
- `PATCH /api/users/me` - Update profile
- `POST /api/users/me/photo` - Upload profile photo
- `PATCH /api/users/me/preferences` - Update notification preferences
- `POST /api/users/me/deactivate` - Deactivate account
- `POST /api/users/me/reactivate` - Reactivate account

### Admin - Auth Logs
- `GET /api/admin/auth-logs` - View authentication logs (admin only)

### Business Profile
- `POST /api/businesses` - Create business (status = pending)
- `GET /api/businesses/:id` - Get business details
- `PATCH /api/businesses/:id` - Update business
- `POST /api/businesses/:id/logo` - Upload logo
- `POST /api/businesses/:id/deactivate` - Deactivate business
- `GET /api/businesses/:id/users` - List users linked to business
- `POST /api/businesses/:id/users` - Add user to business
- `PATCH /api/businesses/:id/users/:user_id` - Update user role
- `DELETE /api/businesses/:id/users/:user_id` - Remove user from business

### Admin - Business Approval
- `GET /api/admin/businesses/pending` - List pending businesses (admin only)
- `POST /api/admin/businesses/:id/approve` - Approve business (admin only)
- `POST /api/admin/businesses/:id/reject` - Reject business with reason (admin only)

**Detailed API specs**: See PRD-03-api.md

---

## OTP Sessions Table

```
otp_sessions:
  - id (bigserial, primary key)
  - identifier (string) — phone or email that requested the OTP
  - otp_hash (string) — SHA-256 of the 6-digit code
  - expires_at (timestamptz) — 10 minutes from creation
  - attempts (integer, default: 0) — number of failed verification attempts
  - used (boolean, default: false) — true after successful verification
  - created_at (timestamptz)
```

**Rules:**
- A new session is created on each OTP request; old unexpired sessions for the same identifier are still valid but superseded
- After `attempts >= 5`, the session is invalid (user must request a new OTP)
- Sessions expire automatically; a cleanup job or query filter handles stale rows

---

## Security Requirements

### Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number
- At least 1 special character
- **Hashing**: bcrypt (cost factor 10) with embedded salt; no separate salt column needed

### OTP Requirements
- 6 digits
- 10-minute expiry
- Max 5 attempts before new OTP required
- Rate limit: 3 OTP per identifier (phone or email) per minute
- Storage: hashed in `otp_sessions` table (see above)
- Delivery: VintEx SMS for phone identifiers; Mailgun for email identifiers

### Session Security
- JWT tokens in HTTP-only cookies
- HTTPS only (enforced by Caddy)
- CSRF protection via SameSite cookie attribute

### Rate Limiting
- Login attempts: 25 per identifier per 15 minutes
- OTP requests: 10 per identifier per minute
- Registration: no rate limit

### Safety Limits
- Max 30 failed OTP requests in a row locks account for 24 hours
- Max 50 failed login attempts in a row locks account for 24 hours

---

## Authentication & Security Logging

### Auth Logs Table Schema

```
auth_logs:
  - log_id (UUID, primary key)
  - user_id (UUID, nullable) - null for failed attempts before user identified
  - phone (string, nullable) - for failed login attempts
  - event_type (enum: login_success, login_failed, otp_requested, otp_failed, password_reset, account_state_changed, account_locked)
  - ip_address (string)
  - user_agent (string)
  - metadata (jsonb, nullable) - additional context (e.g., failure reason, login method)
  - timestamp (timestamp)
```

### Events to Log

**Successful events:**
- Login success (OTP or password)
- OTP requested
- Password reset completed
- Account state changed (active ↔ deactivated)

**Failed events:**
- Login failed (invalid OTP, wrong password)
- OTP failed (invalid code, expired)
- Account locked (too many failed attempts)

**Logged data:**
- User ID (if known)
- Phone number (for failed attempts)
- IP address
- User agent (browser/device info)
- Timestamp
- Event-specific metadata (e.g., "wrong_password", "expired_otp")

### API Endpoint

- `GET /api/admin/auth-logs` - View auth logs (admin only, with filtering by user_id, phone, event_type, date range)

---

## Testing Requirements

### Unit Tests
- User registration flow
- OTP generation and validation
- Password hashing and validation
- Session creation and validation
- Permission checks for all roles

### Integration Tests
- Complete registration flow (register → OTP → account verified)
- Login flows (OTP and password)
- Business creation and user role assignment
- Account state transitions (active → deactivated → active)

### E2E Tests
- User registers → creates business → adds employee → employee logs in
- User deactivates account → reactivates account
- Owner deactivates business → business not visible in listings

---

## Post-Launch (Not in current scope)

- Biometric authentication
- Refresh tokens
- "Remember me" functionality
- Automated data export
- Multiple phone numbers per user
- User-initiated account deletion (must visit office)

---

**End of PRD-01**
