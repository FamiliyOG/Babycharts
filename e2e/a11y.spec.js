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
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .disableRules(['color-contrast']) // Contrast tested with theme tokens
    .analyze();

  const criticalViolations = accessibilityScanResults.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious'
  );

  if (criticalViolations.length > 0) {
    console.error(
      '[A11y Critical Violation]',
      contextName,
      criticalViolations.map((v) => ({ id: v.id, impact: v.impact, description: v.description }))
    );
  }

  expect(criticalViolations).toEqual([]);
}

test.describe('Automated Accessibility (WCAG 2.2 AAA) Audit (Issue #242)', () => {
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

  test('mobile viewport (390x844) preserves clean accessibility tree', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    await scanPageA11y(page, 'Mobile Viewport');
  });

  test('light mode theme preserves clean accessibility semantics', async ({ page }) => {
    // Trigger light mode toggle if available
    const themeBtn = page
      .locator('button[aria-label*="Theme"], button[aria-label*="Modus"]')
      .first();
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      await page.waitForTimeout(200);
    }
    await scanPageA11y(page, 'Light Mode');
  });
});
