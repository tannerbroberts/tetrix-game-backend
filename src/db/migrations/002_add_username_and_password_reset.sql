-- Tetrix Game Backend - Migration 002
-- Add username support and password reset functionality

-- =============================================================================
-- UPDATE USERS TABLE
-- =============================================================================

-- Add username column (initially nullable to allow existing users)
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50);

-- Add last_active column for tracking active players
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE;

-- Create unique index on username (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users(LOWER(username));

-- Add constraint for username format (alphanumeric + underscore only)
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS username_format
  CHECK (username ~ '^[a-zA-Z0-9_]+$');

-- Add constraint for username length
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS username_length
  CHECK (LENGTH(username) >= 3 AND LENGTH(username) <= 20);

-- Index for finding active players
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active);

-- =============================================================================
-- PASSWORD RESET TOKENS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Index for token lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);

-- Index for finding expired tokens (for cleanup)
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);

-- Index for finding unused tokens
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_used ON password_reset_tokens(used_at);

-- Index for user's tokens
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);

-- =============================================================================
-- UPDATE EXISTING DATA
-- =============================================================================

-- For existing users without username, generate from email
-- This is safe for initial migration; new users must provide username
UPDATE users
SET username = SUBSTRING(email FROM '^([^@]+)') || '_' || SUBSTRING(CAST(id AS TEXT) FROM 1 FOR 8)
WHERE username IS NULL;

-- Set last_active to last_login for existing users
UPDATE users
SET last_active = COALESCE(last_login, created_at)
WHERE last_active IS NULL;

-- Now make username NOT NULL
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
