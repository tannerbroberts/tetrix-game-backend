# Tetrix Game Backend

Backend API for the Tetrix game with PostgreSQL persistence, session-based authentication, and Railway deployment.

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

### Setup

```bash
# Login to Railway
railway login

# Create new project
railway init

# Link to existing project
railway link

# Add PostgreSQL database
# Go to Railway dashboard → New → Database → PostgreSQL
```

### Environment Variables

Set in Railway dashboard or via CLI:

```bash
railway variables set SESSION_SECRET=$(openssl rand -hex 32)
railway variables set NODE_ENV=production
```

DATABASE_URL is automatically set by Railway when you add PostgreSQL.

### Deploy

```bash
# Push to main branch (auto-deploys via Railway)
git push origin main

# Or deploy manually
railway up

# Run migrations
railway run npm run migrate
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

```bash
# Run tests (TODO: add tests)
npm test
```

## License

MIT
