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

const app = express();

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

app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: ENV.NODE_ENV,
  });
});

// ============================================================================
// ROOT ENDPOINT
// ============================================================================

app.get('/', (req, res) => {
  res.json({
    message: 'Tetrix Game Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth (register, login, logout, me)',
      game: '/api/game (state, place-shape, rotate-shape, unlock-slot, reset)',
      leaderboard: '/api/leaderboard (scores)',
      health: '/api/health',
    },
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
