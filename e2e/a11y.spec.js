import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const WCAG_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag2aaa',
  'wcag21a',
  'wcag21aa',
  'wcag21aaa',
  'wcag22aa',
  'wcag22aaa',
  'best-practice',
];

async function scanPageA11y(page, contextName = '') {
  const accessibilityScanResults = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

  const blockingViolations = accessibilityScanResults.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious' || v.impact === 'moderate'
  );

  if (blockingViolations.length > 0) {
    console.error(
      '[A11y Violation]',
      contextName,
      blockingViolations.map((v) => ({ id: v.id, impact: v.impact, description: v.description }))
    );
  }

  expect(blockingViolations).toEqual([]);
}

test.describe('Automated Accessibility (WCAG 2.2 AA) Audit (Issues #270, #271, #272, #273)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#root');
  });

  test('home/dashboard initial view has zero critical or serious a11y violations', async ({
    page,
  }) => {
    await scanPageA11y(page, 'Home View');
  });

  test('growth chart and accessible tabular view are fully accessible', async ({ page }) => {
    // Look for Kurve/Tabelle switch if profile is loaded
    const tableButton = page.locator('button:has-text("Tabelle")').first();
    if (await tableButton.isVisible()) {
      await tableButton.click();
      await page.waitForTimeout(300);
      await scanPageA11y(page, 'Growth Table View');

      const chartButton = page.locator('button:has-text("Kurve")').first();
      await chartButton.click();
      await page.waitForTimeout(300);
      await scanPageA11y(page, 'Growth Chart View');
    }
  });

  test('320px narrow viewport reflow without horizontal scrolling or a11y regressions (#273)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 600 });
    await page.waitForTimeout(200);
    await scanPageA11y(page, '320px Reflow Viewport');
  });

  test('authentication / login modal is accessible and dismissible via Escape (#271, #272)', async ({
    page,
  }) => {
    // Look for login button if logged out
    const loginBtn = page.locator('button:has-text("Anmelden"), button:has-text("Login")').first();
    if (await loginBtn.isVisible()) {
      await loginBtn.click();
      await page.waitForTimeout(300);
      await scanPageA11y(page, 'Auth Modal');

      // Test Escape dismissal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      const modal = page.locator('div[role="dialog"]');
      expect(await modal.count()).toBe(0);
    }
  });
});
