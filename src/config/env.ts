import { config } from 'dotenv';

// Load environment variables from .env file
config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
} as const;

// Validation
if (!ENV.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

if (!ENV.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required');
}

export const IS_PRODUCTION = ENV.NODE_ENV === 'production';
export const IS_DEVELOPMENT = ENV.NODE_ENV === 'development';
