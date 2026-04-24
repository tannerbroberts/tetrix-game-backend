import { pool } from '../config/database';
import { PoolClient } from 'pg';
import { SavedGameState, TileData, SerializedQueueItem, Shape, ColorProbability } from '../models/types';

/**
 * Load game state for a user
 */
export async function loadGameState(userId: string): Promise<SavedGameState | null> {
  const result = await pool.query(
    `SELECT
      version, score, total_lines_cleared, shapes_used, has_placed_first_shape,
      tiles, next_queue, saved_shape, unlocked_slots,
      queue_mode, queue_color_probabilities, queue_hidden_shapes, queue_size,
      updated_at
    FROM game_states
    WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];

  // Load statistics separately
  const statsResult = await pool.query(
    `SELECT all_time_stats, high_score_stats, current_stats,
            no_turn_streak_current, no_turn_streak_best_in_game, no_turn_streak_all_time_best,
            updated_at
     FROM statistics
     WHERE user_id = $1`,
    [userId]
  );

  const stats = statsResult.rows[0] || {
    all_time_stats: {},
    high_score_stats: {},
    current_stats: {},
    no_turn_streak_current: 0,
    no_turn_streak_best_in_game: 0,
    no_turn_streak_all_time_best: 0,
    updated_at: new Date(),
  };

  return {
    version: row.version,
    score: row.score,
    tiles: row.tiles,
    nextQueue: row.next_queue,
    savedShape: row.saved_shape,
    totalLinesCleared: row.total_lines_cleared,
    shapesUsed: row.shapes_used,
    hasPlacedFirstShape: row.has_placed_first_shape,
    stats: {
      allTime: stats.all_time_stats,
      highScore: stats.high_score_stats,
      current: stats.current_stats,
      noTurnStreak: {
        current: stats.no_turn_streak_current,
        bestInGame: stats.no_turn_streak_best_in_game,
        allTimeBest: stats.no_turn_streak_all_time_best,
      },
      lastUpdated: stats.updated_at.getTime(),
    },
    queueMode: row.queue_mode,
    queueColorProbabilities: row.queue_color_probabilities,
    queueHiddenShapes: row.queue_hidden_shapes,
    queueSize: row.queue_size,
    unlockedSlots: row.unlocked_slots,
    lastUpdated: row.updated_at.getTime(),
  };
}

/**
 * Save or update game state
 */
export async function saveGameState(
  userId: string,
  gameState: Partial<SavedGameState>
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if game state exists
    const existsResult = await client.query(
      'SELECT id FROM game_states WHERE user_id = $1',
      [userId]
    );

    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Build dynamic UPDATE query
    if (gameState.score !== undefined) {
      fields.push(`score = $${paramCount++}`);
      values.push(gameState.score);
    }
    if (gameState.tiles !== undefined) {
      fields.push(`tiles = $${paramCount++}`);
      values.push(JSON.stringify(gameState.tiles));
    }
    if (gameState.nextQueue !== undefined) {
      fields.push(`next_queue = $${paramCount++}`);
      values.push(JSON.stringify(gameState.nextQueue));
    }
    if (gameState.savedShape !== undefined) {
      fields.push(`saved_shape = $${paramCount++}`);
      values.push(gameState.savedShape ? JSON.stringify(gameState.savedShape) : null);
    }
    if (gameState.totalLinesCleared !== undefined) {
      fields.push(`total_lines_cleared = $${paramCount++}`);
      values.push(gameState.totalLinesCleared);
    }
    if (gameState.shapesUsed !== undefined) {
      fields.push(`shapes_used = $${paramCount++}`);
      values.push(gameState.shapesUsed);
    }
    if (gameState.hasPlacedFirstShape !== undefined) {
      fields.push(`has_placed_first_shape = $${paramCount++}`);
      values.push(gameState.hasPlacedFirstShape);
    }
    if (gameState.queueMode !== undefined) {
      fields.push(`queue_mode = $${paramCount++}`);
      values.push(gameState.queueMode);
    }
    if (gameState.queueColorProbabilities !== undefined) {
      fields.push(`queue_color_probabilities = $${paramCount++}`);
      values.push(JSON.stringify(gameState.queueColorProbabilities));
    }
    if (gameState.queueHiddenShapes !== undefined) {
      fields.push(`queue_hidden_shapes = $${paramCount++}`);
      values.push(JSON.stringify(gameState.queueHiddenShapes));
    }
    if (gameState.queueSize !== undefined) {
      fields.push(`queue_size = $${paramCount++}`);
      values.push(gameState.queueSize);
    }
    if (gameState.unlockedSlots !== undefined) {
      fields.push(`unlocked_slots = $${paramCount++}`);
      values.push(gameState.unlockedSlots);
    }

    fields.push(`updated_at = NOW()`);
    values.push(userId);

    if (existsResult.rows.length === 0) {
      // Insert new game state
      await client.query(
        `INSERT INTO game_states (user_id, version, score, tiles, next_queue, saved_shape,
                                  total_lines_cleared, shapes_used, has_placed_first_shape,
                                  queue_mode, queue_color_probabilities, queue_hidden_shapes, queue_size, unlocked_slots)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          userId,
          gameState.version || '1.0.0',
          gameState.score || 0,
          JSON.stringify(gameState.tiles || []),
          JSON.stringify(gameState.nextQueue || []),
          gameState.savedShape ? JSON.stringify(gameState.savedShape) : null,
          gameState.totalLinesCleared || 0,
          gameState.shapesUsed || 0,
          gameState.hasPlacedFirstShape || false,
          gameState.queueMode || 'infinite',
          JSON.stringify(gameState.queueColorProbabilities || []),
          JSON.stringify(gameState.queueHiddenShapes || []),
          gameState.queueSize || -1,
          gameState.unlockedSlots || [1],
        ]
      );

      // Initialize statistics
      await client.query(
        `INSERT INTO statistics (user_id, all_time_stats, high_score_stats, current_stats)
         VALUES ($1, $2, $3, $4)`,
        [
          userId,
          JSON.stringify(gameState.stats?.allTime || {}),
          JSON.stringify(gameState.stats?.highScore || {}),
          JSON.stringify(gameState.stats?.current || {}),
        ]
      );

      // Initialize settings
      await client.query(
        `INSERT INTO settings (user_id) VALUES ($1)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );

      // Initialize modifiers
      await client.query(
        `INSERT INTO modifiers (user_id) VALUES ($1)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );
    } else {
      // Update existing game state
      if (fields.length > 1) { // More than just updated_at
        await client.query(
          `UPDATE game_states
           SET ${fields.join(', ')}
           WHERE user_id = $${paramCount}`,
          values
        );
      }

      // Update statistics if provided
      if (gameState.stats) {
        const statsFields: string[] = [];
        const statsValues: any[] = [];
        let statsParamCount = 1;

        if (gameState.stats.allTime) {
          statsFields.push(`all_time_stats = $${statsParamCount++}`);
          statsValues.push(JSON.stringify(gameState.stats.allTime));
        }
        if (gameState.stats.highScore) {
          statsFields.push(`high_score_stats = $${statsParamCount++}`);
          statsValues.push(JSON.stringify(gameState.stats.highScore));
        }
        if (gameState.stats.current) {
          statsFields.push(`current_stats = $${statsParamCount++}`);
          statsValues.push(JSON.stringify(gameState.stats.current));
        }
        if (gameState.stats.noTurnStreak) {
          statsFields.push(`no_turn_streak_current = $${statsParamCount++}`);
          statsValues.push(gameState.stats.noTurnStreak.current);
          statsFields.push(`no_turn_streak_best_in_game = $${statsParamCount++}`);
          statsValues.push(gameState.stats.noTurnStreak.bestInGame);
          statsFields.push(`no_turn_streak_all_time_best = $${statsParamCount++}`);
          statsValues.push(gameState.stats.noTurnStreak.allTimeBest);
        }

        statsFields.push(`updated_at = NOW()`);
        statsValues.push(userId);

        if (statsFields.length > 1) {
          await client.query(
            `UPDATE statistics
             SET ${statsFields.join(', ')}
             WHERE user_id = $${statsParamCount}`,
            statsValues
          );
        }
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Reset game state (keep all-time stats)
 */
export async function resetGameState(userId: string): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Reset game state to defaults
    await client.query(
      `UPDATE game_states
       SET score = 0,
           tiles = '[]',
           next_queue = '[]',
           saved_shape = NULL,
           total_lines_cleared = 0,
           shapes_used = 0,
           has_placed_first_shape = FALSE,
           unlocked_slots = '{1}',
           updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );

    // Reset current stats but keep all-time and high score
    await client.query(
      `UPDATE statistics
       SET current_stats = '{}',
           no_turn_streak_current = 0,
           no_turn_streak_best_in_game = 0,
           updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
