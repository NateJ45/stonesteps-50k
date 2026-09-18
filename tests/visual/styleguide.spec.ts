/* ============================================================================
   Visual regression — the styleguide wall
   ============================================================================
   See playwright.visual.config.ts for why this is a separate suite, why the
   baselines are generated in CI, and why this file refuses to run on Windows.

   One full-page shot per theme. Two shots, because the bug that prompted this
   suite was theme-specific: every heading on the site was cream on cream in
   LIGHT mode while dark mode was fine, so a single-theme baseline would have
   sailed past it.
   ============================================================================ */
import { test, expect, type Page } from '@playwright/test';

// THE BASELINES ARE LINUX PIXELS (ported from the starter, 2026-09-18). Font
// rasterisation on Windows differs enough that the dark shot fails every local
// run, which is how a gate gets ignored: four separate agents hit this failure
// this week, each spent time confirming it was not their change, and each was
// right. Skip with a reason rather than fail with one; CI is the arbiter. Set
// VISUAL_FORCE=1 to compare anyway when debugging the harness itself.
const WINDOWS_SKIP =
  process.platform === 'win32' && !process.env.VISUAL_FORCE
    ? 'Baselines are Linux-rendered; Windows font rasterisation differs. Run this in CI ' +
      '(.github/workflows/visual.yml), or set VISUAL_FORCE=1 to compare anyway.'
    : null;

if (WINDOWS_SKIP) {
  // The annotation carries the reason into the report; this line carries it
  // into the terminal, where the person who typed the command is looking.
  console.log(`\n[visual] Skipped on win32. ${WINDOWS_SKIP}\n`);
}

test.skip(() => WINDOWS_SKIP !== null, WINDOWS_SKIP ?? '');

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
