-- Migration: Add next_shape_id_counter for server-authoritative game logic
-- This counter tracks the next ID to assign to generated shapes

ALTER TABLE game_states
ADD COLUMN IF NOT EXISTS next_shape_id_counter INTEGER NOT NULL DEFAULT 0;

-- Initialize counter for existing users based on max queue ID
-- Since we don't currently store IDs in the queue, start from array length
UPDATE game_states
SET next_shape_id_counter = CASE
  WHEN next_queue IS NOT NULL THEN jsonb_array_length(next_queue)
  ELSE 0
END
WHERE next_shape_id_counter = 0;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_game_states_user_id ON game_states(user_id);
