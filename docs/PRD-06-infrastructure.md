# PRD-06: Infrastructure & Deployment

**Product Requirements Document**
**Version**: 1.0
**Last Updated**: Feb 22, 2026
**Status**: Draft

---

## Overview

This PRD defines the infrastructure, deployment, testing, and DevOps requirements for Tafuta MVP. Focus is on a simple, reliable, cost-effective setup that can scale as the platform grows.

**Key Principle**: Keep infrastructure lean and maintainable; optimize for reliability over complexity.

---

## Technology Stack

### Backend

- **Runtime**: Node.js 22 LTS
- **Framework**: Express.js 4.x
- **Language**: JavaScript (ES6+)
- **Database**: PostgreSQL 15+
- **Session management**: express-session with connect-pg-simple (PostgreSQL session storage)
- **Authentication**: jsonwebtoken (JWT), bcryptjs (cost factor 10), crypto module for OTP
- **Image processing**: JIMP (server-side transform and WebP output)
- **File uploads**: multer (multipart/form-data handling)
- **Config files**: flex-json (read/write `.jfx` transform specs and `app-config.jfx`)
- **Logging**: Winston
- **Connection pooling**: pg-pool (max 20 connections for MVP)

### Frontend

- **Framework**: React 18+
- **Build tool**: Vite
- **Routing**: React Router v6
- **State management**: React Context API (MVP)
- **Internationalization**: i18next / react-i18next
- **CSS framework**: TailwindCSS 3.x
- **Components**: Headless UI (accessible components)
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod (validation)
- **PWA**: Workbox (service worker and caching)

### External Services

- **Payment gateway**: PesaPal API (OAuth 1.0)
- **SMS gateway**: VintEx SMS API
- **Email service**: Mailgun (HTML email templates)
- **DNS / CDN**: Cloudflare (DNS management, CDN, DDoS protection)
- **File storage**: VPS filesystem (MVP); user uploads: `/var/www/tafuta/uploads/`; business media: `/var/www/media/`

---

## Server Infrastructure

### VPS Specifications

**Minimum Specs (MVP):**
- CPU: 2 vCPUs
- RAM: 4 GB
- Storage: 80 GB SSD
- Bandwidth: 4 TB/month
- OS: Ubuntu 24.04 LTS

**Estimated Cost**: ~$20-40/month

### Directory Structure

```
/var/www/tafuta/
├── backend/           # Node.js backend application
│   ├── src/
│   ├── node_modules/
│   ├── package.json
│   └── .env
├── frontend/          # React frontend build
│   └── dist/          # Production build
├── uploads/           # User profile photos
│   └── users/         # User profile photos (max 2 MB each)
└── logs/              # Application logs
    ├── access.log
    ├── error.log
    └── app.log

/var/www/media/              # Business media (separate from app files)
├── app-config.jfx           # Image type/size configuration (managed by Tafuta staff)
└── {business_tag}_{uuid}/   # One folder per business (e.g. daniels-salon_550e8400-...)
    ├── {source-file}.jpg/png/gif/webp   # Original uploaded files
    ├── logo/            # Generated logo WebP outputs + .jfx specs
    ├── banner/          # Generated banner WebP outputs + .jfx specs
    ├── profile/         # Generated profile WebP outputs + .jfx specs
    └── gallery/         # Generated gallery WebP outputs + .jfx specs
```

Business media is kept in a separate directory tree (`/var/www/media/`) so it can be backed up, served, and managed independently of the application code.

---

## Reverse Proxy & HTTPS

### Caddy

Caddy is the reverse proxy and handles automatic HTTPS via Let's Encrypt. It provides:
- Automatic SSL certificate provisioning and renewal for all domains including wildcard `*.tafuta.ke`
- Gzip compression
- SPA routing (all routes served by index.html)
- API proxying to Node.js backend on port 3000
- Direct static file serving for business media (Node.js is NOT in the media read path)
- HTTP/2 and HSTS

**Media serving block** (added to Caddyfile):
```
handle /media/* {
    root * /var/www/media
    file_server
    header Cache-Control "public, max-age=86400"
}
```

**Why Caddy**: Automatic HTTPS with zero certificate management overhead; simple configuration; built-in reverse proxy.

---

## Database Setup

