-- Migration: Create audit_logs table
-- Created: 2026-02-22

CREATE TABLE IF NOT EXISTS audit_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(user_id),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  ip_address VARCHAR(45),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Comments
COMMENT ON TABLE audit_logs IS 'Audit trail for admin actions and system changes';
COMMENT ON COLUMN audit_logs.action IS 'Action performed (e.g., approved_business, adjusted_expiration, content_rollback)';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity affected (e.g., business, user, subscription)';
