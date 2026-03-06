-- Migration 014: Auth enhancements
-- - Make users.phone nullable (Google OAuth users may not have a phone)
-- - Add google_id column for Google OAuth accounts
-- - Create otp_sessions table for proper OTP storage and validation

-- Make phone nullable so Google OAuth users can register without a phone
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;

-- Add Google OAuth subject ID
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_key ON users (google_id) WHERE google_id IS NOT NULL;

-- OTP sessions: stores a hashed OTP per identifier (phone or email) with expiry and attempt tracking
CREATE TABLE IF NOT EXISTS otp_sessions (
  id          BIGSERIAL    PRIMARY KEY,
  identifier  VARCHAR(255) NOT NULL,
  otp_hash    VARCHAR(64)  NOT NULL,   -- SHA-256 hex digest of the 6-digit code
  expires_at  TIMESTAMPTZ  NOT NULL,
  attempts    INT          NOT NULL DEFAULT 0,
  used        BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS otp_sessions_identifier_expires_idx
  ON otp_sessions (identifier, expires_at);
