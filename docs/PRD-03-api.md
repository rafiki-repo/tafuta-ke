# PRD-03: API & Integration

**Product Requirements Document**  
**Version**: 1.0  
**Last Updated**: Feb 21, 2026  
**Status**: Draft

---

## Overview

This PRD defines the RESTful API, external integrations, and webhooks for Tafuta MVP. Focus is on simplicity, security, and core functionality needed for launch.

**Architecture**: React SPA frontend communicates with Node.js/Express backend via REST API.

---

## API Design Principles

### REST Standards

- **Resource-based URLs**: `/api/businesses/:id` not `/api/getBusinessById`
- **HTTP methods**: GET (read), POST (create), PATCH (update), DELETE (soft delete)
- **Status codes**: 200 (success), 201 (created), 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found), 500 (server error)
- **JSON format**: All requests and responses use JSON
- **Consistent structure**: All responses follow standard format

### Response Format

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable message",
  "timestamp": "2026-02-21T20:00:00Z"
}
```

**Error response:**
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

For list endpoints returning multiple items:

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

**Query parameters**: `?page=1&limit=20`

---

## Authentication

### Session-Based Auth

- **JWT tokens** stored in HTTP-only cookies
- **Cookie name**: `tafuta_session`
- **Expiry**: 60 minutes
- **Secure flag**: true (HTTPS only)
- **SameSite**: Strict (CSRF protection)

### Protected Endpoints

All endpoints except public search/listings require authentication:

**Request header:**
```
Cookie: tafuta_session=<jwt_token>
```

**Unauthorized response (401):**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

### Permission Checks

Endpoints validate user permissions based on:
- User role (Owner/Admin/Employee)
- Business relationship (user must be linked to business)
- Admin role (Super Admin/Admin/Support Staff)

**Forbidden response (403):**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}
```

---

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/register
Register new user account.

**Request body:**
```json
{
  "full_name": "John Doe",
  "nickname": "John",
  "phone": "+254712345678",
  "email": "john@example.com",
  "terms_accepted": true,
  "privacy_accepted": true,
  "marketing_sms_opt_in": false
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "otp_sent": true,
    "phone": "+254712345678",
    "expires_in": 600
  }
}
```

#### POST /api/auth/login/otp
Request OTP for passwordless login.

**Request body:**
```json
{
  "phone": "+254712345678"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "otp_sent": true,
    "expires_in": 600
  }
}
```

#### POST /api/auth/login/verify
Verify OTP and create session.

**Request body:**
```json
{
  "phone": "+254712345678",
  "otp": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "user_id": "uuid",
      "full_name": "John Doe",
      "nickname": "John",
      "phone": "+254712345678",
      "email": "john@example.com"
    }
  },
  "message": "Login successful"
}
```

**Sets cookie**: `tafuta_session=<jwt_token>`

#### POST /api/auth/login/password
Login with phone and password.

**Request body:**
```json
{
  "phone": "+254712345678",
  "password": "SecurePass123!"
}
```

**Response**: Same as OTP verify

#### POST /api/auth/logout
End current session.

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Clears cookie**: `tafuta_session`

#### POST /api/auth/password/reset
Request password reset OTP.

**Request body:**
```json
{
  "phone": "+254712345678"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "otp_sent": true,
    "expires_in": 600
  }
}
```

#### POST /api/auth/password/update
Set new password after OTP verification.

**Request body:**
```json
{
  "phone": "+254712345678",
  "otp": "123456",
  "new_password": "NewSecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

---

### User Profile Endpoints

#### GET /api/users/me
Get current user profile.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "full_name": "John Doe",
    "nickname": "John",
    "phone": "+254712345678",
    "email": "john@example.com",
    "verification_tier": "basic",
    "language_preference": "en",
    "profile_photo_url": "https://...",
    "status": "active",
    "created_at": "2026-01-15T10:00:00Z"
  }
}
```

#### PATCH /api/users/me
Update user profile.

**Request body:**
```json
{
  "full_name": "John Doe Jr.",
  "nickname": "Johnny",
  "email": "newemail@example.com",
  "language_preference": "sw"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { /* updated user object */ },
  "message": "Profile updated successfully"
}
```

#### POST /api/users/me/photo
Upload profile photo.

