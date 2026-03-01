-- Migration 013: Add business_tag column to businesses table
-- business_tag is a human-readable slug used as the media folder name (PRD-07)
-- Format: lowercase letters, numbers, and hyphens; max 64 chars; globally unique

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS business_tag VARCHAR(64);

-- Backfill existing rows: slugify business_name (up to 45 chars) + first 6 chars of UUID
-- The UUID suffix guarantees uniqueness even when business names are similar
UPDATE businesses
SET business_tag =
  REGEXP_REPLACE(
    SUBSTRING(
      REGEXP_REPLACE(LOWER(business_name), '[^a-z0-9]+', '-', 'g')
      FROM 1 FOR 45
    ) || '-' || LEFT(REPLACE(business_id::text, '-', ''), 6),
    '^-+|-+$', '', 'g'
  )
WHERE business_tag IS NULL;

ALTER TABLE businesses
  ALTER COLUMN business_tag SET NOT NULL;

ALTER TABLE businesses
  ADD CONSTRAINT businesses_business_tag_unique UNIQUE (business_tag);

CREATE INDEX IF NOT EXISTS idx_businesses_business_tag ON businesses(business_tag);
