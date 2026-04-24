import { Request, Response } from 'express';
import * as leaderboardService from '../services/leaderboardService';

/**
 * Get public leaderboard (no auth required)
 */
export async function getPublicLeaderboard(req: Request, res: Response): Promise<void> {
  try {
    const leaderboard = await leaderboardService.getPublicLeaderboard();
    res.status(200).json(leaderboard);
  } catch (error) {
    console.error('Get public leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
}

/**
 * Get user-specific leaderboard (requires auth)
 */
export async function getUserLeaderboard(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId!;

    const leaderboard = await leaderboardService.getUserLeaderboard(userId);
    res.status(200).json(leaderboard);
  } catch (error) {
    console.error('Get user leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
}