**Request**: multipart/form-data with `photo` field

**Response (200):**
```json
{
  "success": true,
  "data": {
    "profile_photo_url": "https://tafuta.ke/uploads/users/uuid.jpg"
  }
}
```

#### PATCH /api/users/me/preferences
Update notification preferences.

**Request body:**
```json
{
  "marketing_sms_opt_in": true,
  "marketing_email_opt_in": false
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Preferences updated"
}
```

#### POST /api/users/me/deactivate
Deactivate user account (self-service).

**Response (200):**
```json
{
  "success": true,
  "message": "Account deactivated"
}
```

#### POST /api/users/me/reactivate
Reactivate user account.

**Response (200):**
```json
{
  "success": true,
  "message": "Account reactivated"
}
```

---

### Business Profile Endpoints

#### POST /api/businesses
Create new business profile.

**Request body:**
```json
{
  "business_name": "Doreen Beauty Parlour",
  "description": "Professional hair and beauty services",
  "category": "salon",
  "region": "Machakos",
  "city": "Machakos Town",
  "street_address1": "Kenyatta Avenue",
  "phone": "+254712345678",
  "email": "doreen@example.com"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "business_id": "uuid",
    "business_name": "Doreen Beauty Parlour",
    "status": "active",
    "verification_tier": "basic",
    "created_at": "2026-02-21T20:00:00Z"
  },
  "message": "Business created successfully"
}
```

#### GET /api/businesses/:id
Get business details.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "business_id": "uuid",
    "business_name": "Doreen Beauty Parlour",
    "category": "salon",
    "region": "Machakos",
    "subdomain": "doreen.machakos",
    "logo_url": "https://...",
    "verification_tier": "verified",
    "status": "active",
    "content_json": {
      "profile": {
        "en": {
          "business_name": "Doreen Beauty Parlour",
          "tagline": "Professional hair and beauty services",
          "description": "We offer professional hair styling..."
        }
      },
      "contact": {
        "phone": "+254712345678",
        "email": "doreen@example.com"
      },
      "location": {
        "city": "Machakos Town",
        "street_address1": "Kenyatta Avenue"
      }
    },
    "content_version": 3,
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-02-22T20:00:00Z"
  }
}
```

#### PATCH /api/businesses/:id
Update business profile (updates content_json).

**Request body:**
```json
{
  "content_json": {
    "profile": {
      "en": {
        "description": "Updated description"
      }
    },
    "contact": {
      "email": "newemail@example.com"
    }
  },
  "change_summary": "Updated description and email"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "business_id": "uuid",
    "content_json": { /* updated content */ },
    "content_version": 4
  },
  "message": "Business updated successfully"
}
```

**Note**: System automatically saves previous version to `business_content_history` before updating.

#### POST /api/businesses/:id/logo
Upload business logo.

**Request**: multipart/form-data with `logo` field

**Response (200):**
```json
{
  "success": true,
  "data": {
    "logo_url": "https://tafuta.ke/uploads/businesses/uuid.jpg"
  }
}
```

#### POST /api/businesses/:id/deactivate
Deactivate business (Owner only).

**Request body:**
```json
{
  "reason": "Going out of business"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Business deactivated"
}
```

#### GET /api/businesses/:id/users
List users linked to business.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "user_id": "uuid",
      "full_name": "John Doe",
      "phone": "+254712345678",
      "role": "owner",
      "created_at": "2026-01-15T10:00:00Z"
    }
  ]
}
```

#### POST /api/businesses/:id/users
Add user to business.

**Request body:**
```json
{
  "phone": "+254712345678",
  "role": "employee"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User added to business"
}
```

#### PATCH /api/businesses/:id/users/:user_id
Update user role.

**Request body:**
```json
{
  "role": "admin"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "User role updated"
}
```

#### DELETE /api/businesses/:id/users/:user_id
Remove user from business.

**Response (200):**
```json
{
  "success": true,
  "message": "User removed from business"
}
```