### PostgreSQL Configuration

PostgreSQL listens only on localhost (no external access). Connection pool maximum: 20 connections for MVP.

### Database Schema Management

All schema changes are applied via migrations (Prisma Migrate or Sequelize Migrations). Migrations are stored in version control. Never modify the production database directly.

### Database Indexes

Critical indexes for performance:

- `users`: phone, email, status
- `businesses`: status, region, category, subdomain, created_at; full-text search index on business_name + description
- `transactions`: business_id, status, created_at
- `service_subscriptions`: business_id, expiration_date, status
- `auth_logs`: user_id, phone, timestamp
- `audit_logs`: actor_id, entity_type, timestamp

---

## Application Deployment

### Process Management (PM2)

PM2 manages the Node.js backend process with:
- Automatic restart on crash
- Zero-downtime reloads (`pm2 reload`)
- Cluster mode using 2 CPU cores
- Memory limit restart at 500MB
- Log management with date format and merged output
- Auto-start on server reboot via `pm2 startup` + `pm2 save`

### Environment Variables

All secrets and configuration are stored in a `.env` file:
- `NODE_ENV`, `PORT`, `APP_URL`
- `DATABASE_URL` (PostgreSQL connection string)
- `JWT_SECRET`, `JWT_EXPIRY`
- `PESAPAL_CONSUMER_KEY`, `PESAPAL_CONSUMER_SECRET`, `PESAPAL_CALLBACK_URL`, `PESAPAL_IPN_URL`
- `VINTEX_API_KEY`, `VINTEX_SENDER_ID`
- `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`
- `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID`
- `UPLOAD_PATH` (user profile photos), `MEDIA_PATH` (business media root), `MAX_FILE_SIZE`
- `RATE_LIMIT_WINDOW`, `RATE_LIMIT_MAX_REQUESTS`

The `.env` file must never be committed to version control. File permissions: `chmod 600 .env`. Use `.env.example` as a template.

---

## Backup Strategy

### Database Backups

Daily automated backups via cron job (2 AM). Each backup is a compressed PostgreSQL dump. Backups older than 30 days are deleted automatically. Backups are also synced to off-site object storage (e.g., Backblaze B2) daily.

### File Backups

Two separate backup jobs:

1. **User uploads** (`/var/www/tafuta/uploads/`) — daily at 3 AM. Compressed tar archive. 30-day retention with off-site sync.
2. **Business media** (`/var/www/media/`) — daily at 3:30 AM. Compressed tar archive. 30-day retention with off-site sync.

Business media backups include both source files and generated WebP outputs. Source files are the authoritative originals; WebP files can always be regenerated from source + `.jfx` specs if needed.

### Off-Site Backups

Off-site sync runs daily (4 AM) using rclone to a remote object storage bucket.

---

## Monitoring & Logging

### Application Logging

**Library**: Winston

**Log levels**: error, warn, info, debug (debug only in development)

**Log format**: JSON with timestamp, level, message, and relevant context fields (userId, IP, etc.). Sensitive data (passwords, OTPs, tokens) must never appear in logs.

**Log files**: app.log (all), error.log (errors only), access.log (HTTP access via Caddy)

**Log rotation**: logrotate with 14-day retention, daily rotation, compressed archives.

### Health Check Endpoint

`GET /api/health` returns:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "uptime": 86400,
  "database": "connected",
  "version": "1.0.0"
}
```

Monitor this endpoint every 5 minutes. Alert if it returns an error or times out.

### Error Tracking

**MVP**: Log errors to file; email critical errors to admin team.
**Future**: Integrate Sentry or Rollbar.

---

## Security

### Server Hardening

- **Firewall (UFW)**: Allow SSH (port 22), HTTP (80), HTTPS (443); deny all other incoming
- **SSH**: Disable root login; disable password authentication (SSH keys only)
- **Automatic security updates**: unattended-upgrades enabled
- **Fail2Ban**: Installed and configured for SSH brute-force protection

### Application Security

- Environment variables for all secrets; rotate quarterly
- All user input validated and sanitized (schema validation with Zod/Joi)
- Parameterized queries only (no string concatenation into SQL)
- Rate limiting on all endpoints; stricter limits on auth endpoints
- CORS restricted to `https://tafuta.ke` and `https://*.tafuta.ke`
- Security headers via helmet middleware (CSP, HSTS, etc.)

