-- Migration: Create user_business_roles table
-- Created: 2026-02-22

CREATE TABLE IF NOT EXISTS user_business_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(business_id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'employee')),
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, business_id, role)
);

-- Indexes
CREATE INDEX idx_user_business_user_id ON user_business_roles(user_id);
CREATE INDEX idx_user_business_business_id ON user_business_roles(business_id);
CREATE INDEX idx_user_business_role ON user_business_roles(role);
CREATE INDEX idx_user_business_is_deleted ON user_business_roles(is_deleted);

-- Comments
COMMENT ON TABLE user_business_roles IS 'Many-to-many relationship between users and businesses with roles';
COMMENT ON COLUMN user_business_roles.role IS 'User role: owner (full control), admin (manage settings), employee (limited access)';
COMMENT ON COLUMN user_business_roles.is_deleted IS 'Soft delete flag';
