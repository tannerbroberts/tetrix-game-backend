import { pool } from '../config/database';
import { PublicLeaderboardResponse, UserLeaderboardResponse, LeaderboardEntry } from '../models/types';

/**
 * Get public leaderboard (no auth required)
 * Returns top 3 players and count of active players
 */
export async function getPublicLeaderboard(): Promise<PublicLeaderboardResponse> {
  // Get top 3 players by high score
  const topPlayersResult = await pool.query(
    `SELECT
       u.username,
       COALESCE((s.high_score_stats->'points'->>'total')::INTEGER, 0) as score,
       ROW_NUMBER() OVER (ORDER BY COALESCE((s.high_score_stats->'points'->>'total')::INTEGER, 0) DESC) as rank
     FROM users u
     LEFT JOIN statistics s ON s.user_id = u.id
     WHERE u.last_active IS NOT NULL
     ORDER BY score DESC, u.created_at ASC
     LIMIT 3`
  );

  // Count active players (played in last 30 days)
  const activePlayersResult = await pool.query(
    `SELECT COUNT(*) as count
     FROM users
     WHERE last_active > NOW() - INTERVAL '30 days'`
  );

  const topPlayers: LeaderboardEntry[] = topPlayersResult.rows.map((row) => ({
    username: row.username,
    score: row.score,
    rank: parseInt(row.rank),
  }));

  return {
    topPlayers,
    totalActivePlayers: parseInt(activePlayersResult.rows[0].count),
  };
}

/**
 * Get user-specific leaderboard (requires auth)
 * Returns top 10, user's rank, and points to next milestone
 */
export async function getUserLeaderboard(userId: string): Promise<UserLeaderboardResponse> {
  // Get top 10 players
  const topPlayersResult = await pool.query(
    `SELECT
       u.username,
       COALESCE((s.high_score_stats->'points'->>'total')::INTEGER, 0) as score,
       ROW_NUMBER() OVER (ORDER BY COALESCE((s.high_score_stats->'points'->>'total')::INTEGER, 0) DESC) as rank
     FROM users u
     LEFT JOIN statistics s ON s.user_id = u.id
     WHERE u.last_active IS NOT NULL
     ORDER BY score DESC, u.created_at ASC
     LIMIT 10`
  );

  // Get user's rank and score
  const userRankResult = await pool.query(
    `WITH ranked_users AS (
       SELECT
         u.id,
         u.username,
         COALESCE((s.high_score_stats->'points'->>'total')::INTEGER, 0) as score,
         ROW_NUMBER() OVER (ORDER BY COALESCE((s.high_score_stats->'points'->>'total')::INTEGER, 0) DESC, u.created_at ASC) as rank
       FROM users u
       LEFT JOIN statistics s ON s.user_id = u.id
       WHERE u.last_active IS NOT NULL
     )
     SELECT rank, score
     FROM ranked_users
     WHERE id = $1`,
    [userId]
  );

  // Count active players
  const activePlayersResult = await pool.query(
    `SELECT COUNT(*) as count
     FROM users
     WHERE last_active > NOW() - INTERVAL '30 days'`
  );

  const topPlayers: LeaderboardEntry[] = topPlayersResult.rows.map((row) => ({
    username: row.username,
    score: row.score,
    rank: parseInt(row.rank),
  }));

  const userRank = userRankResult.rows[0] ? parseInt(userRankResult.rows[0].rank) : 0;
  const userScore = userRankResult.rows[0] ? userRankResult.rows[0].score : 0;
  const totalActivePlayers = parseInt(activePlayersResult.rows[0].count);

  // Calculate points to next milestone
  const nextMilestone = calculateNextMilestone(userRank, userScore, topPlayersResult.rows);

  return {
    topPlayers,
    totalActivePlayers,
    userRank,
    userScore,
    pointsToNextMilestone: nextMilestone,
  };
}

/**
 * Calculate points needed to reach next milestone
 */
function calculateNextMilestone(
  userRank: number,
  userScore: number,
  topPlayers: any[]
): { milestone: string; pointsNeeded: number } | null {
  if (userRank === 0) {
    return null;
  }

  // If user is #1, no milestone
  if (userRank === 1) {
    return null;
  }

  // If in top 10, show points to 1st place
  if (userRank <= 10) {
    const firstPlaceScore = topPlayers[0]?.score || 0;
    const pointsNeeded = firstPlaceScore - userScore + 1;
    return {
      milestone: '1st place',
      pointsNeeded: Math.max(0, pointsNeeded),
    };
  }

  // If in top 100, show points to 10th place
  if (userRank <= 100) {
    const tenthPlaceScore = topPlayers[9]?.score || 0;
    const pointsNeeded = tenthPlaceScore - userScore + 1;
    return {
      milestone: '10th place',
      pointsNeeded: Math.max(0, pointsNeeded),
    };
  }

  // If in top 1000, show points to 100th place
  if (userRank <= 1000) {
    // Need to fetch 100th place score
    return {
      milestone: '100th place',
      pointsNeeded: 0, // TODO: fetch 100th place score
    };
  }

  // Beyond top 1000, show points to 1000th place
  return {
    milestone: '1000th place',
    pointsNeeded: 0, // TODO: fetch 1000th place score
  };
}