### SSL/TLS

Caddy handles SSL automatically: Let's Encrypt certificates, automatic renewal, strong cipher suites, HTTP/2, HSTS.

---

## Performance Targets

- Homepage load time: < 2 seconds on 3G
- API response time: < 500ms (p95)
- Database query time: < 100ms (p95)
- Concurrent users without degradation: 100+

### Backend Optimization

- PostgreSQL connection pooling (pg-pool, max 20)
- Indexes on all frequently queried fields
- Paginate all list endpoints
- Avoid N+1 queries (use joins or eager loading)
- Gzip compression via Caddy and Express compression middleware

### Frontend Optimization

- React lazy loading (code splitting by route)
- Serve WebP images with JPEG fallback
- Lazy load images below the fold
- Vite build with minification and vendor chunk splitting
- Network-first PWA caching strategy (always fetch fresh when online)

### CDN & Caching

- Cloudflare CDN caches static assets at edge
- Static assets (images, CSS, JS): 1-year cache with versioned filenames
- API responses: no-cache (always fresh)
- Public search results: 5-minute cache allowable

---

## Testing Strategy

### Testing Pyramid

1. **Unit Tests** (70%): Individual functions and modules
2. **Integration Tests** (20%): API endpoints and database interactions
3. **E2E Tests** (10%): Critical user flows

### Unit Testing

**Framework**: Jest or Vitest

**Coverage target**: 70% minimum

Focus areas: input validation, business logic (VAT calculation, discount application, subscription expiry), OTP generation and validation, permission checks.

### Integration Testing

**Framework**: Supertest (API testing against running Express app)

Focus areas: complete authentication flow, payment flow with mocked PesaPal webhook, refund flow, business creation and approval, subscription management.

### End-to-End Testing

**Framework**: Playwright or Cypress

**Critical flows to cover:**
1. User registers → verifies phone → creates business → business approved → goes live
2. Business owner purchases service → payment webhook → service activated
3. Public user searches → views business → clicks call/website
4. Admin approves pending business → owner notified

### Performance Testing

**Tool**: Apache Bench (ab) or k6

Test search endpoint and homepage under 100 concurrent users. Validate performance targets (see above).

### Security Testing

- `npm audit` for dependency vulnerabilities before each deployment
- Manual testing of OWASP Top 10 (SQL injection, XSS, CSRF, rate limiting, session management)
- Third-party security audit recommended before launch

---

## Disaster Recovery

### Recovery Targets

- **Recovery Time Objective (RTO)**: 4 hours
- **Recovery Point Objective (RPO)**: 24 hours (daily backups)

### Server Failure Recovery

1. Provision new VPS with same specs (Ubuntu 24.04 LTS)
2. Install software stack (Node.js 22, PostgreSQL 15, Caddy, PM2)
3. Restore database from latest backup
4. Restore uploaded files from latest backup
5. Deploy application code from repository
6. Update Cloudflare DNS to point to new server IP
7. Verify health check endpoint responds

---

## Scaling Strategy

### Vertical Scaling (Short-term)

Scale up when: CPU usage > 70% sustained; RAM usage > 80% sustained; database connections > 80% of maximum.

**Upgrade path**: 2 vCPUs / 4 GB RAM → 4 vCPUs / 8 GB RAM → 8 vCPUs / 16 GB RAM

### Horizontal Scaling (Long-term)

When vertical scaling is insufficient, move to a multi-server architecture:

```
                    [Load Balancer]
                          |
        +-----------------+-----------------+
        |                 |                 |
   [App Server 1]   [App Server 2]   [App Server 3]
        |                 |                 |
        +-----------------+-----------------+
                          |
                  [Database Server]
```

**Components needed:** Load balancer (Nginx or HAProxy); PostgreSQL with read replicas; S3-compatible object storage for uploaded files; Redis for session storage (replacing connect-pg-simple).

---

## Cost Estimates (MVP)

### Infrastructure Costs

| Service | Monthly Cost |
|---------|--------------|
| VPS (4GB RAM, 2 vCPUs) | $24 |
| Domain (tafuta.ke) | $1 |
| Cloudflare (Free tier) | $0 |
| Backblaze B2 (50GB storage) | $3 |
| **Total Infrastructure** | **$28** |

