import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Automated Accessibility (WCAG 2.1 AA) Audit', () => {
  test('home/initial view should not have serious or critical a11y violations', async ({
    page,
  }) => {
    await page.goto('/');

    // Wait for the app to initialize
    await page.waitForSelector('#root');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast']) // Color contrast can have dark-mode dynamic themes; check structure & tags
      .analyze();

    // Filter only serious and critical issues
    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toEqual([]);
  });
});
