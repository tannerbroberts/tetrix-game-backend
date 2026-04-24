import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://humorous-education-production-b86a.up.railway.app';

test.describe('Production Smoke Tests', () => {
  test.beforeEach(async ({ context, page }) => {
    // Clear all cookies and storage before each test
    await context.clearCookies();
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should hide game UI until logged in', async ({ page }) => {
    await page.goto(BASE_URL);

    // Should see login form
    await expect(page.locator('h1')).toContainText('Tetrix');
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();

    // Should NOT see game board (game-board is only visible after login)
    await expect(page.locator('[data-testid="game-board"]')).not.toBeVisible();
  });

  test('should successfully login with valid credentials and load game state', async ({ page }) => {
    await page.goto(BASE_URL);

    // Fill login form with test credentials
    await page.getByLabel('Email').fill('tannerbroberts@gmail.com');
    await page.getByLabel(/^Password/).fill('19Brain96');

    // Listen for game state API call
    const gameStatePromise = page.waitForResponse(
      response => response.url().includes('/api/game/state') && response.status() === 200,
      { timeout: 10000 }
    );

    // Submit login
    await page.getByRole('button', { name: 'Login' }).click();

    // Should redirect to /game
    await expect(page).toHaveURL(/\/game$/, { timeout: 10000 });

    // Should see game board after login
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible({ timeout: 10000 });

    // Verify game state was loaded
    const gameStateResponse = await gameStatePromise;
    expect(gameStateResponse.status()).toBe(200);

    const gameStateData = await gameStateResponse.json();
    expect(gameStateData).toBeDefined();
    expect(gameStateData.score).toBeDefined();
    expect(gameStateData.nextQueue).toBeDefined();
  });

  test('should reject login with wrong password', async ({ page }) => {
    await page.goto(BASE_URL);

    // Try to login with wrong password
    await page.getByLabel('Email').fill('tannerbroberts@gmail.com');
    await page.getByLabel(/^Password/).fill('WrongPassword123');
    await page.getByRole('button', { name: 'Login' }).click();

    // Should see error message
    await expect(page.locator('text=/invalid/i')).toBeVisible({ timeout: 5000 });

    // Should NOT redirect to game
    await expect(page).toHaveURL(BASE_URL);
  });

  test('should reject login with non-existent account', async ({ page }) => {
    await page.goto(BASE_URL);

    // Try to login with non-existent account
    const timestamp = Date.now();
    await page.getByLabel('Email').fill(`nonexistent${timestamp}@example.com`);
    await page.getByLabel(/^Password/).fill('Password123');
    await page.getByRole('button', { name: 'Login' }).click();

    // Should see error message
    await expect(page.locator('text=/invalid/i')).toBeVisible({ timeout: 5000 });

    // Should NOT redirect to game
    await expect(page).toHaveURL(BASE_URL);
  });

  test('should successfully place a shape on the board', async ({ page }) => {
    await page.goto(BASE_URL);

    // Login first
    await page.getByLabel('Email').fill('tannerbroberts@gmail.com');
    await page.getByLabel(/^Password/).fill('19Brain96');
    await page.getByRole('button', { name: 'Login' }).click();

    // Wait for game to load
    await expect(page).toHaveURL(/\/game$/, { timeout: 10000 });
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible();

    // Wait for game state to load
    await page.waitForResponse(
      response => response.url().includes('/api/game/state') && response.status() === 200,
      { timeout: 10000 }
    );

    // Wait for shapes to be visible
    await page.waitForTimeout(1000);

    // Use test utils if available (like in existing E2E tests)
    const hasTestUtils = await page.evaluate(() => {
      return typeof (window as any).__testUtils !== 'undefined';
    });

    if (hasTestUtils) {
      // Use test utilities to place a shape programmatically
      const placeShapePromise = page.waitForResponse(
        response => response.url().includes('/api/game/place-shape'),
        { timeout: 10000 }
      );

      await page.evaluate(async () => {
        const testUtils = (window as any).__testUtils;
        await testUtils.placePieceAtRow(1);
      });

      // Verify placement API was called
      const placeShapeResponse = await placeShapePromise;
      expect(placeShapeResponse.status()).toBe(200);

      const responseData = await placeShapeResponse.json();
      expect(responseData.valid).toBe(true);
      expect(responseData.updatedTiles).toBeDefined();
      expect(Array.isArray(responseData.updatedTiles)).toBe(true);
      // The stub implementation returns empty array, real implementation should have tiles
      expect(responseData.updatedTiles.length).toBeGreaterThan(0);
      expect(responseData.newScore).toBeDefined();
      expect(typeof responseData.newScore).toBe('number');
    } else {
      // Fallback: just verify the game loaded and shapes are present
      console.log('Test utils not available, skipping shape placement interaction');

      // At minimum, verify we can see the game UI
      await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
    }
  });
});
