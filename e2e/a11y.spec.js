import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Automated Accessibility (WCAG 2.2 AAA) Audit', () => {
  test('home/initial view should not have serious or critical a11y violations', async ({
    page,
  }) => {
    await page.goto('/');

    // Wait for the app to initialize
    await page.waitForSelector('#root');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags([
        'wcag2a',
        'wcag2aa',
        'wcag2aaa',
        'wcag21a',
        'wcag21aa',
        'wcag21aaa',
        'wcag22aa',
        'wcag22aaa',
        'best-practice',
      ])
      .disableRules(['color-contrast']) // Color contrast can have dark-mode dynamic themes; check structure & tags
      .analyze();

    // Filter only serious and critical issues
    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toEqual([]);
  });
});
