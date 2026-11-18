-- Private business fields. Deliberately NOT stored in content_json, because
-- content_json is returned by public endpoints and searched by public search.
--   owner_name, employee_count : visible to the business owner/staff and admins only
--   internal_notes             : visible to platform admins only
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS owner_name TEXT,
  ADD COLUMN IF NOT EXISTS employee_count INTEGER CHECK (employee_count IS NULL OR employee_count >= 0),
  ADD COLUMN IF NOT EXISTS internal_notes TEXT;

COMMENT ON COLUMN businesses.owner_name IS 'Private: never shown on public pages';
COMMENT ON COLUMN businesses.employee_count IS 'Private: never shown on public pages';
COMMENT ON COLUMN businesses.internal_notes IS 'Private: Tafuta admin team only; never returned to owners or the public';
