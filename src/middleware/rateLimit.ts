import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Rate limiter for user leaderboard endpoint
 * Allows 1 request per 5 seconds per user
 */
export const leaderboardRateLimit = rateLimit({
  windowMs: 5 * 1000, // 5 seconds
  max: 1, // 1 request per window
  message: {
    error: 'Too many requests. Please wait before requesting the leaderboard again.',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  keyGenerator: (req: Request) => {
    // Rate limit per authenticated user
    return req.userId || req.ip || 'anonymous';
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests. Please wait before requesting the leaderboard again.',
      retryAfter: 5,
    });
  },
});

/**
 * General API rate limiter
 * More permissive for general endpoints
 */
export const generalRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
