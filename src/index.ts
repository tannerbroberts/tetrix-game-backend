import express from 'express';
import session from 'express-session';
import compression from 'compression';
import cors from 'cors';
import { ENV, IS_PRODUCTION } from './config/env';
import { sessionConfig } from './config/session';
import { testConnection, closeDatabaseConnection } from './config/database';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/auth.routes';
import gameRoutes from './routes/game.routes';
import leaderboardRoutes from './routes/leaderboard.routes';

// ============================================================================
// ROUTE CONFIGURATION
// ============================================================================
// Single source of truth for all API routes
const ROUTES = {
  auth: {
    path: '/api/auth',
    router: authRoutes,
    description: 'register, login, logout, me, forgot-password, reset-password',
  },
  game: {
    path: '/api/game',
    router: gameRoutes,
    description: 'state, place-shape, place-shape-v2, rotate-shape, unlock-slot, reset',
  },
  leaderboard: {
    path: '/api/leaderboard',
    router: leaderboardRoutes,
    description: 'public, user',
  },
  health: {
    path: '/api/health',
    description: 'health check',
  },
} as const;

const app = express();

// Trust Railway proxy for secure cookies
app.set('trust proxy', 1);

// ============================================================================
// MIDDLEWARE
// ============================================================================

// CORS configuration
const corsOptions = {
  origin: ENV.FRONTEND_URL || 'http://localhost:5173',
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Session management
app.use(session(sessionConfig));

// Request logging (development only)
if (!IS_PRODUCTION) {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ============================================================================
// API ROUTES
// ============================================================================
// Programmatically mount routes from ROUTES configuration

app.use(ROUTES.auth.path, ROUTES.auth.router);
app.use(ROUTES.game.path, ROUTES.game.router);
app.use(ROUTES.leaderboard.path, ROUTES.leaderboard.router);

// Health check endpoint
app.get(ROUTES.health.path, (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: ENV.NODE_ENV,
  });
});

// ============================================================================
// ROOT ENDPOINT
// ============================================================================
// Programmatically generate endpoint documentation from ROUTES configuration

app.get('/', (req, res) => {
  const endpoints = Object.entries(ROUTES).reduce(
    (acc, [key, config]) => {
      acc[key] = `${config.path} (${config.description})`;
      return acc;
    },
    {} as Record<string, string>,
  );

  res.json({
    message: 'Tetrix Game Backend API',
    version: '1.0.0',
    endpoints,
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use(notFoundHandler);
app.use(errorHandler);

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer() {
  try {
    // Test database connection
    await testConnection();

    // Start server
    const server = app.listen(ENV.PORT, () => {
      console.log(`
🚀 Tetrix Game Backend is running!

   Environment: ${ENV.NODE_ENV}
   Port: ${ENV.PORT}
   Database: Connected ✅

   API Base URL: http://localhost:${ENV.PORT}/api
   Health Check: http://localhost:${ENV.PORT}/api/health
      `);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully...');
      server.close(async () => {
        await closeDatabaseConnection();
        console.log('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('\nSIGINT received, shutting down gracefully...');
      server.close(async () => {
        await closeDatabaseConnection();
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
