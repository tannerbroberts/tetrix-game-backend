import { Router } from 'express';
import * as leaderboardController from '../controllers/leaderboard.controller';
import { requireAuth } from '../middleware/auth';
import { leaderboardRateLimit } from '../middleware/rateLimit';

const router = Router();

// GET /api/leaderboard/public - No authentication required
router.get('/public', leaderboardController.getPublicLeaderboard);

// GET /api/leaderboard/user - Requires authentication + rate limiting
router.get('/user', requireAuth, leaderboardRateLimit, leaderboardController.getUserLeaderboard);

export default router;
