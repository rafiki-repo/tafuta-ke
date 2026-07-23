-- Migration 017: Category updates requested by admin
-- - Add new/updated categories to system_config.categories
-- - Reclassify selected businesses

-- Ensure the categories config exists
INSERT INTO system_config (key, value, description)
VALUES ('categories', '[]'::jsonb, 'Available business categories')
ON CONFLICT (key) DO NOTHING;

-- Merge requested categories into the configured category list without dropping existing values
UPDATE system_config
SET value = (
  SELECT jsonb_agg(category ORDER BY lower(category))
  FROM (
    SELECT DISTINCT category
    FROM (
      SELECT jsonb_array_elements_text(value) AS category
      FROM system_config
      WHERE key = 'categories'
      UNION ALL SELECT 'Household and Electronics'
      UNION ALL SELECT 'Technology'
      UNION ALL SELECT 'Studio'
    ) all_categories
    WHERE category IS NOT NULL AND btrim(category) != ''
  ) deduped
),
updated_at = NOW()
WHERE key = 'categories';

-- DK Secondhand → Household and Electronics
UPDATE businesses
SET category = 'Household and Electronics',
    content_json = CASE
      WHEN content_json #> '{profile,en}' IS NOT NULL
        THEN jsonb_set(content_json, '{profile,en,category}', to_jsonb('Household and Electronics'::text), true)
      ELSE content_json
    END,
    updated_at = NOW()
WHERE business_name ILIKE '%DK Secondhand%';

-- Daniel's computers/couputers/copters variants → Technology
UPDATE businesses
SET category = 'Technology',
    content_json = CASE
      WHEN content_json #> '{profile,en}' IS NOT NULL
        THEN jsonb_set(content_json, '{profile,en,category}', to_jsonb('Technology'::text), true)
      ELSE content_json
    END,
    updated_at = NOW()
WHERE business_name ILIKE '%Daniel%computer%'
   OR business_name ILIKE '%Daniel%coputer%'
   OR business_name ILIKE '%Daniel%computers%'
   OR business_name ILIKE '%Daniel''s computer%'
   OR business_name ILIKE '%Daniel''s coputer%';

-- Snap Image Studio → Studio
UPDATE businesses
SET category = 'Studio',
    content_json = CASE
      WHEN content_json #> '{profile,en}' IS NOT NULL
        THEN jsonb_set(content_json, '{profile,en,category}', to_jsonb('Studio'::text), true)
      ELSE content_json
    END,
    updated_at = NOW()
WHERE business_name ILIKE '%Snap Image Studio%';
