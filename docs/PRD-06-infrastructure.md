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

**Runtime & Framework:**
- **Node.js**: Version 22 LTS
- **Framework**: Express.js 4.x
- **Language**: JavaScript (ES6+) or TypeScript (recommended for type safety)

**Database:**
- **PostgreSQL**: Version 15+
- **ORM**: Prisma or Sequelize (recommended for schema management)
- **Connection Pooling**: pg-pool (max 20 connections for MVP)

**Session Management:**
- **Storage**: PostgreSQL `sessions` table
- **Library**: express-session with connect-pg-simple

**Authentication:**
- **JWT**: jsonwebtoken library
- **Password Hashing**: bcrypt (cost factor 10)
- **OTP Generation**: crypto module (built-in)

### Frontend

**Framework & Libraries:**
- **React**: Version 18+
- **Build Tool**: Vite or Create React App
- **Routing**: React Router v6
- **State Management**: React Context API (MVP) or Zustand (if needed)
- **HTTP Client**: Axios or Fetch API
- **Internationalization**: next-intl

**UI & Styling:**
- **CSS Framework**: TailwindCSS 3.x (recommended) or CSS Modules
- **Component Library**: Headless UI (accessible components)
- **Icons**: Lucide React or similar
- **Forms**: React Hook Form + Zod (validation)

**PWA:**
- **Service Worker**: Workbox (for caching strategies)
- **Manifest**: Web App Manifest for installability

### External Services

**Payment Gateway:**
- **PesaPal**: API v1.0
- **Integration**: OAuth 1.0 authentication

**SMS Gateway:**
- **VintEx**: SMS API
- **Fallback**: Consider backup provider for redundancy (post-MVP)

**Email Service:**
- **Mailgun**: Transactional email API
- **Templates**: HTML email templates with inline CSS

**DNS & CDN:**
- **Cloudflare**: DNS management, CDN, DDoS protection
- **API**: Cloudflare API for automated subdomain creation

**File Storage:**
- **Local Storage**: VPS filesystem (MVP)
- **Path**: `/var/www/tafuta/uploads/`
- **Future**: S3-compatible object storage (post-MVP)

---

## Server Infrastructure

### VPS Specifications

**Provider**: Any reliable VPS provider (DigitalOcean, Linode, Vultr, etc.)

**Minimum Specs (MVP):**
- **CPU**: 2 vCPUs
- **RAM**: 4 GB
- **Storage**: 80 GB SSD
- **Bandwidth**: 4 TB/month
- **OS**: Ubuntu 24.04 LTS

**Estimated Cost**: ~$20-40/month

**Scaling Plan:**
- Start with single VPS
- Monitor resource usage
- Upgrade vertically (more CPU/RAM) as needed
- Horizontal scaling (multiple servers) post-MVP

### Server Setup

**Operating System:**
- Ubuntu 24.04 LTS (Long Term Support)
- Automatic security updates enabled
- Firewall configured (UFW)

**Software Stack:**
- Node.js 22 (via nvm or NodeSource repository)
- PostgreSQL 15 (via official PostgreSQL repository)
- Caddy 2 (reverse proxy, automatic HTTPS)
- PM2 (process manager for Node.js)

**Directory Structure:**
```
/var/www/tafuta/
├── backend/           # Node.js backend application
│   ├── src/
│   ├── node_modules/
│   ├── package.json
│   └── .env
├── frontend/          # React frontend build
│   ├── dist/          # Production build
│   └── index.html
├── uploads/           # User-uploaded files
│   ├── businesses/    # Business logos
│   └── users/         # User profile photos
└── logs/              # Application logs
    ├── access.log
    ├── error.log
    └── app.log
```

---

## Reverse Proxy & HTTPS

### Caddy Configuration

**Why Caddy:**
- Automatic HTTPS with Let's Encrypt
- Simple configuration
- Built-in reverse proxy
- Automatic certificate renewal

**Caddyfile:**
```
# Main domain
tafuta.ke {
    # Serve React SPA
    root * /var/www/tafuta/frontend/dist
    encode gzip
    
    # API requests to backend
    reverse_proxy /api/* localhost:3000
    
    # Serve static files
    file_server
    
    # SPA fallback (all routes to index.html)
    try_files {path} /index.html
}

# Wildcard subdomain for business websites
*.tafuta.ke {
    # Serve business websites
    reverse_proxy localhost:3000
}

# Admin subdomain (optional)
admin.tafuta.ke {
    root * /var/www/tafuta/frontend/dist
    encode gzip
    reverse_proxy /api/* localhost:3000
    file_server
    try_files {path} /index.html
}
```

