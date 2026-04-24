import { Request, Response, NextFunction } from 'express';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Middleware to require authentication
 * Checks if user session exists and attaches userId to request
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  // Attach userId to request for use in controllers
  req.userId = req.session.userId;
  next();
}

/**
 * Middleware to optionally attach user if authenticated
 * Does not block request if not authenticated
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session?.userId) {
    req.userId = req.session.userId;
  }
  next();
}
