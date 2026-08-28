-- Drop the hard-coded CHECK constraint that only allowed the original 4 service types.
-- Service type validation is now owned by system_config, so the DB constraint
-- becomes a maintenance burden every time a new type is added.
ALTER TABLE service_subscriptions
  DROP CONSTRAINT IF EXISTS service_subscriptions_service_type_check;
