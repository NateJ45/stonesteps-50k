// Interactive components must survive a View Transitions navigation.
//
// THE BUG THIS EXISTS FOR. A component's <script> is a module, and a module
// runs ONCE per full page load. The ClientRouter swaps the document on a
// client-side navigation without re-executing it, so any component that binds
// at module scope is dead on every page after the first: the elements are new,
// and nothing is driving them.
//
// It is a nasty failure because it is invisible on a first load, invisible in a
// build, invisible to axe, and invisible to a smoke test that only ever visits
// a page directly. You only see it by LEAVING a page and coming back, which is
// what these tests do. The countdown froze on the built value; the records
// tablist looked like a working control that answered nothing.
//
// Deliberately not in smoke.spec.ts: that file is canonical for the whole site
// family and these are this site's components.
import { test, expect } from '@playwright/test';

test('the countdown keeps running after navigating away and back', async ({ page }) => {
  await page.goto('/');
  const seconds = page.locator('.clock [data-unit="seconds"]').first();
  await expect(seconds).toBeVisible();

  // Away, then back, the way a visitor reads the course page and returns.
  await page.goto('/course/');
  await page.goto('/');
  await expect(seconds).toBeVisible();

  // Two readings a second and a bit apart. If the clock is not bound they are
  // identical, because the markup still carries the value it was BUILT with.
  const first = await seconds.textContent();
  await expect
    .poll(async () => seconds.textContent(), {
      message: `seconds never changed from ${first}: the countdown did not re-bind`,
      timeout: 4000,
    })
    .not.toBe(first);
});

test('the records tabs still switch after navigating away and back', async ({ page }) => {
  await page.goto('/records/');
  await page.goto('/');
  await page.goto('/records/');

  const tabs = page.locator('[role="tab"]');
  if ((await tabs.count()) < 2) test.skip(true, 'only one distance on file');

  const second = tabs.nth(1);
  await second.click();
  await expect(second).toHaveAttribute('aria-selected', 'true');
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'false');
});
