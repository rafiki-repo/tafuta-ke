-- Migration: Create businesses table
-- Created: 2026-02-22

CREATE TABLE IF NOT EXISTS businesses (
  business_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  region VARCHAR(100) NOT NULL,
  subdomain VARCHAR(100) UNIQUE,
  logo_url VARCHAR(500),
  verification_tier VARCHAR(20) DEFAULT 'basic' CHECK (verification_tier IN ('basic', 'verified', 'premium')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'deactivated', 'out_of_business', 'suspended', 'deleted')),
  status_changed_at TIMESTAMP,
  deactivation_reason TEXT,
  rejection_reason TEXT,
  approved_by UUID REFERENCES users(user_id),
  approved_at TIMESTAMP,
  content_json JSONB NOT NULL DEFAULT '{}',
  content_version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_businesses_business_name ON businesses(business_name);
CREATE INDEX idx_businesses_category ON businesses(category);
CREATE INDEX idx_businesses_region ON businesses(region);
CREATE INDEX idx_businesses_subdomain ON businesses(subdomain);
CREATE INDEX idx_businesses_status ON businesses(status);
CREATE INDEX idx_businesses_verification_tier ON businesses(verification_tier);
CREATE INDEX idx_businesses_created_at ON businesses(created_at);

-- Full-text search index
CREATE INDEX idx_businesses_search ON businesses 
  USING gin(to_tsvector('english', business_name || ' ' || COALESCE(content_json->>'profile'->>'en'->>'description', '')));

-- JSONB index for content queries
CREATE INDEX idx_businesses_content_json ON businesses USING gin(content_json);

-- Comments
COMMENT ON TABLE businesses IS 'Business profiles and listings';
COMMENT ON COLUMN businesses.business_name IS 'Duplicated from content_json for indexing/search';
COMMENT ON COLUMN businesses.category IS 'Duplicated from content_json for filtering';
COMMENT ON COLUMN businesses.region IS 'Duplicated from content_json for filtering';
COMMENT ON COLUMN businesses.content_json IS 'All editable business profile and website content (multi-language)';
COMMENT ON COLUMN businesses.content_version IS 'Current version number of content';
COMMENT ON COLUMN businesses.status IS 'pending (awaiting approval), active, deactivated, out_of_business, suspended, deleted';
