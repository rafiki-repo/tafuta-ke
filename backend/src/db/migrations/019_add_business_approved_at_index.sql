-- Migration: Add index on businesses.approved_at for active-business growth queries

CREATE INDEX idx_businesses_approved_at ON businesses(approved_at) WHERE status = 'active';
