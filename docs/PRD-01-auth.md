# PRD-01: Authentication & User Management

**Product Requirements Document**
**Version**: 1.0
**Last Updated**: Feb 21, 2026
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
  - phone (string, required, unique)
  - email (string, optional, unique if provided)
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

### 1. Passwordless Login (Primary - MVP)

**Flow:**
1. User enters phone number
2. System sends SMS OTP (6 digits, expires in 10 minutes)
3. User enters OTP
4. System validates OTP
5. System creates session (JWT token, 60-minute expiry)
6. System updates `last_active_at`

### 2. Password-Based Login (Optional)

**Flow:**
1. User sets password (min 8 chars, 1 uppercase, 1 number, 1 special char)
2. User logs in with phone + password
3. System validates credentials
4. System creates session

**MVP Note**: Password is optional; users can remain passwordless.

### 3. Google OAuth (Future)

**MVP**: Not implemented. Defer to post-launch.

---

## Session Management

### Session Table Schema

```
sessions:
  - session_id (UUID, primary key)
  - user_id (UUID, foreign key)
  - token (string, JWT)
  - expires_at (timestamp)
  - created_at (timestamp)
```

### Session Rules

- **Token type**: JWT stored in HTTP-only cookie
- **Storage**: PostgreSQL `sessions` table (connect-pg-simple)
- **Expiry**: 60 minutes
- **Refresh**: Not implemented in MVP; user re-authenticates after expiry
- **Logout**: Delete session record; clear cookie

**MVP Simplification**: No refresh tokens; no "remember me"; no max session duration.

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

---

## Password Recovery

**Flow:**
1. User requests password reset
2. System sends SMS OTP to registered phone
3. User enters OTP
4. User sets new password
5. System invalidates all existing sessions

**MVP Note**: Email recovery not implemented (email is optional).

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
- status (owner can deactivate; admin can suspend/delete)

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

- **Library**: next-intl
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
- `POST /api/auth/register` - User registration (creates account, sends OTP)
- `POST /api/auth/request-otp` - Request OTP for passwordless login
- `POST /api/auth/verify-otp` - Verify OTP and create session
- `POST /api/auth/login/password` - Password login
- `POST /api/auth/logout` - End session
- `POST /api/auth/password/reset` - Request password reset OTP
- `POST /api/auth/password/update` - Set new password

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
- Rate limit: 3 OTP per phone number per minute

### Session Security
- JWT tokens in HTTP-only cookies
- HTTPS only (enforced by Caddy)
- CSRF protection via SameSite cookie attribute

### Rate Limiting
- Login attempts: 25 per phone number per 15 minutes
- OTP requests: 10 per phone number per minute
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

## MVP Exclusions (Post-Launch)

- Google OAuth
- Biometric authentication
- Refresh tokens
- "Remember me" functionality
- Automated data export
- Email-based password recovery
- Multiple phone numbers per user
- User-initiated account deletion (must visit office)

---

**End of PRD-01**
