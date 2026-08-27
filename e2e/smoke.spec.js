import { test, expect } from '@playwright/test';

test.describe('BabyCharts E2E Core Flow (BC-076)', () => {
  test('loads home dashboard with header and chart navigation', async ({ page }) => {
    await page.goto('/');

    // Validate page title and brand
    await expect(page).toHaveTitle(/BabyCharts/i);
    await expect(page.locator('header')).toBeVisible();
  });
});
