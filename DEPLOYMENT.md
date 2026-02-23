# Tafuta Deployment Guide

Complete deployment instructions for Tafuta on Ubuntu 24 VPS.

## Prerequisites

- Ubuntu 24.04 VPS with root access
- Domain: tafuta.ke (DNS configured to point to VPS IP)
- Minimum 2GB RAM, 2 CPU cores, 20GB storage

## 1. System Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL 15
sudo apt install -y postgresql postgresql-contrib

# Install PM2 globally
sudo npm install -g pm2

# Install Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

## 2. Database Setup

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE DATABASE tafuta;
CREATE USER tafuta_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE tafuta TO tafuta_user;
\q
```

## 3. Application Deployment

```bash
# Create application directory
sudo mkdir -p /var/www/tafuta
sudo chown -R $USER:$USER /var/www/tafuta

# Clone repository
cd /var/www/tafuta
git clone https://github.com/yourusername/tafuta.git .

# Backend setup
cd backend
npm install --production

# Copy and configure environment
cp .env.example .env
nano .env
# Update all environment variables with production values

# Run database migrations
npm run migrate

# Create logs directory
mkdir -p logs

# Create uploads directory
mkdir -p /var/www/tafuta/uploads
chmod 755 /var/www/tafuta/uploads
```

## 4. Environment Configuration

Edit `/var/www/tafuta/backend/.env`:

```bash
# Application
NODE_ENV=production
PORT=3000
APP_URL=https://tafuta.ke

# Database
DATABASE_URL=postgresql://tafuta_user:your_secure_password@localhost:5432/tafuta

# JWT (generate strong random keys)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRY=60m

# Session
SESSION_SECRET=your-super-secret-session-key-min-32-chars

# PesaPal (production credentials)
PESAPAL_CONSUMER_KEY=your-pesapal-consumer-key
PESAPAL_CONSUMER_SECRET=your-pesapal-consumer-secret
PESAPAL_CALLBACK_URL=https://tafuta.ke/api/payments/callback
PESAPAL_IPN_URL=https://tafuta.ke/api/payments/webhook
PESAPAL_ENV=production

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
MAX_FILE_SIZE=2097152

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Frontend URL
FRONTEND_URL=https://tafuta.ke
```

## 5. PM2 Setup

```bash
# Start application with PM2
cd /var/www/tafuta/backend
pm2 start ecosystem.config.cjs

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command that PM2 outputs

# Monitor application
pm2 status
pm2 logs tafuta-backend
pm2 monit
```

## 6. Caddy Setup

```bash
# Copy Caddyfile
sudo cp /var/www/tafuta/Caddyfile /etc/caddy/Caddyfile

# Create log directory
sudo mkdir -p /var/log/caddy
sudo chown caddy:caddy /var/log/caddy

# Create business sites directory
sudo mkdir -p /var/www/tafuta/business-sites
sudo chown -R $USER:$USER /var/www/tafuta/business-sites

# Test Caddy configuration
sudo caddy validate --config /etc/caddy/Caddyfile

# Restart Caddy
sudo systemctl restart caddy
sudo systemctl enable caddy

# Check Caddy status
sudo systemctl status caddy
```

## 7. Firewall Configuration

```bash
# Install and configure UFW
sudo apt install -y ufw

# Allow SSH (important - don't lock yourself out!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## 8. Security Hardening

```bash
# Install fail2ban
sudo apt install -y fail2ban

# Configure fail2ban for SSH
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local
# Enable SSH jail and configure

# Restart fail2ban
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban

# Set up automatic security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## 9. Monitoring & Logs

```bash
# View application logs
pm2 logs tafuta-backend

# View Caddy logs
sudo tail -f /var/log/caddy/tafuta.log

# View PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# System resource monitoring
htop
```

## 10. Backup Strategy

```bash
# Database backup script
cat > /var/www/tafuta/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/www/tafuta/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
pg_dump -U tafuta_user tafuta | gzip > $BACKUP_DIR/tafuta_$DATE.sql.gz
# Keep only last 7 days
find $BACKUP_DIR -name "tafuta_*.sql.gz" -mtime +7 -delete
EOF

chmod +x /var/www/tafuta/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /var/www/tafuta/backup-db.sh
```

## 11. Post-Deployment Tasks

### Create First Admin User

```bash
# Connect to database
sudo -u postgres psql tafuta

# Create admin user (replace with actual values)
INSERT INTO users (full_name, phone, email, password_hash, verification_tier, status, terms_version, terms_accepted_at, privacy_version, privacy_accepted_at)
VALUES ('Admin User', '+254700000000', 'admin@tafuta.ke', '$2b$10$...', 'premium', 'active', '1.0', NOW(), '1.0', NOW());

# Get user_id from the insert
SELECT user_id FROM users WHERE email = 'admin@tafuta.ke';

# Create admin role (use the user_id from above)
INSERT INTO admin_users (user_id, role, is_active)
VALUES ('user-uuid-here', 'super_admin', true);

\q
```

### Register PesaPal IPN

```bash
# Call the PesaPal IPN registration endpoint
curl -X POST https://tafuta.ke/api/admin/pesapal/register-ipn \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

## 12. Health Checks

```bash
# Check API health
curl https://tafuta.ke/api/health

# Check database connection
sudo -u postgres psql tafuta -c "SELECT COUNT(*) FROM users;"

# Check PM2 status
pm2 status

# Check Caddy status
sudo systemctl status caddy

# Check disk space
df -h

# Check memory usage
free -h
```

## 13. Updating the Application

```bash
# Pull latest code
cd /var/www/tafuta
git pull origin main

# Update backend
cd backend
npm install --production

# Run new migrations
npm run migrate

# Restart application
pm2 restart tafuta-backend

# Check logs
pm2 logs tafuta-backend --lines 50
```

## 14. Troubleshooting

### Application won't start
```bash
pm2 logs tafuta-backend --err
# Check for missing environment variables or database connection issues
```

### Database connection errors
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check database exists
sudo -u postgres psql -l | grep tafuta

# Test connection
sudo -u postgres psql tafuta -c "SELECT 1;"
```

### Caddy SSL issues
```bash
# Check Caddy logs
sudo journalctl -u caddy -n 100

# Verify DNS is pointing to server
dig tafuta.ke
dig www.tafuta.ke

# Test Caddy config
sudo caddy validate --config /etc/caddy/Caddyfile
```

### High memory usage
```bash
# Check PM2 memory
pm2 monit

# Restart if needed
pm2 restart tafuta-backend

# Check for memory leaks in logs
pm2 logs tafuta-backend | grep -i "memory"
```

## 15. Maintenance Commands

```bash
# View all PM2 processes
pm2 list

# Restart application
pm2 restart tafuta-backend

# Stop application
pm2 stop tafuta-backend

# View real-time logs
pm2 logs tafuta-backend --lines 100

# Flush logs
pm2 flush

# Reload Caddy config
sudo systemctl reload caddy

# Restart PostgreSQL
sudo systemctl restart postgresql
```

## Support

For issues or questions:
- Check logs: `pm2 logs tafuta-backend`
- Review error logs: `tail -f /var/www/tafuta/backend/logs/error.log`
- Contact: support@tafuta.ke
