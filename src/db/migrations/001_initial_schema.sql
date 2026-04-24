-- Tetrix Game Backend - Initial Database Schema
-- Migration 001: Create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- USERS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,

  CONSTRAINT email_lowercase CHECK (email = LOWER(email))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- =============================================================================
-- SESSION TABLE (managed by connect-pg-simple)
-- =============================================================================
CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);

-- =============================================================================
-- GAME STATES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS game_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  score INTEGER NOT NULL DEFAULT 0,
  total_lines_cleared INTEGER NOT NULL DEFAULT 0,
  shapes_used INTEGER NOT NULL DEFAULT 0,
  has_placed_first_shape BOOLEAN NOT NULL DEFAULT false,

  -- Board state (sparse representation)
  tiles JSONB NOT NULL DEFAULT '[]',

  -- Queue state
  next_queue JSONB NOT NULL DEFAULT '[]',
  saved_shape JSONB,
  unlocked_slots INTEGER[] NOT NULL DEFAULT '{1}',

  -- Queue configuration
  queue_mode VARCHAR(20) NOT NULL DEFAULT 'infinite',
  queue_color_probabilities JSONB,
  queue_hidden_shapes JSONB,
  queue_size INTEGER,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT one_game_per_user UNIQUE(user_id),
  CONSTRAINT valid_queue_mode CHECK (queue_mode IN ('infinite', 'finite')),
  CONSTRAINT valid_score CHECK (score >= 0)
);

CREATE INDEX IF NOT EXISTS idx_game_states_user_id ON game_states(user_id);
CREATE INDEX IF NOT EXISTS idx_game_states_updated_at ON game_states(updated_at);

-- GIN index for JSONB queries (if needed for analytics)
CREATE INDEX IF NOT EXISTS idx_game_states_tiles ON game_states USING GIN(tiles);

-- =============================================================================
-- STATISTICS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- All-time statistics
  all_time_stats JSONB NOT NULL DEFAULT '{}',

  -- High score (best single-game records)
  high_score_stats JSONB NOT NULL DEFAULT '{}',

  -- Current game statistics
  current_stats JSONB NOT NULL DEFAULT '{}',

  -- No-turn streak tracking
  no_turn_streak_current INTEGER NOT NULL DEFAULT 0,
  no_turn_streak_best_in_game INTEGER NOT NULL DEFAULT 0,
  no_turn_streak_all_time_best INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT one_stats_per_user UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_statistics_user_id ON statistics(user_id);

-- GIN index for JSONB stats queries
CREATE INDEX IF NOT EXISTS idx_statistics_all_time ON statistics USING GIN(all_time_stats);
CREATE INDEX IF NOT EXISTS idx_statistics_high_score ON statistics USING GIN(high_score_stats);

-- =============================================================================
-- SETTINGS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Audio settings
  music_is_muted BOOLEAN NOT NULL DEFAULT false,
  music_volume INTEGER NOT NULL DEFAULT 100,
  music_is_enabled BOOLEAN NOT NULL DEFAULT true,
  sound_effects_is_muted BOOLEAN NOT NULL DEFAULT false,
  sound_effects_volume INTEGER NOT NULL DEFAULT 100,
  sound_effects_is_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Visual settings
  theme VARCHAR(50) NOT NULL DEFAULT 'dark',
  block_theme VARCHAR(50) NOT NULL DEFAULT 'gem',
  show_block_icons BOOLEAN NOT NULL DEFAULT true,
  button_size_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00,

  -- Gameplay settings
  grandpa_mode BOOLEAN NOT NULL DEFAULT false,
  debug_unlocked BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT one_settings_per_user UNIQUE(user_id),
  CONSTRAINT valid_theme CHECK (theme IN ('dark', 'light', 'block-blast')),
  CONSTRAINT valid_block_theme CHECK (block_theme IN ('gem', 'simple', 'pixel')),
  CONSTRAINT valid_music_volume CHECK (music_volume >= 0 AND music_volume <= 100),
  CONSTRAINT valid_sound_volume CHECK (sound_effects_volume >= 0 AND sound_effects_volume <= 100),
  CONSTRAINT valid_button_size CHECK (button_size_multiplier >= 0.5 AND button_size_multiplier <= 1.5)
);

CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);

-- =============================================================================
-- MODIFIERS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS modifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unlocked_modifiers INTEGER[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT one_modifiers_per_user UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_modifiers_user_id ON modifiers(user_id);