#### GET /api/businesses/:id/content
Get business content (content_json only).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "content_json": { /* full content object */ },
    "content_version": 3,
    "updated_at": "2026-02-22T20:00:00Z"
  }
}
```

#### GET /api/businesses/:id/content/history
Get content version history.

**Query params**: `?page=1&limit=20`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "history_id": "uuid",
      "content_version": 3,
      "change_type": "owner_edit",
      "change_summary": "Added new service: Pedicure",
      "changed_by": "uuid",
      "created_at": "2026-02-22T20:00:00Z"
    },
    {
      "history_id": "uuid",
      "content_version": 2,
      "change_type": "owner_edit",
      "change_summary": "Updated business hours",
      "changed_by": "uuid",
      "created_at": "2026-02-20T15:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "pages": 1
  }
}
```

#### GET /api/businesses/:id/content/history/:version
Get specific content version.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "history_id": "uuid",
    "content_json": { /* content at this version */ },
    "content_version": 2,
    "change_type": "owner_edit",
    "change_summary": "Updated business hours",
    "changed_by": "uuid",
    "created_at": "2026-02-20T15:00:00Z"
  }
}
```

#### POST /api/businesses/:id/content/rollback
Rollback to previous content version (Owner or Admin only).

**Request body:**
```json
{
  "target_version": 2,
  "reason": "Reverting accidental changes"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "content_version": 4,
    "rolled_back_to": 2
  },
  "message": "Content rolled back successfully"
}
```

**Note**: Rollback creates a new version (increments version number) with content from target version.

---

### Service & Payment Endpoints

#### GET /api/businesses/:id/subscriptions
List active subscriptions for business.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "subscription_id": "uuid",
      "service_type": "website_hosting",
      "months_paid": 6,
      "expiration_date": "2026-08-21",
      "status": "active"
    }
  ]
}
```

#### GET /api/services/pricing
Get current pricing for all services.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "service_type": "website_hosting",
      "description": "Single-page website with subdomain",
      "price_per_month": 200,
      "currency": "KES"
    }
  ]
}
```

#### POST /api/payments/initiate
Initiate payment for services.

**Request body:**
```json
{
  "business_id": "uuid",
  "items": [
    {
      "service_type": "website_hosting",
      "months": 6
    },
    {
      "service_type": "ads",
      "months": 3
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "tx_id": "uuid",
    "amount_kes": 1392.00,
    "vat_amount": 192.00,
    "net_amount": 1200.00,
    "pesapal_redirect_url": "https://pesapal.com/...",
    "reference_number": "TFT-TX-123456"
  }
}
```

#### POST /api/payments/webhook
PesaPal IPN webhook (internal use).

**Request body**: PesaPal IPN format

**Response (200):**
```json
{
  "success": true
}
```

#### GET /api/payments/:tx_id/status
Check payment status.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "tx_id": "uuid",
    "status": "completed",
    "amount_kes": 1392.00,
    "completed_at": "2026-02-21T20:05:00Z"
  }
}
```

#### GET /api/businesses/:id/transactions
List transactions for business.

**Query params**: `?page=1&limit=20`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "tx_id": "uuid",
      "transaction_type": "purchase",
      "amount_kes": 1392.00,
      "status": "completed",
      "created_at": "2026-02-21T20:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

#### GET /api/transactions/:tx_id
Get transaction details.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "tx_id": "uuid",
    "business_id": "uuid",
    "transaction_type": "purchase",
    "amount_kes": 1392.00,
    "vat_amount": 192.00,
    "net_amount": 1200.00,
    "payment_method": "pesapal",
    "reference_number": "TFT-TX-123456",
    "status": "completed",
    "items": [
      {
        "service_type": "website_hosting",
        "months_purchased": 6,
        "unit_price": 200.00,
        "subtotal": 1200.00
      }
    ],
    "created_at": "2026-02-21T20:00:00Z",
    "completed_at": "2026-02-21T20:05:00Z"
  }
}
```

---

### Receipt Endpoints

#### GET /api/businesses/:id/receipts
List all receipts for business.

**Query params**: `?page=1&limit=20`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "receipt_id": "uuid",
      "receipt_number": "TFT-2026-00001",
      "receipt_type": "purchase",
      "amount_kes": 1392.00,
      "issued_at": "2026-02-21T20:05:00Z"
    }
  ],
  "pagination": { ... }
}
```

#### GET /api/receipts/:id/download
Generate and download receipt PDF.

**Response**: PDF file (Content-Type: application/pdf)

---

### Public Search Endpoints

#### GET /api/search
Search businesses (public, no auth required).