**Features:**
- Automatic HTTPS for all domains/subdomains
- Gzip compression for faster load times
- SPA routing support (all routes serve index.html)
- API proxying to backend

**Certificate Management:**
- Let's Encrypt certificates auto-renewed every 90 days
- Wildcard certificate for `*.tafuta.ke`
- No manual intervention required

---

## Database Setup

### PostgreSQL Configuration

**Installation:**
```bash
# Install PostgreSQL 15
sudo apt install postgresql-15 postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE tafuta;
CREATE USER tafuta_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE tafuta TO tafuta_user;
```

**Configuration (`/etc/postgresql/15/main/postgresql.conf`):**
```
# Connection settings
max_connections = 100
shared_buffers = 1GB          # 25% of RAM
effective_cache_size = 3GB    # 75% of RAM
work_mem = 10MB
maintenance_work_mem = 256MB

# Write-ahead log
wal_buffers = 16MB
checkpoint_completion_target = 0.9

# Query planner
random_page_cost = 1.1        # SSD optimization
effective_io_concurrency = 200
```

**Security:**
- Listen only on localhost (no external access)
- Strong password for database user
- Regular backups (see Backup Strategy section)

### Database Schema Management

**Migration Tool**: Prisma Migrate or Sequelize Migrations

**Schema Versioning:**
- All schema changes via migrations
- Migrations stored in version control
- Never modify production database directly

**Example Migration Workflow:**
```bash
# Create migration
npm run migrate:create add_pending_status_to_businesses

# Apply migration to development
npm run migrate:dev

# Apply migration to production
npm run migrate:prod
```

### Database Indexes

**Critical Indexes for Performance:**

```sql
-- Users table
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- Businesses table
CREATE INDEX idx_businesses_status ON businesses(status);
CREATE INDEX idx_businesses_region ON businesses(region);
CREATE INDEX idx_businesses_category ON businesses(category);
CREATE INDEX idx_businesses_subdomain ON businesses(subdomain);
CREATE INDEX idx_businesses_created_at ON businesses(created_at);

-- Full-text search index
CREATE INDEX idx_businesses_search ON businesses 
  USING gin(to_tsvector('english', business_name || ' ' || description));

-- Transactions table
CREATE INDEX idx_transactions_business_id ON transactions(business_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

-- Service subscriptions table
CREATE INDEX idx_subscriptions_business_id ON service_subscriptions(business_id);
CREATE INDEX idx_subscriptions_expiration_date ON service_subscriptions(expiration_date);
CREATE INDEX idx_subscriptions_status ON service_subscriptions(status);

-- Auth logs table
CREATE INDEX idx_auth_logs_user_id ON auth_logs(user_id);
CREATE INDEX idx_auth_logs_phone ON auth_logs(phone);
CREATE INDEX idx_auth_logs_timestamp ON auth_logs(timestamp);

-- Audit logs table
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
```

---

## Application Deployment

### Process Management (PM2)

**Why PM2:**
- Automatic restart on crash
- Zero-downtime reloads
- Log management
- Cluster mode (multi-core support)
- Built-in monitoring

**PM2 Configuration (`ecosystem.config.js`):**
```javascript
module.exports = {
  apps: [{
    name: 'tafuta-backend',
    script: './src/server.js',
    instances: 2,              // Use 2 CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/www/tafuta/logs/error.log',
    out_file: '/var/www/tafuta/logs/app.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '500M',
    autorestart: true,
    watch: false
  }]
};
```

**PM2 Commands:**
```bash
# Start application
pm2 start ecosystem.config.js

# Restart application (zero-downtime)
pm2 reload tafuta-backend

# View logs
pm2 logs tafuta-backend

# Monitor resources
pm2 monit

# Save PM2 configuration (auto-start on reboot)
pm2 save
pm2 startup
```

### Environment Variables

