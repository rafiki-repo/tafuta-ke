-- Migration: Create business_content_history table
-- Created: 2026-02-22

CREATE TABLE IF NOT EXISTS business_content_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(business_id) ON DELETE CASCADE,
  content_json JSONB NOT NULL,
  content_version INTEGER NOT NULL,
  changed_by UUID REFERENCES users(user_id),
  change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('owner_edit', 'admin_edit', 'ai_edit', 'approval', 'system')),
  change_summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_history_business_id ON business_content_history(business_id);
CREATE INDEX idx_history_version ON business_content_history(business_id, content_version);
CREATE INDEX idx_history_created_at ON business_content_history(created_at);
CREATE INDEX idx_history_changed_by ON business_content_history(changed_by);

-- Comments
COMMENT ON TABLE business_content_history IS 'Version history of business content changes';
COMMENT ON COLUMN business_content_history.change_type IS 'Type of change: owner_edit, admin_edit, ai_edit, approval, system';
COMMENT ON COLUMN business_content_history.change_summary IS 'Brief description of what changed';