**Query params**: 
- `q` - search query (optional)
- `category` - filter by category (optional)
- `region` - filter by region (optional)
- `page` - page number (default: 1)
- `limit` - items per page (default: 20)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "business_id": "uuid",
      "business_name": "Doreen Beauty Parlour",
      "description": "Professional hair and beauty services",
      "category": "salon",
      "region": "Machakos",
      "city": "Machakos Town",
      "phone": "+254712345678",
      "website_url": "https://doreen.machakos.tafuta.ke",
      "logo_url": "https://...",
      "verification_tier": "verified",
      "is_promoted": false
    }
  ],
  "pagination": { ... }
}
```

#### GET /api/categories
List all categories (public).

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "category_id": "salon",
      "name": "Salons & Beauty",
      "business_count": 45
    }
  ]
}
```

#### GET /api/regions
List all regions (public).

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "region_id": "machakos",
      "name": "Machakos",
      "business_count": 156
    }
  ]
}
```

---

### Admin Endpoints

#### GET /api/admin/auth-logs
View authentication logs (admin only).

**Query params**: 
- `user_id` - filter by user (optional)
- `phone` - filter by phone (optional)
- `event_type` - filter by event type (optional)
- `start_date` - filter by date range (optional)
- `end_date` - filter by date range (optional)
- `page`, `limit` - pagination

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "log_id": "uuid",
      "user_id": "uuid",
      "phone": "+254712345678",
      "event_type": "login_success",
      "ip_address": "192.168.1.1",
      "timestamp": "2026-02-21T20:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

#### PATCH /api/subscriptions/:id/adjust
Manually adjust subscription (admin only).

**Request body:**
```json
{
  "months_paid": 8,
  "expiration_date": "2026-10-21",
  "reason": "Compensation for 2-day downtime"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { /* updated subscription */ },
  "message": "Subscription adjusted successfully"
}
```

#### POST /api/refunds/request
Create refund request (admin only).

**Request body:**
```json
{
  "business_id": "uuid",
  "items": [
    {
      "service_type": "website_hosting",
      "months_to_refund": 2
    }
  ],
  "notes": "Customer request"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "request_id": "uuid",
    "refund_amount": 400.00,
    "processing_fee": 20.00,
    "net_refund": 380.00,
    "status": "pending"
  }
}
```

#### PATCH /api/refunds/:id/approve
Approve refund request (admin only).

**Response (200):**
```json
{
  "success": true,
  "message": "Refund approved"
}
```

#### PATCH /api/refunds/:id/complete
Mark refund as completed (admin only).

**Response (200):**
```json
{
  "success": true,
  "message": "Refund completed"
}
```

---

## External Integrations

### PesaPal Payment Gateway

#### Integration Flow

1. User initiates payment via `POST /api/payments/initiate`
2. Backend creates transaction record with `status = 'pending'`
3. Backend calls PesaPal API to generate payment URL
4. Backend returns PesaPal redirect URL to frontend
5. Frontend redirects user to PesaPal payment page
6. User completes payment on PesaPal
7. PesaPal sends IPN webhook to `POST /api/payments/webhook`
8. Backend validates webhook signature
9. Backend updates transaction `status = 'completed'`
10. Backend updates service subscriptions
11. Backend generates receipt
12. Backend sends confirmation SMS/email

#### PesaPal API Endpoints

**Generate Payment URL:**
- Endpoint: `https://www.pesapal.com/API/PostPesapalDirectOrderV4`
- Method: POST
- Auth: OAuth 1.0

**Query Payment Status:**
- Endpoint: `https://www.pesapal.com/API/QueryPaymentStatus`
- Method: GET
- Auth: OAuth 1.0

#### Webhook Security

- Validate PesaPal signature on all IPN webhooks
- Verify transaction amount matches expected amount
- Implement idempotency (handle duplicate webhooks)
- Log all webhook events

#### Error Handling

- Payment timeout: 30 minutes
- Failed payment: Update transaction `status = 'failed'`
- User can retry payment from transaction history

---

### VintEx SMS Gateway

#### Integration

**Send SMS:**
- Endpoint: Provided by VintEx
- Method: POST
- Auth: API key in header

**SMS Types:**
- OTP codes (6 digits)
- Payment confirmations
- Service expiry warnings
- Refund notifications
- Marketing messages (opt-in only)

