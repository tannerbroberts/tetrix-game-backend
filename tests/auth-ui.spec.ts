import { test, expect } from '@playwright/test';

test.describe('Login Page with Leaderboard', () => {
  test.beforeEach(async ({ context, page }) => {
    // Clear all cookies and storage before each test
    await context.clearCookies();
    await page.goto('/');
    // Clear local storage and session storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should show login page with leaderboard and no game visible', async ({ page }) => {
    await page.goto('/');

    // Should see login form
    await expect(page.locator('h1')).toContainText('Tetrix');
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel(/^Password/)).toBeVisible();

    // Should see leaderboard
    await expect(page.getByText('Top Players')).toBeVisible();

    // Should NOT see game elements (grid, shapes, etc)
    await expect(page.locator('.grid')).not.toBeVisible();
    await expect(page.locator('.game-container')).not.toBeVisible();
  });

  test('should register and redirect to game', async ({ page }) => {
    const timestamp = Date.now();
    const username = `user${timestamp}`;
    const email = `test${timestamp}@example.com`;

    await page.goto('/');

    // Click "Need an account? Sign up"
    await page.getByRole('button', { name: /Sign up/ }).click();

    // Fill in registration form
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel(/^Password/).fill('TestPassword123');
    await page.getByLabel('Confirm Password').fill('TestPassword123');

    // Submit
    await page.getByRole('button', { name: 'Create Account' }).click();

    // Should redirect to /game
    await expect(page).toHaveURL('/game');

    // Should see game UI with user avatar
    await expect(page.locator('.user-avatar')).toBeVisible();

    // Avatar should show first letter of username
    const avatar = page.locator('.user-avatar');
    const avatarText = await avatar.textContent();
    expect(avatarText?.toUpperCase()).toBe(username.charAt(0).toUpperCase());
  });

  test('should logout and redirect to login page with leaderboard', async ({ page }) => {
    // Register and login
    const timestamp = Date.now();
    const username = `user${timestamp}`;
    const email = `test${timestamp}@example.com`;

    await page.goto('/');
    await page.getByRole('button', { name: /Sign up/ }).click();
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel(/^Password/).fill('TestPassword123');
    await page.getByLabel('Confirm Password').fill('TestPassword123');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page).toHaveURL('/game');

    // Click logout
    await page.getByRole('button', { name: 'Logout' }).click();

    // Should redirect to login
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();

    // Should see leaderboard again
    await expect(page.getByText('Top Players')).toBeVisible();

    // Should NOT see game
    await expect(page.locator('.game-container')).not.toBeVisible();
  });

  test('should not allow access to /game without login', async ({ page }) => {
    // Try to go directly to /game
    await page.goto('/game');

    // Should redirect to login
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();

    // Should see leaderboard on login page
    await expect(page.getByText('Top Players')).toBeVisible();
  });

  test('leaderboard should load data', async ({ page }) => {
    await page.goto('/');

    // Wait for leaderboard to load
    await expect(page.getByText('Top Players')).toBeVisible();

    // Should show either players or "No players yet" message
    const hasPlayers = await page.locator('.public-leaderboard-entry').count() > 0;
    const hasNoData = await page.getByText('No players yet').isVisible();

    expect(hasPlayers || hasNoData).toBe(true);
  });
});
