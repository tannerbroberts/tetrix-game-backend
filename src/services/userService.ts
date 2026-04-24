import { pool } from '../config/database';
import bcrypt from 'bcrypt';
import { User } from '../models/types';

const SALT_ROUNDS = 10;

/**
 * Create a new user with hashed password
 */
export async function createUser(username: string, email: string, password: string): Promise<User> {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await pool.query(
    `INSERT INTO users (username, email, password_hash, last_active)
     VALUES ($1, $2, $3, NOW())
     RETURNING id, username, email, created_at, updated_at, last_login, last_active`,
    [username, email, passwordHash]
  );

  return result.rows[0];
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await pool.query(
    `SELECT id, username, email, created_at, updated_at, last_login, last_active
     FROM users
     WHERE email = $1`,
    [email]
  );

  return result.rows[0] || null;
}

/**
 * Find user by username
 */
export async function findUserByUsername(username: string): Promise<User | null> {
  const result = await pool.query(
    `SELECT id, username, email, created_at, updated_at, last_login, last_active
     FROM users
     WHERE LOWER(username) = LOWER($1)`,
    [username]
  );

  return result.rows[0] || null;
}

/**
 * Find user by ID
 */
export async function findUserById(userId: string): Promise<User | null> {
  const result = await pool.query(
    `SELECT id, username, email, created_at, updated_at, last_login, last_active
     FROM users
     WHERE id = $1`,
    [userId]
  );

  return result.rows[0] || null;
}

/**
 * Verify user password
 */
export async function verifyPassword(email: string, password: string): Promise<User | null> {
  const result = await pool.query(
    `SELECT id, username, email, password_hash, created_at, updated_at, last_login, last_active
     FROM users
     WHERE email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];
  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
    return null;
  }

  // Remove password_hash from returned object
  const { password_hash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Update user's last login timestamp and last active
 */
export async function updateLastLogin(userId: string): Promise<void> {
  await pool.query(
    `UPDATE users
     SET last_login = NOW(), last_active = NOW()
     WHERE id = $1`,
    [userId]
  );
}

/**
 * Check if email already exists
 */
export async function emailExists(email: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM users WHERE email = $1`,
    [email]
  );
  return result.rows.length > 0;
}

/**
 * Check if username already exists (case-insensitive)
 */
export async function usernameExists(username: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM users WHERE LOWER(username) = LOWER($1)`,
    [username]
  );
  return result.rows.length > 0;
}

/**
 * Update user's password
 */
export async function updatePassword(userId: string, newPassword: string): Promise<void> {
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await pool.query(
    `UPDATE users
     SET password_hash = $1, updated_at = NOW()
     WHERE id = $2`,
    [passwordHash, userId]
  );
}

/**
 * Update user's last active timestamp
 */
export async function updateLastActive(userId: string): Promise<void> {
  await pool.query(
    `UPDATE users
     SET last_active = NOW()
     WHERE id = $1`,
    [userId]
  );
}
