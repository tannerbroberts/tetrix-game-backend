# Tetrix Game Backend

Backend API for the Tetrix game with PostgreSQL persistence, session-based authentication, and Railway deployment.

> **🔗 Related Repository**: This is the backend API. The frontend React app is at [tetrix-game](https://github.com/tetrix-game/tetrix-game).
> Both repositories are deployed separately on Railway and work together to provide the complete game experience.

## Features

- 🔐 Session-based authentication with bcrypt password hashing
- 🎮 Game state persistence (board, queue, score)
- 📊 Statistics and achievements tracking
- ⚙️ Settings synchronization across devices
- 🚀 Railway deployment ready
- 📦 Serves frontend React app at base path

## Tech Stack

- **Runtime**: Node.js 20.x
- **Framework**: Express.js 4.x with TypeScript
- **Database**: PostgreSQL 15+ with JSONB
- **Session Store**: express-session + connect-pg-simple
- **Validation**: Zod schemas
- **Authentication**: bcrypt password hashing

## Quick Start

### Prerequisites

- Node.js 20+ installed
- PostgreSQL 15+ running
- Railway CLI installed (for deployment)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your database credentials
# DATABASE_URL=postgresql://user:password@localhost:5432/tetrix_game
# SESSION_SECRET=your-secret-key

# Run migrations
npm run migrate

# Start development server
npm run dev
```

### Building

```bash
# Build backend only
npm run build:backend

# Build backend + copy frontend
npm run build:frontend && npm run build
```

### Running

```bash
# Development with hot reload
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout and destroy session
- `GET /api/auth/me` - Get current user info

### Game State

- `GET /api/game/state` - Load game state
- `POST /api/game/state` - Save game state (partial updates supported)
- `POST /api/game/place-shape` - Place shape on board (with validation)
- `POST /api/game/rotate-shape` - Rotate shape in queue
- `POST /api/game/unlock-slot` - Purchase shape slot
- `POST /api/game/reset` - Reset game (preserve all-time stats)

### Settings

- `GET /api/settings` - Load user settings
- `PATCH /api/settings` - Update settings (partial updates supported)

## Database Schema

### Tables

1. **users** - User accounts with authentication
2. **session** - Session store (managed by connect-pg-simple)
3. **game_states** - Game board, queue, and configuration
4. **statistics** - All-time, high-score, and current game stats
5. **settings** - User preferences (audio, theme, etc.)
6. **modifiers** - Unlocked game modifiers

### Key Features

- JSONB columns for flexible game state storage
- Indexed foreign keys for fast lookups
- Constraints for data integrity
- Cascade deletes for user data cleanup

## Project Structure

```
src/
├── config/
│   ├── database.ts         # PostgreSQL connection pool
│   ├── session.ts          # Session configuration
│   └── env.ts              # Environment variable validation
├── middleware/
│   ├── auth.ts             # Authentication middleware
│   ├── errorHandler.ts     # Global error handling
│   └── validation.ts       # Zod validation middleware
├── routes/
│   ├── auth.routes.ts      # Auth endpoints
│   ├── game.routes.ts      # Game endpoints
│   └── settings.routes.ts  # Settings endpoints
├── controllers/
│   ├── auth.controller.ts  # Auth business logic
│   └── game.controller.ts  # Game business logic
├── services/
│   ├── userService.ts      # User CRUD
│   ├── gameStateService.ts # Game state operations
│   └── validationService.ts# Shape placement validation
├── models/
│   └── types.ts            # TypeScript type definitions
├── db/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   └── migrate.ts      # Migration runner
└── utils/
    └── schemas.ts          # Zod validation schemas
```

## Railway Deployment

This app is deployed on Railway as a **separate backend service** alongside the frontend. Both services communicate via API calls with session-based authentication.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Railway Project                          │
├──────────────────────┬──────────────────────┬────────────────┤
│   Frontend Service   │   Backend Service    │   PostgreSQL   │
│   (tetrix-game)      │   (this repo)        │   Database     │
│                      │                      │                │
│   Port: 3000         │   Port: 3000         │   Port: 5432   │
│   Type: Docker       │   Type: Nixpacks     │   Managed DB   │
│                      │                      │                │
│   Serves: React SPA  │   Serves: REST API   │   Stores:      │
│   via serve          │   via Express        │   - Users      │
│                      │                      │   - Sessions   │
│                      │                      │   - Game State │
└──────────────────────┴──────────────────────┴────────────────┘
         │                       │                      │
         │                       │                      │
         └───── CORS ────────────┘                      │
         │      cookies                                 │
         │                                              │
         └────────── DATABASE_URL ─────────────────────┘
```

### Production URLs

- **Frontend**: Serves the React app (login page, game UI)
- **Backend**: `https://humorous-education-production-b86a.up.railway.app` (API only)
- **Database**: PostgreSQL managed by Railway (connected via DATABASE_URL)

### Setup

#### 1. Create Railway Project

```bash
# Login to Railway
railway login

# Create a new project (or use existing)
railway init

# Link this repository to a service
railway link
```

#### 2. Add PostgreSQL Database

1. Go to Railway dashboard → Your Project
2. Click "New" → "Database" → "PostgreSQL"
3. Railway automatically creates `DATABASE_URL` environment variable
4. The backend service connects to this database

#### 3. Configure Backend Service

**Required Environment Variables** (set in Railway dashboard):

```bash
# Session secret (generate with openssl)
SESSION_SECRET=$(openssl rand -hex 32)

# Environment
NODE_ENV=production

# Frontend URL (for CORS)
FRONTEND_URL=https://your-frontend-service.up.railway.app

# Database URL (automatically set by Railway)
# DATABASE_URL=postgresql://...
```

**Railway Configuration** (`railway.json`):

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "npm run migrate && node dist/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Key Features**:
- Runs database migrations on every deploy
- Auto-restarts on failure (max 10 retries)
- Uses Nixpacks for automatic build detection

#### 4. Deploy

```bash
# Deploy via GitHub push (recommended)
git push origin main

# Railway auto-deploys when detecting push to main branch

# Or deploy manually from local
railway up

# View logs
railway logs

# Run one-off commands
railway run npm run seed:test-user
```

### Deployment Flow

1. **Push to GitHub** → Triggers Railway webhook
2. **Railway builds** → `npm install && npm run build`
3. **Railway starts** → `npm run migrate && node dist/index.js`
4. **Migrations run** → Database schema updates automatically
5. **Server starts** → Express app listens on Railway-assigned PORT

### Database Management

```bash
# Connect to production database
railway run bash
psql $DATABASE_URL

# Run migrations manually
railway run npm run migrate

# Seed test user for smoke tests
railway run npm run seed:test-user

# Check database logs
railway logs --service postgresql
```

### Monitoring & Debugging

```bash
# View backend service logs
railway logs

# Check service status
railway status

# Open Railway dashboard
railway open

# Connect to production environment
railway shell
```

### Environment Variables Reference

| Variable | Purpose | Set By | Required |
|----------|---------|--------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Railway (auto) | ✅ |
| `SESSION_SECRET` | Session encryption key | Manual | ✅ |
| `NODE_ENV` | Environment mode | Manual | ✅ |
| `PORT` | Server port | Railway (auto) | ✅ |
| `FRONTEND_URL` | Frontend origin for CORS | Manual | ✅ |

### Continuous Deployment

Railway automatically deploys when:
1. New commits pushed to `main` branch on GitHub
2. Environment variables changed in dashboard
3. Manual deploy triggered via CLI or dashboard

**Build Cache**: Railway caches `node_modules` between builds for faster deployments.

### Troubleshooting

**Migration Failures**:
```bash
# Check migration logs
railway logs | grep migrate

# Manually run migrations
railway run npm run migrate
```

**Connection Issues**:
```bash
# Test database connection
railway run node -e "require('./dist/config/database').testConnection()"

# Check CORS settings
railway variables get FRONTEND_URL
```

**Session Problems**:
```bash
# Verify session secret is set
railway variables get SESSION_SECRET

# Check session table exists
railway run psql $DATABASE_URL -c "SELECT COUNT(*) FROM session;"
```

## Development

### Adding New Endpoints

1. Define Zod schema in `src/utils/schemas.ts`
2. Add route handler in `src/routes/*.routes.ts`
3. Implement business logic in `src/controllers/*.controller.ts`
4. Add database operations in `src/services/*.service.ts`

### Database Migrations

Create new migration file:

```sql
-- src/db/migrations/002_add_feature.sql
ALTER TABLE game_states ADD COLUMN new_feature JSONB;
```

Update `migrate.ts` to include new migration.

## Security

- ✅ Passwords hashed with bcrypt (10 rounds)
- ✅ Session cookies: httpOnly, secure (HTTPS), sameSite=lax
- ✅ Input validation with Zod schemas
- ✅ SQL injection prevention (parameterized queries)
- ✅ User data isolation by user_id

## Testing

### Playwright E2E Tests

Automated smoke tests validate the production deployment end-to-end.

```bash
# Run all tests
npm test

# Run smoke tests against production
npm run test:smoke

# Run smoke tests with browser visible
npm run test:smoke:headed

# Run specific test file
npx playwright test tests/smoke-test.spec.ts
```

### Test Coverage

**Smoke Tests** (`tests/smoke-test.spec.ts`):
- ✅ Game UI hidden until authenticated
- ✅ Successful login with valid credentials
- ✅ Login rejection with wrong password
- ✅ Login rejection with non-existent account
- ✅ Game state loads after successful login
- ✅ Shape placement with validation

**Test User** (for production smoke tests):
```bash
# Seed test user to production database
railway run npm run seed:test-user

# Credentials (configured in smoke test):
# Email: tannerbroberts@gmail.com
# Password: 19Brain96
```

### Test Configuration

Playwright config (`playwright.config.ts`):
- **Base URL**: Configurable via `BASE_URL` env var
- **Workers**: 1 (sequential execution to avoid rate limits)
- **Retries**: 2 on CI, 0 locally
- **Timeout**: 60 seconds per test
- **Artifacts**: Screenshots and videos on failure

## License

MIT
