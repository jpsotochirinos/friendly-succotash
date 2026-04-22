import { test, expect } from '@playwright/test';

test.describe('Workflow definitions settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'owner@demo.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('loads workflows list for user with workflow:update', async ({ page }) => {
    await page.goto('/settings/workflows');
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('table').first()).toBeVisible({ timeout: 10000 });
  });
});
