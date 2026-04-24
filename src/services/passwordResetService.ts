import { pool } from '../config/database';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { PasswordResetToken } from '../models/types';
import * as userService from './userService';

const TOKEN_EXPIRY_HOURS = 1;

/**
 * Generate a secure random token
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a token for storage
 */
async function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, 10);
}

/**
 * Create a password reset token for a user
 * Returns the plain token (to be sent via email)
 */
export async function createResetToken(email: string): Promise<string | null> {
  // Find user by email
  const user = await userService.findUserByEmail(email);

  if (!user) {
    return null;
  }

  // Generate token
  const plainToken = generateToken();
  const tokenHash = await hashToken(plainToken);

  // Calculate expiry (1 hour from now)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

  // Store hashed token in database
  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt]
  );

  return plainToken;
}

/**
 * Verify a reset token is valid
 * Returns the user ID if valid, null otherwise
 */
export async function verifyResetToken(plainToken: string): Promise<string | null> {
  // Get all non-expired, non-used tokens
  const result = await pool.query(
    `SELECT id, user_id, token_hash, expires_at, used_at
     FROM password_reset_tokens
     WHERE expires_at > NOW()
       AND used_at IS NULL
     ORDER BY created_at DESC`,
  );

  // Check each token hash against the provided token
  for (const row of result.rows) {
    const isValid = await bcrypt.compare(plainToken, row.token_hash);
    if (isValid) {
      return row.user_id;
    }
  }

  return null;
}

/**
 * Consume a reset token and update user's password
 */
export async function consumeResetToken(plainToken: string, newPassword: string): Promise<boolean> {
  // Verify token and get user ID
  const userId = await verifyResetToken(plainToken);

  if (!userId) {
    return false;
  }

  // Get the token record to mark it as used
  const tokenResult = await pool.query(
    `SELECT id, token_hash
     FROM password_reset_tokens
     WHERE user_id = $1
       AND expires_at > NOW()
       AND used_at IS NULL
     ORDER BY created_at DESC`,
    [userId]
  );

  // Find the matching token
  let tokenId: string | null = null;
  for (const row of tokenResult.rows) {
    const isValid = await bcrypt.compare(plainToken, row.token_hash);
    if (isValid) {
      tokenId = row.id;
      break;
    }
  }

  if (!tokenId) {
    return false;
  }

  // Update password and mark token as used in a transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update user password
    await userService.updatePassword(userId, newPassword);

    // Mark token as used
    await client.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE id = $1`,
      [tokenId]
    );

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Clean up expired tokens (should be run periodically)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await pool.query(
    `DELETE FROM password_reset_tokens
     WHERE expires_at < NOW() - INTERVAL '7 days'
     RETURNING id`
  );

  return result.rowCount || 0;
}
