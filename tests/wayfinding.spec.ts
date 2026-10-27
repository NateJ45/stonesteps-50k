import { test, expect } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

// =============================================================================
// Wayfinding (PORTS.md card 191; src/lib/wayfinding.ts)
// =============================================================================
// Drives /styleguide/wayfinding/ (src/pages/styleguide/wayfinding.astro), the chrome with fixed
// Site settings that switch on the phone action bar, the one wayfinding piece this site takes: phones
// only, after the heading, gone while the footer shows, above the safe area, passes axe, fits 320px;
// and a page with nothing set carrying none of it.
// =============================================================================

const ROUTE = '/styleguide/wayfinding/';
type Page = import('@playwright/test').Page;

const barShown = (page: Page) =>
  page.evaluate(() => {
    const bar = document.querySelector<HTMLElement>('div[data-action-bar]');
    return !!bar && !bar.hidden && getComputedStyle(bar).display !== 'none';
  });

test.describe('wayfinding', () => {
  test('action bar: shows past the heading on a phone, gives way to the footer', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(ROUTE, { waitUntil: 'load' });
    expect(await barShown(page), 'not at the top of the page').toBe(false);

    await page.evaluate(() => window.scrollTo(0, 600));
    await expect.poll(() => barShown(page)).toBe(true);
    const bar = page.locator('div[data-action-bar]');
    await expect(bar.getByRole('link', { name: 'See the results' })).toHaveAttribute(
      'href',
      '/results/',
    );
    await expect(bar).toContainText('Results are up');
    const box = await bar.boundingBox();
    expect(Math.round(box!.y + box!.height)).toBe(812);
    expect(
      await page.evaluate(() => document.documentElement.hasAttribute('data-action-bar-on')),
    ).toBe(true);
    const button = await bar.getByRole('link').boundingBox();
    expect(button!.height).toBeGreaterThanOrEqual(44);

    const axe = await new AxeBuilder({ page }).include('[data-action-bar]').analyze();
    expect(axe.violations).toEqual([]);

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => barShown(page), { message: 'hidden over the footer' }).toBe(false);
  });

  test('action bar: never on a desktop screen', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(ROUTE, { waitUntil: 'load' });
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(200);
    expect(await barShown(page)).toBe(false);
  });

  test('320px: no sideways scroll with the bar showing', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(ROUTE, { waitUntil: 'load' });
    await page.evaluate(() => window.scrollTo(0, 500));
    await expect.poll(() => barShown(page)).toBe(true);
    const fits = () =>
      page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(await fits()).toBe(true);
    const bar = await page.locator('div[data-action-bar]').boundingBox();
    expect(bar!.width).toBeLessThanOrEqual(320);
  });

  test('a page with nothing set carries none of it', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/privacy/', { waitUntil: 'load' });
    await expect(page.locator('div[data-action-bar]')).toHaveCount(0);
  });
});