**`.env` file (backend):**
```
# Application
NODE_ENV=production
PORT=3000
APP_URL=https://tafuta.ke

# Database
DATABASE_URL=postgresql://tafuta_user:secure_password@localhost:5432/tafuta

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRY=60m

# PesaPal
PESAPAL_CONSUMER_KEY=your-pesapal-consumer-key
PESAPAL_CONSUMER_SECRET=your-pesapal-consumer-secret
PESAPAL_CALLBACK_URL=https://tafuta.ke/api/payments/callback
PESAPAL_IPN_URL=https://tafuta.ke/api/payments/webhook

# VintEx SMS
VINTEX_API_KEY=your-vintex-api-key
VINTEX_SENDER_ID=TAFUTA

# Mailgun
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=tafuta.ke

# Cloudflare
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token
CLOUDFLARE_ZONE_ID=your-cloudflare-zone-id

# File Upload
UPLOAD_PATH=/var/www/tafuta/uploads
MAX_FILE_SIZE=2097152  # 2MB in bytes

# Rate Limiting
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX_REQUESTS=100
```

**Security:**
- Never commit `.env` to version control
- Use `.env.example` as template
- Restrict file permissions: `chmod 600 .env`
- Rotate secrets regularly

---

## Deployment Process

### Initial Deployment

**1. Server Preparation:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL 15
sudo apt install -y postgresql-15 postgresql-contrib

# Install Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# Install PM2
sudo npm install -g pm2
```

**2. Application Setup:**
```bash
# Create application directory
sudo mkdir -p /var/www/tafuta
sudo chown $USER:$USER /var/www/tafuta

# Clone repository (or upload files)
cd /var/www/tafuta
git clone https://github.com/your-org/tafuta.git .

# Install backend dependencies
cd backend
npm ci --production

# Build frontend
cd ../frontend
npm ci
npm run build

# Copy build to deployment directory
cp -r dist /var/www/tafuta/frontend/
```

**3. Database Setup:**
```bash
# Run migrations
cd /var/www/tafuta/backend
npm run migrate:prod

# Seed initial data (categories, regions, system config)
npm run seed:prod
```

**4. Start Application:**
```bash
# Start with PM2
cd /var/www/tafuta/backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Configure Caddy
sudo cp /var/www/tafuta/Caddyfile /etc/caddy/Caddyfile
sudo systemctl restart caddy
```

**5. Verify Deployment:**
```bash
# Check PM2 status
pm2 status

# Check Caddy status
sudo systemctl status caddy

# Check PostgreSQL status
sudo systemctl status postgresql

# Test application
curl https://tafuta.ke/api/health
```

### Continuous Deployment

**Deployment Script (`deploy.sh`):**
```bash
#!/bin/bash
set -e

echo "🚀 Deploying Tafuta..."

# Pull latest code
git pull origin main

# Install backend dependencies
cd backend
npm ci --production

# Run migrations
npm run migrate:prod

# Build frontend
cd ../frontend
npm ci
npm run build

# Copy build to deployment directory
rm -rf /var/www/tafuta/frontend/dist
cp -r dist /var/www/tafuta/frontend/

# Reload backend (zero-downtime)
cd ../backend
pm2 reload tafuta-backend

echo "✅ Deployment complete!"
```

**Usage:**
```bash
cd /var/www/tafuta
./deploy.sh
```

**Future Enhancement**: Set up CI/CD pipeline (GitHub Actions, GitLab CI) for automated deployments.

---

## Backup Strategy

### Database Backups

**Automated Daily Backups:**

**Backup Script (`/var/www/tafuta/scripts/backup-db.sh`):**
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/tafuta/db"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/tafuta_$DATE.sql.gz"

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

# Create backup
pg_dump -U tafuta_user tafuta | gzip > $BACKUP_FILE

# Delete backups older than 30 days
find $BACKUP_DIR -name "tafuta_*.sql.gz" -mtime +30 -delete

echo "Backup created: $BACKUP_FILE"
```

**Cron Job (daily at 2 AM):**
```bash
# Edit crontab
crontab -e

# Add line:
0 2 * * * /var/www/tafuta/scripts/backup-db.sh >> /var/www/tafuta/logs/backup.log 2>&1
```

**Restore from Backup:**
```bash
# Restore database
gunzip -c /var/backups/tafuta/db/tafuta_20260222_020000.sql.gz | psql -U tafuta_user tafuta
```

### File Backups

**Uploaded Files:**
- Backup `/var/www/tafuta/uploads/` daily
- Sync to remote storage (S3, Backblaze B2, etc.)
- Retention: 30 days

