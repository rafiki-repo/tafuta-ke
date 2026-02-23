-- Migration: Create refunds table
-- Created: 2026-02-22

CREATE TABLE IF NOT EXISTS refunds (
  refund_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(transaction_id),
  business_id UUID NOT NULL REFERENCES businesses(business_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id),
  refund_amount DECIMAL(10, 2) NOT NULL,
  processing_fee DECIMAL(10, 2) NOT NULL,
  net_refund DECIMAL(10, 2) NOT NULL,
  vat_reversal DECIMAL(10, 2) NOT NULL,
  items JSONB NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'rejected')),
  requested_by UUID NOT NULL REFERENCES users(user_id),
  approved_by UUID REFERENCES users(user_id),
  completed_by UUID REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_refunds_transaction_id ON refunds(transaction_id);
CREATE INDEX idx_refunds_business_id ON refunds(business_id);
CREATE INDEX idx_refunds_user_id ON refunds(user_id);
CREATE INDEX idx_refunds_status ON refunds(status);
CREATE INDEX idx_refunds_created_at ON refunds(created_at);

-- Comments
COMMENT ON TABLE refunds IS 'Refund requests for unused prepaid services';
COMMENT ON COLUMN refunds.items IS 'JSON array of services being refunded with months';
COMMENT ON COLUMN refunds.status IS 'pending, approved, completed, rejected';
COMMENT ON COLUMN refunds.processing_fee IS '5% processing fee';
