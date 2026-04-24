import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from './database';
import { ENV, IS_PRODUCTION } from './env';

const PgSession = connectPgSimple(session);

export const sessionConfig: session.SessionOptions = {
  store: new PgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: true,
  }),
  secret: ENV.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: IS_PRODUCTION, // HTTPS only in production
    httpOnly: true, // Prevent client-side JS access
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    sameSite: 'lax', // CSRF protection
  },
  name: 'tetrix.sid',
};
