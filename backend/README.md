# Tafuta Backend

Node.js backend API for Tafuta - Kenyan business directory platform.

## Prerequisites

- Node.js 22+
- PostgreSQL 15+
- npm or yarn

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

3. **Create database:**
```bash
createdb tafuta
```

4. **Run migrations:**
```bash
npm run migrate
```

5. **Start development server:**
```bash
npm run dev
```

The server will start on `http://localhost:3000`

## Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload
- `npm run migrate` - Run database migrations
- `npm test` - Run tests

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with password
- `POST /api/auth/request-otp` - Request OTP for passwordless login
- `POST /api/auth/verify-otp` - Verify OTP and login
- `POST /api/auth/logout` - Logout

## OTP Notes (Development / Staging)

OTP delivery and verification is currently a placeholder implementation.

- In `development`, the backend accepts any 6-digit OTP for `/api/auth/verify-otp`.
- In non-development environments (staging/production), `/api/auth/verify-otp` only accepts the back-door OTP if `BD_OTP` is set (non-empty) at startup.

### Users
- `GET /api/users/me` - Get current user profile
- `PATCH /api/users/me` - Update user profile
- `GET /api/users/me/businesses` - Get user's businesses

### Businesses
- `POST /api/businesses` - Create business
- `GET /api/businesses/:id` - Get business details
- `PATCH /api/businesses/:id` - Update business
- `GET /api/businesses/:id/content/history` - Get content version history
- `POST /api/businesses/:id/content/rollback` - Rollback content

### Search
- `GET /api/search` - Search businesses
- `GET /api/search/categories` - Get categories
- `GET /api/search/regions` - Get regions

### Payments
- `POST /api/payments/initiate` - Initiate payment
- `GET /api/payments/callback` - PesaPal callback
- `POST /api/payments/webhook` - PesaPal webhook
- `GET /api/payments/receipts/:id` - Get receipt

### Admin
- `GET /api/admin/businesses/pending` - Get pending businesses
- `POST /api/admin/businesses/:id/approve` - Approve business
- `POST /api/admin/businesses/:id/reject` - Reject business
- `GET /api/admin/analytics` - Get analytics
- `GET /api/admin/auth-logs` - Get auth logs
- `GET /api/admin/audit-logs` - Get audit logs

## Database Schema

See `src/db/migrations/` for complete schema definitions.

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── db/              # Database migrations and utilities
│   ├── middleware/      # Express middleware
│   ├── routes/          # API route handlers
│   ├── utils/           # Utility functions
│   └── server.js        # Main application entry point
├── .env.example         # Environment variables template
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

## Development Status

**Completed:**
- ✅ Project structure
- ✅ Database schema and migrations
- ✅ Core middleware (auth, rate limiting, error handling)
- ✅ Authentication endpoints (register, login, OTP)
- ✅ Route placeholders for all endpoints

**In Progress:**
- 🚧 Business management endpoints
- 🚧 Payment integration (PesaPal)
- 🚧 Search functionality
- 🚧 Admin endpoints

**TODO:**
- ⏳ SMS integration (VintEx)
- ⏳ Email integration (Mailgun)
- ⏳ Cloudflare DNS integration
- ⏳ Receipt generation (PDF)
- ⏳ Frontend application
- ⏳ Testing suite
- ⏳ Deployment configuration

## Next Steps

1. Implement remaining API endpoints
2. Integrate external services (PesaPal, VintEx, Mailgun)
3. Build frontend React application
4. Add comprehensive testing
5. Deploy to production VPS
