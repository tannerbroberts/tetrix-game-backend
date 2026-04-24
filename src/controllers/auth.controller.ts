import { Request, Response } from 'express';
import * as userService from '../services/userService';

/**
 * Register a new user
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    // Check if user already exists
    const exists = await userService.emailExists(email);
    if (exists) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    // Create user
    const user = await userService.createUser(email, password);

    // Create session
    req.session.userId = user.id;

    // Save session before responding
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
}

/**
 * Login existing user
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    // Verify credentials
    const user = await userService.verifyPassword(email, password);

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Update last login
    await userService.updateLastLogin(user.id);

    // Create session
    req.session.userId = user.id;

    // Save session before responding
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        lastLogin: new Date(),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
}

/**
 * Logout user
 */
export async function logout(req: Request, res: Response): Promise<void> {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        res.status(500).json({ error: 'Failed to logout' });
        return;
      }

      res.clearCookie('tetrix.sid');
      res.status(200).json({ message: 'Logged out successfully' });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
}

/**
 * Get current user info
 */
export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId!;

    const user = await userService.findUserById(userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
        lastLogin: user.last_login,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
}
