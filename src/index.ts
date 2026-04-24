import express from 'express';
import session from 'express-session';
import compression from 'compression';
import path from 'path';
import { ENV, IS_PRODUCTION } from './config/env';
import { sessionConfig } from './config/session';
import { testConnection, closeDatabaseConnection } from './config/database';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/auth.routes';
import gameRoutes from './routes/game.routes';

const app = express();

// ============================================================================
// MIDDLEWARE
// ============================================================================

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: ENV.NODE_ENV,
  });
});

// ============================================================================
// SERVE FRONTEND (in production)
// ============================================================================

if (IS_PRODUCTION) {
  // Serve static files from dist-frontend directory
  const frontendPath = path.join(__dirname, '..', 'dist-frontend');
  app.use(express.static(frontendPath));

  // Serve index.html for all non-API routes (SPA support)
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(frontendPath, 'index.html'));
    } else {
      res.status(404).json({ error: 'API route not found' });
    }
  });
} else {
  // Development: just show a message
  app.get('/', (req, res) => {
    res.json({
      message: 'Tetrix Game Backend API',
      version: '1.0.0',
      endpoints: {
        auth: '/api/auth (register, login, logout, me)',
        game: '/api/game (state, place-shape, rotate-shape, unlock-slot, reset)',
        health: '/api/health',
      },
    });
  });
}

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