#### SMS Template Variables

Templates support placeholders:
- `{nickname}` - user's preferred name
- `{amount}` - payment amount
- `{service_type}` - service name
- `{expiration_date}` - service expiry date
- `{receipt_url}` - receipt download link

#### Rate Limiting

- Max 10 SMS per phone number per hour (prevents abuse)
- Queue SMS for batch sending (reduce costs)

---

### Mailgun Email Service

#### Integration

**Send Email:**
- Endpoint: `https://api.mailgun.net/v3/tafuta.ke/messages`
- Method: POST
- Auth: API key

**Email Types:**
- Welcome emails
- Payment confirmations
- Receipt attachments
- Service expiry warnings
- Marketing emails (opt-in only)

#### Email Templates

- HTML templates with Tafuta branding
- Support multi-language (based on user preference)
- Include unsubscribe link (marketing emails only)

---

### Cloudflare API

#### DNS Management

**Create Subdomain:**
- Endpoint: `https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records`
- Method: POST
- Auth: API token

**Flow:**
1. User purchases website hosting
2. Backend calls Cloudflare API to create DNS A record
3. Subdomain points to VPS IP address
4. Caddy handles SSL certificate automatically

**Example:**
```json
{
  "type": "A",
  "name": "doreen.machakos",
  "content": "192.168.1.1",
  "ttl": 3600,
  "proxied": true
}
```

#### Error Handling

- Subdomain already exists: Suggest alternatives
- API failure: Retry with exponential backoff
- Log all DNS operations

---

## Rate Limiting

### Global Rate Limits

- **Per IP**: 100 requests per minute
- **Per user**: 60 requests per minute
- **Public search**: 30 requests per minute per IP

### Endpoint-Specific Limits

- **OTP requests**: 10 per phone number per minute
- **Login attempts**: 25 per phone number per 15 minutes
- **File uploads**: 5 per user per minute

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

### Standard Error Codes

- `INVALID_INPUT` - Validation error
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Resource already exists
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `PAYMENT_FAILED` - Payment processing error
- `EXTERNAL_SERVICE_ERROR` - Third-party service failure
- `SERVER_ERROR` - Internal server error

---

## API Versioning

### MVP Approach

- **No versioning in MVP**: All endpoints at `/api/*`
- **Future**: Version in URL path (`/api/v2/*`) when breaking changes needed

---

## Security Requirements

### HTTPS Only

- All API requests must use HTTPS
- HTTP requests redirected to HTTPS (handled by Caddy)

### Input Validation

- Validate all input fields (type, length, format)
- Sanitize user input (prevent XSS, SQL injection)
- Use parameterized queries (prevent SQL injection)

### CORS Policy

- **Allowed origins**: `https://tafuta.ke`, `https://*.tafuta.ke`
- **Allowed methods**: GET, POST, PATCH, DELETE
- **Credentials**: true (allow cookies)

### Request Logging

- Log all API requests (endpoint, method, user_id, IP, timestamp)
- Log all errors with stack traces
- Exclude sensitive data from logs (passwords, OTPs, tokens)

---

## Testing Requirements

### Unit Tests

- Input validation for all endpoints
- Permission checks for protected endpoints
- Error handling for all failure scenarios

### Integration Tests

- Complete authentication flow
- Payment flow with PesaPal webhook simulation
- Refund flow
- Business creation and management

### E2E Tests

- User registers → creates business → purchases service → receives confirmation
- Admin adjusts subscription → user receives notification
- Payment fails → user retries → payment succeeds

---

## MVP Exclusions (Post-Launch)

- GraphQL API
- WebSocket/real-time updates
- API rate limit customization per user
- API key management for third-party integrations
- Batch operations (bulk create/update)
- Advanced search filters (price range, ratings)
- API documentation UI (Swagger/OpenAPI viewer)

---

## Dependencies

- **Backend**: Node.js 22 with Express.js
- **Database**: PostgreSQL 15+
- **Payment Gateway**: PesaPal API
- **SMS Gateway**: VintEx API
- **Email Service**: Mailgun API
- **DNS Management**: Cloudflare API
- **Reverse Proxy**: Caddy (handles HTTPS, CORS)

---

**End of PRD-03**
