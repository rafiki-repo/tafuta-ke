-- Migration: Create admin_users table
-- Created: 2026-02-22

CREATE TABLE IF NOT EXISTS admin_users (
  admin_user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'admin', 'support_staff')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(user_id),
  UNIQUE(user_id)
);

-- Indexes
CREATE INDEX idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX idx_admin_users_role ON admin_users(role);
CREATE INDEX idx_admin_users_is_active ON admin_users(is_active);

-- Comments
COMMENT ON TABLE admin_users IS 'Admin access control for Tafuta staff';
COMMENT ON COLUMN admin_users.role IS 'super_admin (full access), admin (business/user mgmt), support_staff (customer assistance)';
