import { test, expect } from '@playwright/test';

test.describe('Flow View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'owner@demo.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should navigate to trackable list and open flow view', async ({ page }) => {
    await page.goto('/trackables');
    await expect(page.locator('table')).toBeVisible();

    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();

    await expect(page.locator('.vue-flow')).toBeVisible({ timeout: 10000 });
  });
});
