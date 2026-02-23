-- Migration: Create users table
-- Created: 2026-02-22

CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  nickname VARCHAR(100),
  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  language VARCHAR(10) DEFAULT 'en',
  verification_tier VARCHAR(20) DEFAULT 'unverified' CHECK (verification_tier IN ('unverified', 'basic', 'verified', 'premium')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'deactivated', 'suspended', 'deleted')),
  status_changed_at TIMESTAMP,
  deactivation_reason TEXT,
  phone_verified BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  profile_photo_url VARCHAR(500),
  marketing_sms_opt_in BOOLEAN DEFAULT FALSE,
  marketing_email_opt_in BOOLEAN DEFAULT FALSE,
  terms_version VARCHAR(20),
  terms_accepted_at TIMESTAMP,
  privacy_version VARCHAR(20),
  privacy_accepted_at TIMESTAMP,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_verification_tier ON users(verification_tier);

-- Comments
COMMENT ON TABLE users IS 'User accounts for Tafuta platform';
COMMENT ON COLUMN users.verification_tier IS 'User verification level: unverified, basic (phone verified), verified (admin confirmed), premium';
COMMENT ON COLUMN users.status IS 'Account status: active, deactivated (user paused), suspended (admin), deleted (soft delete)';
