# Railway Deployment Guide

This document provides step-by-step instructions for deploying the Tetrix game on Railway.

## Prerequisites

- Railway account (https://railway.app)
- GitHub account with repositories:
  - Frontend: https://github.com/tetrix-game/tetrix-game
  - Backend: https://github.com/tannerbroberts/tetrix-game-backend

## Architecture

The application consists of three Railway services:
1. **Frontend Service** - Serves React SPA
2. **Backend Service** - Provides REST API
3. **PostgreSQL Database** - Managed by Railway

## Step-by-Step Deployment

### 1. Create Railway Project

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Create new project (or use Railway dashboard)
railway init
```

### 2. Add PostgreSQL Database

1. Go to Railway dashboard → Your Project
2. Click "New" → "Database" → "PostgreSQL"
3. Railway automatically creates `DATABASE_URL` environment variable
4. Note: Database is ready immediately

### 3. Deploy Backend Service

#### A. Connect GitHub Repository

1. In Railway dashboard, click "New" → "GitHub Repo"
2. Select `tannerbroberts/tetrix-game-backend`
3. Railway auto-detects Nixpacks builder

#### B. Set Environment Variables

Go to service → "Variables" tab and add:

```bash
# Required variables
SESSION_SECRET=<generate with: openssl rand -hex 32>
NODE_ENV=production
FRONTEND_URL=https://tetrix-game-frontend-production.up.railway.app

# DATABASE_URL is automatically set by Railway
```

#### C. Deploy

Railway automatically deploys on push to `main` branch.

**First deployment**:
- Railway runs: `npm install && npm run build`
- Then starts: `npm run migrate && node dist/index.js`
- Migrations create database schema
- Server starts on Railway-assigned PORT

#### D. Seed Test User (Optional)

For smoke tests:
```bash
railway run npm run seed:test-user
```

### 4. Deploy Frontend Service

#### A. Connect GitHub Repository

1. In Railway dashboard, click "New" → "GitHub Repo"
2. Select `tetrix-game/tetrix-game`
3. Railway auto-detects Dockerfile

#### B. Set Environment Variables

⚠️ **CRITICAL STEP** - Without this, login will fail!

Go to service → "Variables" tab and add:

```bash
VITE_API_URL=https://humorous-education-production-b86a.up.railway.app
```

**Why this is required**:
- Vite environment variables are compiled into the JavaScript at **build time**
- The frontend needs to know where the backend API is
- Without this, API calls go to `/api` (same domain), which doesn't exist

#### C. Deploy

Railway automatically deploys using Dockerfile:
1. Build stage: `npm install && npm run build:prod`
2. Production stage: Copy dist files
3. Start: `serve -s dist -l $PORT`

### 5. Verify Deployment

#### Test Backend Health

```bash
curl https://humorous-education-production-b86a.up.railway.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-04-24T...",
  "environment": "production"
}
```

#### Test Frontend

Open: https://tetrix-game-frontend-production.up.railway.app

Expected:
- Login page loads
- Leaderboard visible
- No console errors

#### Test Login

1. Use test credentials:
   - Email: `tannerbroberts@gmail.com`
   - Password: `19Brain96`
2. Should redirect to `/game`
3. Game board should load

### 6. Run Smoke Tests

From backend repository:

```bash
npm run test:smoke
```

All tests should pass:
- ✅ Game UI hidden until logged in
- ✅ Login succeeds with valid credentials
- ✅ Login rejects wrong password
- ✅ Login rejects non-existent account
- ✅ Game state loads after login
- ✅ Shape placement works

## Common Issues & Solutions

### Issue: "Unexpected token '<', '<!doctype'... is not valid JSON"

**Cause**: CORS error - backend is blocking frontend requests

**Solution**:
1. Check backend `FRONTEND_URL` environment variable
2. Must exactly match: `https://tetrix-game-frontend-production.up.railway.app`
3. Redeploy backend after changing
4. Verify with: `railway variables get FRONTEND_URL`

### Issue: Login button does nothing / Network error

**Cause**: Frontend can't reach backend API

