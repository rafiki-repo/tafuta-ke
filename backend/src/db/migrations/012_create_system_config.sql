-- Migration: Create system_config table
-- Created: 2026-02-22

CREATE TABLE IF NOT EXISTS system_config (
  config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_system_config_key ON system_config(key);

-- Insert default configuration
INSERT INTO system_config (key, value, description) VALUES
  ('legal_identity', '{
    "business_name": "eBiashara Rahisi Ltd",
    "kra_pin": "",
    "vat_registration_number": "",
    "business_address": "Nairobi, Kenya",
    "business_registration_number": ""
  }', 'Legal identity for receipts and compliance'),
  ('service_pricing', '{
    "website_hosting": 200,
    "ads": 200,
    "search_promotion": 150,
    "image_gallery": 100
  }', 'Service pricing in KES per month'),
  ('vat_rate', '0.16', 'VAT rate (16%)'),
  ('categories', '["salon", "restaurant", "shop", "hotel", "cyber", "entertainment", "church", "school", "hospital", "pharmacy", "mechanic", "other"]', 'Available business categories'),
  ('regions', '["Machakos", "Kisumu"]', 'Available regions for MVP')
ON CONFLICT (key) DO NOTHING;

-- Comments
COMMENT ON TABLE system_config IS 'System-wide configuration settings';
COMMENT ON COLUMN system_config.key IS 'Unique configuration key';
COMMENT ON COLUMN system_config.value IS 'Configuration value as JSON';
