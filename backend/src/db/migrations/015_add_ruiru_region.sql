-- Migration: Add Ruiru to available regions
-- Created: 2026-03-27

UPDATE system_config
SET value = '["Machakos", "Kisumu", "Ruiru"]',
    updated_at = NOW()
WHERE key = 'regions';
