import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByText('Iniciar sesión')).toBeVisible();
  });

  test('should login with seeded user', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'owner@demo.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    await expect(page.getByText('Dashboard')).toBeVisible();
  });
});