**Backup Script (`/var/www/tafuta/scripts/backup-files.sh`):**
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/tafuta/files"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/uploads_$DATE.tar.gz"

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

# Create backup
tar -czf $BACKUP_FILE /var/www/tafuta/uploads/

# Delete backups older than 30 days
find $BACKUP_DIR -name "uploads_*.tar.gz" -mtime +30 -delete

echo "File backup created: $BACKUP_FILE"
```

**Cron Job (daily at 3 AM):**
```bash
0 3 * * * /var/www/tafuta/scripts/backup-files.sh >> /var/www/tafuta/logs/backup.log 2>&1
```

### Off-Site Backups

**Recommended**: Sync backups to remote storage daily

**Example with rclone (to Backblaze B2):**
```bash
# Install rclone
sudo apt install rclone

# Configure remote
rclone config

# Sync backups to remote
rclone sync /var/backups/tafuta/ b2:tafuta-backups/
```

**Cron Job (daily at 4 AM):**
```bash
0 4 * * * rclone sync /var/backups/tafuta/ b2:tafuta-backups/ >> /var/www/tafuta/logs/backup.log 2>&1
```

---

## Monitoring & Logging

### Application Logging

**Logging Library**: Winston or Pino

**Log Levels:**
- **error**: Critical errors requiring immediate attention
- **warn**: Warning messages (non-critical issues)
- **info**: General informational messages
- **debug**: Detailed debugging information (development only)

**Log Format:**
```json
{
  "timestamp": "2026-02-22T20:00:00Z",
  "level": "info",
  "message": "User logged in",
  "userId": "uuid",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

**Log Files:**
- `/var/www/tafuta/logs/app.log` - Application logs
- `/var/www/tafuta/logs/error.log` - Error logs only
- `/var/www/tafuta/logs/access.log` - HTTP access logs (Caddy)

**Log Rotation:**
```bash
# Install logrotate
sudo apt install logrotate

# Configure log rotation (/etc/logrotate.d/tafuta)
/var/www/tafuta/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0644 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Server Monitoring

**Basic Monitoring (MVP):**

**1. Resource Monitoring:**
```bash
# Install htop for interactive monitoring
sudo apt install htop

# Check CPU, RAM, disk usage
htop
df -h
free -h
```

**2. PM2 Monitoring:**
```bash
# Real-time monitoring
pm2 monit

# View metrics
pm2 describe tafuta-backend
```

**3. Database Monitoring:**
```bash
# Check active connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Check database size
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('tafuta'));"
```

**Future Enhancement**: Set up monitoring service (UptimeRobot, Pingdom, or self-hosted Grafana + Prometheus)

### Health Check Endpoint

**API Endpoint**: `GET /api/health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-22T20:00:00Z",
  "uptime": 86400,
  "database": "connected",
  "version": "1.0.0"
}
```

**Usage:**
- Monitor endpoint every 5 minutes
- Alert if endpoint returns error or timeout
- Use for load balancer health checks (future)

### Error Tracking

**MVP**: Log errors to file + email critical errors to admin

**Future Enhancement**: Integrate error tracking service (Sentry, Rollbar, etc.)

---

## Security

### Server Hardening

**1. Firewall (UFW):**
```bash
# Enable firewall
sudo ufw enable

# Allow SSH (change port if using non-standard)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS (Caddy)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Deny all other incoming traffic
sudo ufw default deny incoming
sudo ufw default allow outgoing
```

**2. SSH Security:**
```bash
# Disable root login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# Disable password authentication (use SSH keys only)
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config

# Restart SSH
sudo systemctl restart sshd
```

**3. Automatic Security Updates:**
```bash
# Install unattended-upgrades
sudo apt install unattended-upgrades

# Enable automatic security updates
sudo dpkg-reconfigure -plow unattended-upgrades
```

**4. Fail2Ban (Brute Force Protection):**
```bash
# Install fail2ban
sudo apt install fail2ban

# Configure fail2ban for SSH
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Application Security

**1. Environment Variables:**
- Never commit secrets to version control
- Use strong, random secrets (min 32 characters)
- Rotate secrets regularly (quarterly)

**2. Input Validation:**
- Validate all user input (backend and frontend)
- Use schema validation (Zod, Joi, etc.)
- Sanitize input to prevent XSS

**3. SQL Injection Prevention:**
- Use parameterized queries (ORM handles this)
- Never concatenate user input into SQL queries

