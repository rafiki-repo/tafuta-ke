-- Migration: Add sequential receipt numbers to transactions
-- Created: 2026-05-01

CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1;

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(20) UNIQUE;
