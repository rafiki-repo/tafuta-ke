-- Account admin: the Tafuta team member (a user with an active admin_users row)
-- responsible for a business listing. Managed by staff only; never returned to
-- business owners or the public. Kept as a column (not a user_business_roles row)
-- so it cannot be confused with the business-level 'admin' role or appear in the
-- owner's team list. ON DELETE SET NULL so removing a user never blocks on this.
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS account_admin_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_account_admin ON businesses (account_admin_user_id);

COMMENT ON COLUMN businesses.account_admin_user_id IS 'Private: Tafuta team member responsible for this listing; admin-only';