### Service Costs (Variable)

| Service | Cost |
|---------|------|
| VintEx SMS | ~0.50 KES per SMS |
| Mailgun Email | Free tier (10,000/month) |
| PesaPal Transaction Fee | 3.5% per transaction |

**Estimated Monthly Costs (100 businesses):**
- SMS (OTPs, notifications): ~5,000 KES (~$35)
- Email: $0 (within free tier)
- Payment processing: Variable (3.5% of revenue)

**Total Monthly Operating Cost**: ~$65 + payment fees

---

## Pre-Launch Checklist

### Technical Checklist

- [ ] Server provisioned and configured (Ubuntu 24.04 LTS)
- [ ] Database created and migrations applied
- [ ] Application deployed and running via PM2
- [ ] HTTPS certificates active (Caddy)
- [ ] DNS configured (tafuta.ke and *.tafuta.ke)
- [ ] Backups configured, tested, and verified
- [ ] Monitoring and logging set up
- [ ] PM2 auto-restart configured (`pm2 startup && pm2 save`)
- [ ] Firewall rules configured (UFW)
- [ ] Security headers enabled (helmet)
- [ ] Rate limiting implemented
- [ ] Error tracking configured

### Integration Checklist

- [ ] PesaPal integration tested (sandbox and production)
- [ ] VintEx SMS integration tested (OTP delivery confirmed)
- [ ] Mailgun email integration tested
- [ ] Cloudflare DNS API tested (subdomain creation confirmed)
- [ ] PesaPal IPN webhook tested end-to-end

### Testing Checklist

- [ ] Unit tests passing (70%+ coverage)
- [ ] Integration tests passing
- [ ] E2E tests passing for all critical flows
- [ ] Performance testing completed (targets met on simulated 3G)
- [ ] Security testing completed (OWASP Top 10 checked)
- [ ] Mobile responsiveness tested on real devices
- [ ] Multi-language testing completed
- [ ] Cross-browser testing completed

### Data Checklist

- [ ] `system_config` populated (legal identity: eBiashara Rahisi Ltd, KRA PIN, VAT number, address)
- [ ] Categories seeded
- [ ] Regions seeded (Machakos, Kisumu)
- [ ] Service pricing configured in fees table
- [ ] Admin users created
- [ ] Email templates created (all languages)
- [ ] SMS templates created (all languages)

### Compliance Checklist

- [ ] Privacy Policy published in application
- [ ] Terms of Service published in application
- [ ] ODPC registration completed
- [ ] KRA/ETR compliance confirmed
- [ ] VAT receipt format reviewed and approved
- [ ] Legal attorney review completed

### Documentation Checklist

- [ ] API documentation complete (OpenAPI/Swagger)
- [ ] Deployment guide complete (DEPLOYMENT.md)
- [ ] Admin user guide complete
- [ ] Business owner guide complete
- [ ] Troubleshooting guide complete

---

## Post-Launch Monitoring

**Key metrics to track continuously:**
- Uptime percentage
- API response times (p50, p95, p99)
- Error rate
- New user signups
- New business registrations
- Business approval rate and pending queue age
- Payment success rate
- SMS delivery success rate
- Server resource utilization (CPU, RAM, disk)
- Database connection pool usage
- Active subscriptions count
- Monthly revenue

---

## Future Enhancements

### Infrastructure

- Redis for session management and caching (required for horizontal scaling)
- S3-compatible object storage for uploaded files
- Load balancer for multi-server setup
- PostgreSQL read replicas for scaling
- Grafana + Prometheus for metrics dashboards
- Sentry or Rollbar for error tracking
- CI/CD pipeline (GitHub Actions or GitLab CI) for automated deployments

### Performance

- Query optimization and materialized views for analytics
- Redis cache for frequently accessed data (category lists, region lists)
- Elasticsearch for advanced business search
- S3-compatible object storage for business media (replacing VPS disk for media at scale)
- Async image processing queue (for large uploads / batch regeneration)

### Security

- 2FA for admin accounts
- IP whitelisting for admin dashboard
- Annual third-party penetration testing

---

**End of PRD-06**
