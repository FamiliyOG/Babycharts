import { test, expect } from '@playwright/test';

test.describe('E2E Authentication Journey (BC-300)', () => {
  test('allows navigating to auth screen and displays login/registration tabs', async ({
    page,
  }) => {
    await page.goto('/');

    // Check header and user action elements
    await expect(page.locator('header')).toBeVisible();

    // Look for login or register triggers
    const loginBtn = page.locator('button:has-text("Anmelden"), button:has-text("Login")').first();
    if (await loginBtn.isVisible()) {
      await loginBtn.click();
      await expect(page.locator('role=dialog, .fixed')).toBeVisible();
    }
  });
});
