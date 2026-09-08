/* ============================================================================
   Visual regression — the styleguide wall
   ============================================================================
   See playwright.visual.config.ts for why this is a separate suite and why
   baselines are generated in CI rather than on a laptop.

   One full-page shot per theme. Two shots, because the bug that prompted this
   suite was theme-specific: every heading on the site was cream on cream in
   LIGHT mode while dark mode was fine, so a single-theme baseline would have
   sailed past it.
   ============================================================================ */
import { test, expect, type Page } from '@playwright/test';

// The site keys its theme off localStorage under a slug-derived name, applied
// by the BaseLayout head script BEFORE first paint. emulateMedia does nothing
// here, because the choice is class-driven rather than media-driven. Seeding
// the site's own key uses the real mechanism, so the screenshot can never
// catch a light flash on its way to dark.
const THEME_KEY = 'stone-steps-50k-theme';

async function settle(page: Page) {
  await page.goto('/styleguide/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  // Fonts swapping after first paint move every line of type. Waiting on
  // document.fonts.ready covers the load; the pause covers the reflow.
  await page.waitForTimeout(400);
}

test('styleguide, light', async ({ page }) => {
  await page.addInitScript((key) => {
    try {
      localStorage.setItem(key, 'light');
    } catch {
      /* private window: the default is light anyway */
    }
  }, THEME_KEY);
  await settle(page);
  await expect(page).toHaveScreenshot('styleguide-light.png', { fullPage: true });
});

test('styleguide, dark', async ({ page }) => {
  await page.addInitScript((key) => {
    try {
      localStorage.setItem(key, 'dark');
    } catch {
      /* nothing to do; the assertion below will catch it */
    }
  }, THEME_KEY);
  await settle(page);
  // Assert the theme actually applied before trusting the pixels. A seeded key
  // that silently failed would produce a light screenshot filed as the dark
  // baseline, and the suite would then defend the wrong picture forever. This
  // exact mistake happened once already in this repo, with the wrong key name.
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page).toHaveScreenshot('styleguide-dark.png', { fullPage: true });
});