**4. Rate Limiting:**
- Implement rate limiting on all endpoints
- Stricter limits on auth endpoints (OTP, login)
- Use Redis for distributed rate limiting (future)

**5. CORS Configuration:**
```javascript
// Express CORS configuration
app.use(cors({
  origin: ['https://tafuta.ke', 'https://*.tafuta.ke'],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**6. Security Headers:**
```javascript
// Use helmet middleware
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
```

### SSL/TLS

**Caddy handles SSL automatically:**
- Let's Encrypt certificates
- Automatic renewal
- Strong cipher suites
- HTTP/2 enabled
- HSTS header enabled

**Manual verification:**
```bash
# Test SSL configuration
curl -I https://tafuta.ke

# Check certificate expiry
echo | openssl s_client -servername tafuta.ke -connect tafuta.ke:443 2>/dev/null | openssl x509 -noout -dates
```

---

## Performance Optimization

### Backend Optimization

**1. Database Connection Pooling:**
```javascript
// PostgreSQL connection pool
const pool = new Pool({
  max: 20,              // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

**2. Query Optimization:**
- Use indexes for frequently queried fields
- Avoid N+1 queries (use joins or eager loading)
- Paginate large result sets
- Cache frequently accessed data (future: Redis)

**3. Response Compression:**
```javascript
// Enable gzip compression
const compression = require('compression');
app.use(compression());
```

**4. Caching Headers:**
```javascript
// Cache static assets
app.use('/uploads', express.static('uploads', {
  maxAge: '1y',
  immutable: true
}));
```

### Frontend Optimization

**1. Code Splitting:**
```javascript
// React lazy loading
const BusinessDetail = lazy(() => import('./pages/BusinessDetail'));
```

**2. Image Optimization:**
- Compress images before upload (backend validation)
- Serve WebP format (with JPEG fallback)
- Lazy load images below fold
- Use appropriate image sizes (no 4K images for thumbnails)

**3. Bundle Optimization:**
```javascript
// Vite build configuration
export default {
  build: {
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
};
```

**4. PWA Caching Strategy:**
```javascript
// Workbox configuration (network-first)
workbox.routing.registerRoute(
  ({request}) => request.destination === 'document' ||
                 request.destination === 'script' ||
                 request.destination === 'style',
  new workbox.strategies.NetworkFirst({
    cacheName: 'tafuta-assets',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      }),
    ],
  })
);
```

### CDN & Caching

**Cloudflare Configuration:**
- Enable Cloudflare CDN for static assets
- Cache static files (images, CSS, JS) at edge
- Set appropriate cache TTLs:
  - Images: 1 year
  - CSS/JS: 1 week (with versioned filenames)
  - HTML: No cache (always fresh)

**Cache-Control Headers:**
```javascript
// Static assets
Cache-Control: public, max-age=31536000, immutable

// API responses
Cache-Control: no-store, no-cache, must-revalidate

// Public search results
Cache-Control: public, max-age=300  // 5 minutes
```

---

## Testing

### Testing Strategy

**Testing Pyramid:**
1. **Unit Tests** (70%): Test individual functions/modules
2. **Integration Tests** (20%): Test API endpoints, database interactions
3. **E2E Tests** (10%): Test critical user flows

### Unit Testing

**Framework**: Jest or Vitest

**Coverage Target**: 70% minimum

**Example Test:**
```javascript
// tests/utils/validation.test.js
describe('Phone Validation', () => {
  test('validates Kenyan phone number', () => {
    expect(isValidKenyanPhone('+254712345678')).toBe(true);
  });
  
  test('rejects invalid phone number', () => {
    expect(isValidKenyanPhone('123456')).toBe(false);
  });
});
```

**Run Tests:**
```bash
npm test
npm run test:coverage
```

### Integration Testing

**Framework**: Supertest (for API testing)

**Example Test:**
```javascript
// tests/api/auth.test.js
describe('POST /api/auth/register', () => {
  test('creates new user with valid data', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'John Doe',
        phone: '+254712345678',
        terms_accepted: true,
        privacy_accepted: true
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

### End-to-End Testing

**Framework**: Playwright or Cypress

**Critical Flows to Test:**
1. User registration → Business creation → Approval → Goes live
2. Business owner purchases service → Payment → Service activated
3. Public user searches → Views business → Clicks call/website
4. Admin approves pending business → Owner notified

**Example E2E Test (Playwright):**
```javascript
// tests/e2e/business-registration.spec.js
test('complete business registration flow', async ({ page }) => {
  // Register user
  await page.goto('https://tafuta.ke/register');
  await page.fill('input[name="phone"]', '+254712345678');
  await page.click('button[type="submit"]');
  
  // Enter OTP (use test OTP in staging)
  await page.fill('input[name="otp"]', '123456');
  await page.click('button[type="submit"]');
  
  // Create business
  await page.goto('https://tafuta.ke/config');
  await page.click('text=Add New Business');
  await page.fill('input[name="business_name"]', 'Test Salon');
  await page.selectOption('select[name="category"]', 'salon');
  await page.click('button[type="submit"]');
  
  // Verify pending status
  await expect(page.locator('text=Pending Approval')).toBeVisible();
});
```

### Performance Testing

**Tool**: Apache Bench (ab) or k6

**Load Testing:**
```bash
# Test homepage (100 concurrent users, 1000 requests)
ab -n 1000 -c 100 https://tafuta.ke/

# Test API endpoint
ab -n 1000 -c 100 https://tafuta.ke/api/search?q=salon
```

**Performance Targets:**
- Homepage load time: < 2 seconds (3G)
- API response time: < 500ms (p95)
- Database query time: < 100ms (p95)
- Concurrent users: 100+ without degradation

### Security Testing

**1. Dependency Scanning:**
```bash
# Check for vulnerable dependencies
npm audit
npm audit fix
```

**2. OWASP Top 10:**
- SQL Injection: Test with parameterized queries
- XSS: Test input sanitization
- CSRF: Test SameSite cookie protection
- Authentication: Test rate limiting, session management

**3. Penetration Testing:**
- Manual testing of auth flows
- Automated scanning with OWASP ZAP (post-MVP)
- Third-party security audit (pre-launch)

---

## Disaster Recovery

### Backup Restoration

**Database Restore:**
```bash
# Stop application
pm2 stop tafuta-backend

# Restore database from backup
gunzip -c /var/backups/tafuta/db/tafuta_20260222_020000.sql.gz | psql -U tafuta_user tafuta

# Restart application
pm2 start tafuta-backend
```

**File Restore:**
```bash
# Restore uploaded files
tar -xzf /var/backups/tafuta/files/uploads_20260222_030000.tar.gz -C /
```

### Server Failure Recovery

**1. Provision new VPS:**
- Same specs as original
- Ubuntu 24.04 LTS

**2. Restore from backups:**
- Install software stack
- Restore database backup
- Restore file backups
- Deploy application code

**3. Update DNS:**
- Point tafuta.ke to new server IP
- Update Cloudflare DNS records

**Recovery Time Objective (RTO)**: 4 hours  
**Recovery Point Objective (RPO)**: 24 hours (daily backups)

---

## Scaling Strategy

### Vertical Scaling (Short-term)

**When to scale:**
- CPU usage > 70% sustained
- RAM usage > 80% sustained
- Database connections > 80% of max

**Upgrade path:**
1. 2 vCPUs, 4 GB RAM → 4 vCPUs, 8 GB RAM
2. 4 vCPUs, 8 GB RAM → 8 vCPUs, 16 GB RAM

### Horizontal Scaling (Long-term)

**Architecture:**
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
                          |
                  [Redis Cache] (future)
```

**Components:**
- **Load Balancer**: Nginx or HAProxy
- **App Servers**: Multiple Node.js instances
- **Database**: PostgreSQL with read replicas
- **Cache**: Redis for sessions and frequently accessed data
- **File Storage**: S3-compatible object storage

**Session Management:**
- Move sessions from PostgreSQL to Redis
- Enable sticky sessions on load balancer

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
- SMS (OTPs, notifications): ~5,000 KES ($35)
- Email: $0 (within free tier)
- Payment processing: Variable (3.5% of revenue)

**Total Monthly Operating Cost**: ~$65 + payment fees

---

## Pre-Launch Checklist

### Technical Checklist

- [ ] Server provisioned and configured
- [ ] Database created and migrations applied
- [ ] Application deployed and running
- [ ] HTTPS certificates active (Caddy)
- [ ] DNS configured (tafuta.ke and *.tafuta.ke)
- [ ] Backups configured and tested
- [ ] Monitoring and logging set up
- [ ] PM2 auto-restart configured
- [ ] Firewall rules configured
- [ ] Security headers enabled
- [ ] Rate limiting implemented
- [ ] Error tracking configured

### Integration Checklist

- [ ] PesaPal integration tested (sandbox and production)
- [ ] VintEx SMS integration tested
- [ ] Mailgun email integration tested
- [ ] Cloudflare DNS API tested
- [ ] Webhook endpoints tested (PesaPal IPN)

### Testing Checklist

- [ ] Unit tests passing (70%+ coverage)
- [ ] Integration tests passing
- [ ] E2E tests passing for critical flows
- [ ] Performance testing completed
- [ ] Security testing completed
- [ ] Mobile responsiveness tested
- [ ] Multi-language testing completed
- [ ] Cross-browser testing completed

### Data Checklist

- [ ] System config populated (legal identity, KRA PIN, VAT number)
- [ ] Categories seeded
- [ ] Regions seeded
- [ ] Service pricing configured
- [ ] Admin users created
- [ ] Email templates created
- [ ] SMS templates created

### Compliance Checklist

- [ ] Privacy Policy published
- [ ] Terms of Service published
- [ ] ODPC registration completed
- [ ] KRA/ETR compliance confirmed
- [ ] VAT receipt format approved
- [ ] Legal review completed

### Documentation Checklist

- [ ] API documentation complete
- [ ] Deployment guide complete
- [ ] Admin user guide complete
- [ ] Business owner guide complete
- [ ] Troubleshooting guide complete

---

## Post-Launch Monitoring

### Week 1 Monitoring

**Daily checks:**
- Server resource usage (CPU, RAM, disk)
- Application errors (check logs)
- Database performance (slow queries)
- Payment processing (success rate)
- SMS delivery (success rate)
- User registrations (count, errors)
- Business approvals (pending count, approval time)

**Metrics to track:**
- New user signups
- New business registrations
- Business approval rate
- Payment success rate
- API response times
- Error rates
- Uptime percentage

### Month 1 Review

**Performance Review:**
- Average page load time
- API response time percentiles (p50, p95, p99)
- Database query performance
- Server resource utilization

**Business Review:**
- Total users
- Total businesses
- Active subscriptions
- Revenue
- Churn rate

**Technical Debt:**
- Identify bottlenecks
- Plan optimizations
- Schedule refactoring

---

## Future Enhancements

### Infrastructure

- **Redis**: For caching and session management
- **CDN**: Dedicated CDN for uploaded images
- **Object Storage**: S3-compatible storage for files
- **Load Balancer**: For horizontal scaling
- **Database Replicas**: Read replicas for scaling
- **Monitoring**: Grafana + Prometheus for metrics
- **Error Tracking**: Sentry or Rollbar
- **CI/CD**: GitHub Actions or GitLab CI

### Performance

- **Database**: Query optimization, materialized views
- **Caching**: Redis for frequently accessed data
- **Search**: Elasticsearch for advanced search
- **Image Processing**: Automated image optimization
- **API**: GraphQL for flexible queries

### Security

- **2FA**: Two-factor authentication for admin
- **IP Whitelisting**: Restrict admin access to office IP
- **DDoS Protection**: Enhanced Cloudflare protection
- **Security Audits**: Regular third-party audits
- **Penetration Testing**: Annual pen tests

---

## Dependencies

### Production Dependencies

**Backend:**
- express (web framework)
- pg (PostgreSQL client)
- jsonwebtoken (JWT)
- bcrypt (password hashing)
- express-session (session management)
- connect-pg-simple (PostgreSQL session store)
- axios (HTTP client)
- dotenv (environment variables)
- helmet (security headers)
- cors (CORS middleware)
- compression (response compression)
- winston or pino (logging)

**Frontend:**
- react (UI library)
- react-dom (React DOM)
- react-router-dom (routing)
- axios (HTTP client)
- next-intl (internationalization)
- tailwindcss (CSS framework)
- @headlessui/react (accessible components)
- lucide-react (icons)
- react-hook-form (forms)
- zod (validation)
- workbox (PWA)

### Development Dependencies

- jest or vitest (testing)
- @testing-library/react (React testing)
- supertest (API testing)
- playwright or cypress (E2E testing)
- eslint (linting)
- prettier (code formatting)
- typescript (type checking - optional)

---

**End of PRD-06**
