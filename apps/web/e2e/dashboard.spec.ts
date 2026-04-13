import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'owner@demo.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should show dashboard with charts', async ({ page }) => {
    await expect(page.getByText('Estado de trackables')).toBeVisible();
    await expect(page.getByText('Progreso por trackable')).toBeVisible();
    await expect(page.getByText('Próximos vencimientos')).toBeVisible();
    await expect(page.getByText('Carga de trabajo')).toBeVisible();
  });

  test('should show global actions list', async ({ page }) => {
    await expect(page.getByText('Todas las actividades')).toBeVisible();
  });
});
