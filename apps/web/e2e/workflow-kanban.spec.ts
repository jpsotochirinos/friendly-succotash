import { test, expect } from '@playwright/test';

test.describe('Workflow Kanban', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'owner@demo.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('shows Kanban columns on expediente actuaciones tab', async ({ page }) => {
    await page.goto('/trackables');
    await expect(page.locator('table')).toBeVisible();
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();
    await page.waitForURL(/\/trackables\/.+/);
    await page.getByText('Actuaciones', { exact: true }).first().click();
    await expect(page.locator('[data-kanban-col]').first()).toBeVisible({ timeout: 15000 });
  });
});
