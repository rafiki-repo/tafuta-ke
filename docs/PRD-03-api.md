# PRD-03: API & Integration

**Product Requirements Document**
**Version**: 1.0
**Last Updated**: Feb 21, 2026
**Status**: Draft

---

## Overview

This PRD defines the RESTful API, external integrations, and rate limiting for Tafuta MVP. The React SPA frontend communicates with the Node.js/Express backend exclusively via this REST API.

---

## API Design Principles

### REST Standards

- **Resource-based URLs**: `/api/businesses/:id` not `/api/getBusinessById`
- **HTTP methods**: GET (read), POST (create), PATCH (update), DELETE (soft delete)
- **Status codes**: 200 (success), 201 (created), 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found), 429 (rate limit), 500 (server error)
- **JSON format**: All requests and responses use JSON

### Response Format

All responses follow a consistent envelope structure:

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable message",
  "timestamp": "2026-02-21T20:00:00Z"
}
```

Error response:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Business name is required",
    "field": "business_name"
  },
  "timestamp": "2026-02-21T20:00:00Z"
}
```

### Pagination

List endpoints accept `?page=1&limit=20` and return:

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "pages": 8
  }
}
```

### API Versioning

- **MVP**: No versioning; all endpoints at `/api/*`
- **Future**: Version in URL path (`/api/v2/*`) when breaking changes are needed

---

## Authentication

### Session-Based Auth

- **JWT tokens** stored in HTTP-only cookies
- **Cookie name**: `tafuta_session`
- **Expiry**: 60 minutes
- **Secure flag**: true (HTTPS only)
- **SameSite**: Strict (CSRF protection)
- **Storage**: PostgreSQL sessions table via connect-pg-simple

All endpoints except public search/listings require authentication via the session cookie. Unauthorized requests receive a 401 response. Requests with insufficient role permissions receive a 403 response.

### Permission Model

Endpoint permissions are validated based on:
- User role for business endpoints (Owner / Admin / Employee — see PRD-01 permissions matrix)
- Admin role for admin endpoints (Super Admin / Admin / Support Staff — see PRD-05 permissions matrix)

---

## Endpoint Reference

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Create user account; sends OTP to verify phone |
| POST | `/api/auth/request-otp` | No | Request OTP for passwordless login |
| POST | `/api/auth/verify-otp` | No | Verify OTP; create session cookie |
| POST | `/api/auth/login/password` | No | Login with phone + password |
| POST | `/api/auth/logout` | Yes | End session; clear cookie |
| POST | `/api/auth/password/reset` | No | Request password reset OTP |
| POST | `/api/auth/password/update` | No | Set new password after OTP verification |

### User Profile

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users/me` | Yes | Get current user profile |
| PATCH | `/api/users/me` | Yes | Update profile (name, email, language, etc.) |
| POST | `/api/users/me/photo` | Yes | Upload profile photo (multipart/form-data) |
| PATCH | `/api/users/me/preferences` | Yes | Update notification preferences |
| POST | `/api/users/me/deactivate` | Yes | Self-deactivate account |
| POST | `/api/users/me/reactivate` | Yes | Reactivate deactivated account |

### Business Profile

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/businesses` | Yes | Create business (status = pending) |
| GET | `/api/businesses/:id` | Yes | Get business details including content_json |
| PATCH | `/api/businesses/:id` | Yes | Update business (saves version history) |
| POST | `/api/businesses/:id/photos` | Yes (Employee+) | Upload image: multipart with `file`, `image_type`, `image_name`, `transform` |
| GET | `/api/businesses/:id/photos` | Yes | List all images for a business (grouped by type) |
| PATCH | `/api/businesses/:id/photos/:slug` | Yes (Employee+) | Update transform params and regenerate WebP outputs |
| DELETE | `/api/businesses/:id/photos/:slug` | Yes (Owner/Admin) | Delete image: removes source, .jfx, and all WebP outputs |
| GET | `/api/photos/config` | No | Return parsed `app-config.jfx` (image types, sizes, limits) |
| POST | `/api/businesses/:id/deactivate` | Yes (Owner) | Deactivate business |
| GET | `/api/businesses/:id/users` | Yes | List users linked to business |
| POST | `/api/businesses/:id/users` | Yes | Add user to business by phone + role |
| PATCH | `/api/businesses/:id/users/:user_id` | Yes | Update user role |
| DELETE | `/api/businesses/:id/users/:user_id` | Yes | Remove user from business |

### Content History

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/businesses/:id/content` | Yes | Get current content_json only |
| GET | `/api/businesses/:id/content/history` | Yes | List content versions (paginated) |
| GET | `/api/businesses/:id/content/history/:version` | Yes | Get content at specific version |
| POST | `/api/businesses/:id/content/rollback` | Yes (Owner/Admin) | Rollback to previous version (creates new version) |

### Services & Payments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/services/pricing` | No | Get current pricing for all service types |
| GET | `/api/businesses/:id/subscriptions` | Yes | List active subscriptions for business |
| POST | `/api/payments/initiate` | Yes (Owner) | Initiate payment; returns PesaPal redirect URL |
| POST | `/api/payments/webhook` | No (signed) | PesaPal IPN webhook (validated by signature) |
| GET | `/api/payments/:tx_id/status` | Yes | Check payment status |
| GET | `/api/businesses/:id/transactions` | Yes | List transactions for business (paginated) |
| GET | `/api/transactions/:tx_id` | Yes | Get transaction details with line items |
| GET | `/api/businesses/:id/discounts` | Yes | List active discounts for business |

### Receipts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/businesses/:id/receipts` | Yes | List receipts for business (paginated) |
| GET | `/api/receipts/:id/download` | Yes | Generate and download receipt as PDF |

### Public Search

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/search` | No | Search businesses; params: q, category, region, page, limit |
| GET | `/api/categories` | No | List all categories with business counts |
| GET | `/api/regions` | No | List all regions with business counts |

### Admin

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/auth-logs` | Admin | Auth log viewer; filter by user_id, phone, event_type, date |
| GET | `/api/admin/audit-logs` | Admin | Audit log viewer; filter by actor, action, date |
| GET | `/api/admin/businesses` | Admin | List all businesses with filters |
| GET | `/api/admin/businesses/pending` | Admin | List pending businesses |
| POST | `/api/admin/businesses/:id/approve` | Admin | Approve business |
| POST | `/api/admin/businesses/:id/reject` | Admin | Reject business with reason |
| POST | `/api/admin/businesses/:id/suspend` | Admin | Suspend business |
| DELETE | `/api/admin/businesses/:id` | Admin | Soft delete business |
| GET | `/api/admin/users` | Admin | List all users with filters |
| POST | `/api/admin/users/:id/suspend` | Admin | Suspend user |
| DELETE | `/api/admin/users/:id` | Admin | Soft delete user (anonymize PII) |
| GET | `/api/admin/services/expiring` | Admin | List subscriptions expiring soon |
| PATCH | `/api/subscriptions/:id/adjust` | Admin | Manually adjust subscription months/dates |
| POST | `/api/refunds/request` | Admin | Create refund request |
| GET | `/api/refunds/:request_id` | Admin | Get refund request details |
| PATCH | `/api/refunds/:request_id/approve` | Admin | Approve refund |
| PATCH | `/api/refunds/:request_id/complete` | Admin | Mark refund as completed |
| GET | `/api/admin/refunds` | Admin | List all refund requests |
| POST | `/api/discounts` | Admin | Create discount for business |
| PATCH | `/api/discounts/:id` | Admin | Update discount |
| DELETE | `/api/discounts/:id` | Admin | Revoke discount |
| GET | `/api/admin/analytics` | Admin | Get analytics data |
| POST | `/api/admin/notifications/send` | Admin | Send notification to users |
| GET | `/api/admin/system/config` | Super Admin | Get system configuration |
| PATCH | `/api/admin/system/config` | Super Admin | Update system configuration |
| GET | `/api/admin/system/admins` | Super Admin | List admin users |
| POST | `/api/admin/system/admins` | Super Admin | Add admin user |
| DELETE | `/api/admin/system/admins/:id` | Super Admin | Remove admin user |

---

## External Integrations

### PesaPal Payment Gateway

**Flow:**
1. Owner initiates payment via `POST /api/payments/initiate`
2. Backend creates a `pending` transaction record
3. Backend calls PesaPal API to generate payment URL
4. Frontend redirects user to PesaPal
5. User completes payment
6. PesaPal sends IPN webhook to `POST /api/payments/webhook`
7. Backend validates webhook signature and verifies amount
8. Backend marks transaction `completed`, updates subscriptions, generates receipt, sends notification

**Security requirements:**
- Validate PesaPal IPN signature on every webhook
- Verify payment amount matches the expected amount from the pending transaction
- Handle duplicate webhooks idempotently (check transaction status before processing)
- Log all webhook events
- Payment timeout: 30 minutes; failed payments set status to `failed`

### VintEx SMS Gateway

VintEx is the SMS provider for all outbound messages. Authentication uses an API key in the request header. The endpoint and interface are provided by VintEx.

**SMS types sent:**
- OTP codes
- Payment confirmations
- Service expiry warnings
- Refund notifications
- Marketing messages (opt-in users only)

**Template variables supported:** `{nickname}`, `{amount}`, `{service_type}`, `{expiration_date}`, `{receipt_url}`

**Rate limiting:** max 10 SMS per phone number per hour to prevent abuse.

### Mailgun Email Service

Mailgun sends transactional and marketing email. Authentication uses an API key.

**Email types sent:**
- Payment confirmations with receipt
- Service expiry warnings
- Marketing emails (opt-in users only)

HTML templates support multi-language based on user language preference. Marketing emails include an unsubscribe link.

### Cloudflare API

Cloudflare manages DNS for tafuta.ke and all business subdomains.

**Subdomain creation flow:**
1. Business owner purchases website hosting
2. Backend calls Cloudflare API to create a DNS A record pointing to VPS IP
3. Caddy picks up the new subdomain and handles SSL automatically

**Error handling:**
- Subdomain already taken: return error and suggest alternatives
- API failure: retry with exponential backoff; log all DNS operations

---

## Rate Limiting

### Global Rate Limits

- **Per IP**: 100 requests per minute
- **Per authenticated user**: 60 requests per minute
- **Public search**: 30 requests per minute per IP

### Endpoint-Specific Limits

- **OTP requests**: 10 per phone number per minute
- **Login attempts**: 25 per phone number per 15 minutes
- **File uploads**: 5 per user per minute (applies to photo uploads)

### Rate Limit Response (429)

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retry_after": 60
  }
}
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| `INVALID_INPUT` | Validation error (check `field` in response) |
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `CONFLICT` | Resource already exists (e.g., subdomain taken) |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `PAYMENT_FAILED` | Payment processing error |
| `EXTERNAL_SERVICE_ERROR` | Third-party service failure |
| `SERVER_ERROR` | Internal server error |

---

## Security Requirements

- **HTTPS only**: All API requests must use HTTPS; HTTP redirected by Caddy
- **Input validation**: Validate all input fields (type, length, format); sanitize to prevent XSS; use parameterized queries
- **CORS**: Allowed origins: `https://tafuta.ke`, `https://*.tafuta.ke`; credentials allowed
- **Request logging**: Log all API requests (endpoint, method, user_id, IP, timestamp); exclude sensitive data (passwords, OTPs, tokens) from logs

---

## MVP Exclusions (Post-Launch)

- GraphQL API
- WebSocket / real-time updates
- API key management for third-party integrations
- Batch operations (bulk create/update)
- Advanced search filters (price range, ratings)
- OpenAPI/Swagger documentation UI

---

**End of PRD-03**
