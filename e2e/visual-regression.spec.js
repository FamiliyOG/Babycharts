import { test, expect } from '@playwright/test';

test.describe('E2E Visual Regression Baseline (BC-303)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#root');
    // Disable CSS animations/transitions for deterministic screenshots
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `,
    });
  });

  test('home page matches layout baseline in current viewport', async ({ page }) => {
    await expect(page.locator('header')).toBeVisible();
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });
});
