-- Migration: Create transactions table
-- Created: 2026-02-22

CREATE TABLE IF NOT EXISTS transactions (
  transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(business_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id),
  pesapal_tracking_id VARCHAR(255),
  pesapal_merchant_reference VARCHAR(255) UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  vat_amount DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'KES',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded')),
  payment_method VARCHAR(50),
  items JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_transactions_business_id ON transactions(business_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_pesapal_tracking_id ON transactions(pesapal_tracking_id);
CREATE INDEX idx_transactions_pesapal_merchant_reference ON transactions(pesapal_merchant_reference);

-- Comments
COMMENT ON TABLE transactions IS 'Payment transactions for business services';
COMMENT ON COLUMN transactions.items IS 'JSON array of purchased items with service_type and months';
COMMENT ON COLUMN transactions.status IS 'pending, completed, failed, cancelled, refunded';
