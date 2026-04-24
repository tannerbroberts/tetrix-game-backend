import { test, expect } from '@playwright/test';

const BASE_URL = 'https://humorous-education-production-b86a.up.railway.app';

test.describe('Production Deployment Tests', () => {
  test('health check endpoint returns OK', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.environment).toBe('production');
    expect(data.timestamp).toBeTruthy();
  });

  test('frontend loads successfully', async ({ page }) => {
    await page.goto(BASE_URL);

    // Check page title
    await expect(page).toHaveTitle(/Tetrix/);

    // Check that main game elements are present
    await expect(page.locator('.header')).toBeVisible();
    await expect(page.locator('.game-container')).toBeVisible();
  });

  test('public leaderboard endpoint returns data', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/leaderboard/public`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.topPlayers).toBeDefined();
    expect(Array.isArray(data.topPlayers)).toBeTruthy();
    expect(data.totalActivePlayers).toBeDefined();
    expect(typeof data.totalActivePlayers).toBe('number');

    // Each player should have required fields
    if (data.topPlayers.length > 0) {
      const player = data.topPlayers[0];
      expect(player.username).toBeDefined();
      expect(player.score).toBeDefined();
      expect(player.rank).toBeDefined();
    }
  });

  test('registration endpoint validates input', async ({ request }) => {
    // Test missing username
    const response1 = await request.post(`${BASE_URL}/api/auth/register`, {
      data: {
        email: 'test@example.com',
        password: 'TestPass123',
      },
    });
    expect(response1.status()).toBe(400); // Validation error

    // Test invalid email
    const response2 = await request.post(`${BASE_URL}/api/auth/register`, {
      data: {
        username: 'testuser',
        email: 'invalid-email',
        password: 'TestPass123',
      },
    });
    expect(response2.status()).toBe(400);

    // Test weak password
    const response3 = await request.post(`${BASE_URL}/api/auth/register`, {
      data: {
        username: 'testuser',
        email: 'test@example.com',
        password: 'weak',
      },
    });
    expect(response3.status()).toBe(400);
  });

  test('forgot password endpoint accepts email', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/forgot-password`, {
      data: {
        email: 'test@example.com',
      },
    });

    // Should always return 200 (even if email doesn't exist, for security)
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.message).toBeTruthy();
  });

  test('user leaderboard requires authentication', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/leaderboard/user`);

    // Should return 401 Unauthorized
    expect(response.status()).toBe(401);
  });

  test('complete registration and login flow', async ({ page, request }) => {
    const timestamp = Date.now();
    const testUser = {
      username: `testuser${timestamp}`,
      email: `test${timestamp}@example.com`,
      password: 'TestPassword123',
    };

    // Navigate to the site
    await page.goto(BASE_URL);

    // Click login button
    await page.click('[aria-label="Login"]');

    // Wait for login overlay - use more specific selector
    await expect(page.locator('h2:has-text("Login")')).toBeVisible();

    // Switch to register tab
    await page.click('text=Need an account? Sign up');

    // Wait for register form
    await expect(page.locator('h2:has-text("Create Account")')).toBeVisible();

    // Fill registration form - MUI TextField inputs
    await page.locator('input[type="text"]').first().fill(testUser.username);
    await page.locator('input[type="email"]').fill(testUser.email);
    const passwordFields = await page.locator('input[type="password"]').all();
    await passwordFields[0].fill(testUser.password);
    await passwordFields[1].fill(testUser.password);

    // Submit registration
    await page.click('button:has-text("Create Account")');

    // Wait for successful registration (overlay should close)
    await page.waitForTimeout(2000);

    // Should now see username in header
    await expect(page.locator(`.user-name:has-text("${testUser.username}")`)).toBeVisible();

    // Test logout
    await page.click('text=Logout');

    // Should see login button again
    await expect(page.locator('[aria-label="Login"]')).toBeVisible();

    // Test login with the same user
    await page.click('[aria-label="Login"]');
    await page.fill('input[type="email"]', testUser.email);
    await page.locator('input[type="password"]').fill(testUser.password);
    await page.click('button:has-text("Login")');

    // Wait and verify logged in
    await page.waitForTimeout(2000);
    await expect(page.locator(`.user-name:has-text("${testUser.username}")`)).toBeVisible();
  });

  test('authenticated user can access leaderboard', async ({ page }) => {
    const timestamp = Date.now();
    const testUser = {
      username: `testuser${timestamp}`,
      email: `test${timestamp}@example.com`,
      password: 'TestPassword123',
    };

    // Register and login
    await page.goto(BASE_URL);
    await page.click('[aria-label="Login"]');
    await page.click('text=Need an account? Sign up');

    // Wait for register form
    await expect(page.locator('h2:has-text("Create Account")')).toBeVisible();

    await page.locator('input[type="text"]').first().fill(testUser.username);
    await page.locator('input[type="email"]').fill(testUser.email);
    const passwordFields = await page.locator('input[type="password"]').all();
    await passwordFields[0].fill(testUser.password);
    await passwordFields[1].fill(testUser.password);

    await page.click('button:has-text("Create Account")');
    await page.waitForTimeout(2000);

    // Click leaderboard button
    await page.click('[aria-label="Leaderboard"]');

    // Verify leaderboard overlay opens
    await expect(page.locator('text=Top 10 Players')).toBeVisible();
    await expect(page.locator('text=Your Rank')).toBeVisible();
    await expect(page.locator('text=Active Players')).toBeVisible();

    // Close leaderboard
    await page.click('button:has-text("Close")');
  });

  test('rate limiting on user leaderboard endpoint', async ({ browser }) => {
    // Use a browser context to maintain cookies
    const context = await browser.newContext();
    const page = await context.newPage();

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(7);
    const testUser = {
      username: `ratelimit${randomSuffix}`,
      email: `ratelimit${timestamp}${randomSuffix}@example.com`,
      password: 'TestPassword123',
    };

    // Register via UI
    await page.goto(BASE_URL);
    await page.click('[aria-label="Login"]');
    await page.click('text=Need an account? Sign up');
    await expect(page.locator('h2:has-text("Create Account")')).toBeVisible();

    await page.locator('input[type="text"]').first().fill(testUser.username);
    await page.locator('input[type="email"]').fill(testUser.email);
    const passwordFields = await page.locator('input[type="password"]').all();
    await passwordFields[0].fill(testUser.password);
    await passwordFields[1].fill(testUser.password);

    await page.click('button:has-text("Create Account")');
    await page.waitForTimeout(2000);

    // First API request should succeed
    const response1 = await context.request.get(`${BASE_URL}/api/leaderboard/user`);
    expect(response1.ok()).toBeTruthy();

    // Immediate second request should be rate limited
    const response2 = await context.request.get(`${BASE_URL}/api/leaderboard/user`);
    expect(response2.status()).toBe(429);

    const data = await response2.json();
    expect(data.error).toContain('Too many requests');

    await context.close();
  });

  test('password reset flow validates token', async ({ request }) => {
    // Test with invalid token
    const response = await request.post(`${BASE_URL}/api/auth/reset-password`, {
      data: {
        token: 'invalid-token-12345',
        newPassword: 'NewPassword123',
      },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Invalid or expired');
  });

  test('game state requires authentication', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/game/state`);
    expect(response.status()).toBe(401);
  });

  test('username must be unique', async ({ request }) => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(7);
    const testUser = {
      username: `unique${randomSuffix}`,
      email: `unique1${timestamp}${randomSuffix}@example.com`,
      password: 'TestPassword123',
    };

    // Register first user
    const response1 = await request.post(`${BASE_URL}/api/auth/register`, {
      data: testUser,
    });

    if (!response1.ok()) {
      const error = await response1.json();
      console.error('Registration failed:', error);
    }
    expect(response1.ok()).toBeTruthy();

    // Try to register with same username but different email
    const response2 = await request.post(`${BASE_URL}/api/auth/register`, {
      data: {
        username: testUser.username,
        email: `unique2${timestamp}${randomSuffix}@example.com`,
        password: 'TestPassword123',
      },
    });

    expect(response2.status()).toBe(409);
    const data = await response2.json();
    expect(data.error).toContain('already taken');
  });

  test('email must be unique', async ({ request }) => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(7);
    const testEmail = `emailtest${timestamp}${randomSuffix}@example.com`;

    // Register first user
    const response1 = await request.post(`${BASE_URL}/api/auth/register`, {
      data: {
        username: `emailuser1${randomSuffix}`,
        email: testEmail,
        password: 'TestPassword123',
      },
    });

    if (!response1.ok()) {
      const error = await response1.json();
      console.error('Registration failed:', error);
    }
    expect(response1.ok()).toBeTruthy();

    // Try to register with same email but different username
    const response2 = await request.post(`${BASE_URL}/api/auth/register`, {
      data: {
        username: `emailuser2${randomSuffix}`,
        email: testEmail,
        password: 'TestPassword123',
      },
    });

    expect(response2.status()).toBe(409);
    const data = await response2.json();
    expect(data.error).toContain('already registered');
  });
});
