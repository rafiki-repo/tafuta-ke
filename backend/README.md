# Tafuta Backend

Node.js backend API for Tafuta — Kenyan business directory platform.

## Prerequisites

- Node.js 22+
- PostgreSQL 15+
- npm

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your database credentials and API keys
```

3. **Create database and run migrations:**
```bash
createdb tafuta
npm run migrate
```

4. **Start development server:**
```bash
npm run dev
```

The server will start on `http://localhost:3000`.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with auto-reload |
| `npm run migrate` | Run all pending database migrations |
| `npm run migrate:rollback` | Roll back the last migration |
| `npm run seed` | Seed the database with sample data |
| `npm run promote-admin` | Promote a user to Tafuta admin |
| `npm test` | Run tests |

## API Endpoints

### Authentication
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login with password
- `POST /api/auth/request-otp` — Request OTP for passwordless login
- `POST /api/auth/verify-otp` — Verify OTP and get JWT
- `POST /api/auth/logout` — Logout

### Users
- `GET /api/users/me` — Get current user profile
- `PATCH /api/users/me` — Update user profile
- `GET /api/users/me/businesses` — List user's businesses
- `POST /api/users/me/deactivate` — Deactivate account
- `POST /api/users/me/reactivate` — Reactivate account
- `PATCH /api/users/me/consent` — Update consent settings

### Businesses
- `POST /api/businesses` — Create business
- `GET /api/businesses/:id` — Get business details
- `PATCH /api/businesses/:id` — Update business content and settings
- `GET /api/businesses/:id/content` — Get content JSON only
- `GET /api/businesses/:id/content/history` — Get content version history
- `GET /api/businesses/:id/content/history/:version` — Get a specific content version
- `POST /api/businesses/:id/content/rollback` — Rollback to a previous version
- `GET /api/businesses/:id/users` — List users linked to business
- `POST /api/businesses/:id/users` — Add user to business
- `DELETE /api/businesses/:id/users/:userId` — Remove user from business

### Photos (PRD-07)
- `GET /api/photos/config` — Get image type and size configuration
- `POST /api/businesses/:id/photos` — Upload a photo (multipart/form-data)
- `GET /api/businesses/:id/photos` — List all photos grouped by type
- `PATCH /api/businesses/:id/photos/:slug` — Update photo transform parameters
- `DELETE /api/businesses/:id/photos/:slug` — Delete a photo

### Search
- `GET /api/search` — Search businesses
- `GET /api/search/categories` — Get category list
- `GET /api/search/regions` — Get region list
- `GET /api/search/featured` — Get featured businesses

### Payments
- `POST /api/payments/initiate` — Initiate a PesaPal payment
- `GET /api/payments/callback` — PesaPal payment callback
- `POST /api/payments/webhook` — PesaPal IPN webhook
- `GET /api/payments/transactions/:id` — Get transaction details
- `GET /api/payments/receipts/:id` — Download PDF receipt
- `GET /api/payments/business/:businessId` — Get business payment history

### Admin
- `GET /api/admin/businesses` — List all businesses
- `GET /api/admin/businesses/pending` — Get pending approval queue
- `POST /api/admin/businesses/:id/approve` — Approve a business
- `POST /api/admin/businesses/:id/reject` — Reject a business
- `PATCH /api/admin/businesses/:id/verification` — Update business verification tier
- `GET /api/admin/users` — List all users
- `PATCH /api/admin/users/:id/verification` — Update user verification
- `PATCH /api/admin/subscriptions/:id/adjust` — Adjust subscription
- `GET /api/admin/analytics` — Platform analytics
- `GET /api/admin/auth-logs` — Authentication logs
- `GET /api/admin/audit-logs` — Admin audit trail
- `GET /api/admin/system/config` — Get system configuration
- `PATCH /api/admin/system/config/:key` — Update a system config value

## OTP Notes

- In `development`, the backend accepts any 6-digit OTP for `/api/auth/verify-otp`.
- In production/staging, set `BD_OTP` in `.env` to enable a back-door OTP for testing; leave it empty to require real SMS delivery.

## Media (Business Photos)

Business photos are uploaded through the API and stored on the VPS filesystem. Caddy serves them directly — Node.js is not in the read path.

- **Dev path:** `backend/media/` (default when `MEDIA_PATH` is unset)
- **Production path:** `/var/www/tafuta/media/` (set `MEDIA_PATH=/var/www/tafuta/media` in production `.env`)
- **Config file:** `backend/media/app-config.jfx` — defines image types, sizes, and upload limits. Copy to the production media path on first server setup.
- Image processing uses **sharp** (WebP output). Transform specs are stored as `.jfx` files alongside the generated WebP outputs.

## Project Structure

```
backend/
├── media/                   # Dev media storage (gitignored except app-config.jfx)
│   └── app-config.jfx       # Image type/size configuration (tracked)
├── scripts/                 # One-off admin scripts
├── src/
│   ├── config/              # App configuration (env vars)
│   ├── db/                  # Migrations, seed, migrate runner
│   ├── middleware/          # Auth, rate limiting, error handling
│   ├── routes/              # API route handlers
│   │   ├── auth.js
│   │   ├── businesses.js
│   │   ├── photos.js        # Photo upload and management (PRD-07)
│   │   ├── users.js
│   │   ├── search.js
│   │   ├── payments.js
│   │   └── admin.js
│   ├── services/
│   │   └── media.js         # Image processing service (sharp + flex-json)
│   ├── utils/               # Helpers: response, validation, permissions, logger
│   └── server.js            # Express app entry point
├── .env.example             # Environment variables template
├── package.json
└── README.md
```

## Development Status

**Complete:**
- ✅ Authentication (register, login, OTP, JWT, sessions)
- ✅ User management (profile, consent, deactivation)
- ✅ Business management (create, edit, content versioning, rollback, users)
- ✅ Business tag (`business_tag`) with auto-generation and folder rename
- ✅ Photo upload pipeline (multer → magic-byte validation → sharp WebP → `.jfx` specs)
- ✅ Search (full-text, category, region, featured)
- ✅ Payments (PesaPal integration, PDF receipts)
- ✅ Admin panel (approval, analytics, audit logs, system config)
- ✅ Database migrations (013 migrations applied)
- ✅ Rate limiting, compression, security headers

**TODO:**
- ⏳ Comprehensive test suite
- ⏳ SMS delivery (VintEx) — OTP currently uses back-door mode
- ⏳ Email delivery (Mailgun) — wired up, templates TBD
