-- Migration: Create service_subscriptions table
-- Created: 2026-02-22

CREATE TABLE IF NOT EXISTS service_subscriptions (
  subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(business_id) ON DELETE CASCADE,
  service_type VARCHAR(50) NOT NULL CHECK (service_type IN ('website_hosting', 'ads', 'search_promotion', 'image_gallery')),
  months_paid INTEGER NOT NULL DEFAULT 0,
  expiration_date DATE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(business_id, service_type)
);

-- Indexes
CREATE INDEX idx_subscriptions_business_id ON service_subscriptions(business_id);
CREATE INDEX idx_subscriptions_service_type ON service_subscriptions(service_type);
CREATE INDEX idx_subscriptions_expiration_date ON service_subscriptions(expiration_date);
CREATE INDEX idx_subscriptions_status ON service_subscriptions(status);

-- Comments
COMMENT ON TABLE service_subscriptions IS 'Business service subscriptions (website hosting, ads, etc.)';
COMMENT ON COLUMN service_subscriptions.months_paid IS 'Number of months paid for this service';
COMMENT ON COLUMN service_subscriptions.expiration_date IS 'Date when service expires';
COMMENT ON COLUMN service_subscriptions.status IS 'active, expired, cancelled';