**Solution**:
1. Check frontend `VITE_API_URL` environment variable
2. Must be set to: `https://humorous-education-production-b86a.up.railway.app`
3. **Important**: Must redeploy frontend after adding (build-time variable)
4. Verify in browser console: Check network tab for API calls

### Issue: Session cookies not working

**Cause**: Cookie settings incompatible with cross-origin setup

**Solution**:
1. Check backend `src/config/session.ts`:
   - `secure: true` (requires HTTPS)
   - `sameSite: 'none'` (for cross-origin)
   - `httpOnly: true` (security)
2. Ensure both services use HTTPS (Railway default)

### Issue: Database migrations not running

**Cause**: Migration script failing on startup

**Solution**:
```bash
# Check logs
railway logs

# Run migrations manually
railway run npm run migrate

# Check database connection
railway run node -e "require('./dist/config/database').testConnection()"
```

### Issue: Shape placement returns stub data

**Cause**: Code not deployed yet

**Solution**:
1. Verify backend deployment: `git log -1`
2. Check Railway deployment logs
3. Backend should have commit: "Add smoke tests and implement shape placement validation"

### Issue: Frontend shows blank page

**Cause**: Build errors or routing issues

**Solution**:
```bash
# Check frontend logs
railway logs

# Look for build errors
railway logs | grep error

# Verify dist files created
railway run ls -la dist/
```

## Environment Variables Checklist

### Backend Service

- [x] `DATABASE_URL` - Set automatically by Railway
- [x] `SESSION_SECRET` - Manual: `openssl rand -hex 32`
- [x] `NODE_ENV` - Manual: `production`
- [x] `PORT` - Set automatically by Railway
- [x] `FRONTEND_URL` - Manual: `https://tetrix-game-frontend-production.up.railway.app`

### Frontend Service

- [x] `PORT` - Set automatically by Railway
- [x] `VITE_API_URL` - Manual: `https://humorous-education-production-b86a.up.railway.app`

## Production URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | https://tetrix-game-frontend-production.up.railway.app | User-facing app |
| Backend | https://humorous-education-production-b86a.up.railway.app | API endpoints |
| Database | (internal) | PostgreSQL managed by Railway |

## Monitoring

### View Logs

```bash
# Backend logs
railway logs --service backend-service-name

# Frontend logs
railway logs --service frontend-service-name

# Database logs
railway logs --service postgresql
```

### Check Service Status

```bash
railway status
```

### Resource Usage

View in Railway dashboard:
- CPU usage
- Memory usage
- Network traffic
- Deployment history

## Rollback Procedure

If deployment fails:

```bash
# Via Railway CLI
railway rollback

# Or via dashboard
# Go to service → Deployments → Click previous deployment → Redeploy
```

## Continuous Deployment

Both services auto-deploy on push to `main`:

1. Push to GitHub
2. Railway webhook triggers
3. Service builds and deploys
4. Health checks verify deployment
5. Service becomes available

**Deployment time**:
- Backend: ~2-3 minutes
- Frontend: ~3-4 minutes (Docker build)

## Security Checklist

- [x] `SESSION_SECRET` is random and never committed to git
- [x] Database credentials managed by Railway
- [x] CORS restricted to frontend origin only
- [x] Session cookies: httpOnly, secure, sameSite
- [x] All traffic over HTTPS
- [x] No sensitive data in environment variables visible to frontend

## Scaling

Railway auto-scales based on traffic. Manual scaling options:

1. Go to service → Settings
2. Adjust:
   - Memory limit
   - CPU allocation
   - Auto-scaling rules

## Backup Strategy

**Database backups** (via Railway):
- Automatic daily backups
- 7-day retention
- Point-in-time recovery available

**Code backups**:
- GitHub is source of truth
- All deployments tracked in Railway dashboard

## Next Steps

1. Set up custom domain (optional)
2. Configure monitoring/alerting
3. Add CI/CD testing
4. Set up staging environment
5. Configure auto-scaling rules

## Support

- Railway docs: https://docs.railway.app
- GitHub issues: Report bugs in respective repositories
- Email: tannerbroberts@gmail.com
