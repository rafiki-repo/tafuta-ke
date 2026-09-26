-- Enforces at most one active owner per business at the database level.
-- Previously this was only true by convention (a single code path ever inserted
-- role='owner'); the new admin owner-transfer endpoint is a second such path,
-- so this constraint now guards the invariant directly.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_business_active_owner
  ON user_business_roles (business_id)
  WHERE role = 'owner' AND is_deleted = false;
