-- Migration: Create auth_logs table
-- Created: 2026-02-22

CREATE TABLE IF NOT EXISTS auth_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(user_id),
  phone VARCHAR(20),
  email VARCHAR(255),
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('login_success', 'login_failed', 'logout', 'otp_requested', 'otp_verified', 'otp_failed', 'password_reset', 'account_created', 'account_deactivated', 'account_suspended', 'account_deleted')),
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_auth_logs_user_id ON auth_logs(user_id);
CREATE INDEX idx_auth_logs_phone ON auth_logs(phone);
CREATE INDEX idx_auth_logs_email ON auth_logs(email);
CREATE INDEX idx_auth_logs_event_type ON auth_logs(event_type);
CREATE INDEX idx_auth_logs_timestamp ON auth_logs(timestamp);
CREATE INDEX idx_auth_logs_ip_address ON auth_logs(ip_address);

-- Comments
COMMENT ON TABLE auth_logs IS 'Authentication and security event logs';
COMMENT ON COLUMN auth_logs.event_type IS 'Type of authentication event';
COMMENT ON COLUMN auth_logs.metadata IS 'Additional event-specific data';
