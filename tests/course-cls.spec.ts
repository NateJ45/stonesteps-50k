// =============================================================================
// /course/ layout stability (PENDING 1w, 2026-10-27)
// =============================================================================
// The course page loads a MapLibre map and an elevation strip after the page is
// up. The strip used to replace a one-line status and shove everything under it
// down (CLS about 0.13). The slot now holds its height, and this pins it: walk the
// page top to bottom the way a reader does, let the map hydrate, and the summed
// layout shift (shifts after a click or key do not count, as in Chrome) stays
// under 0.05, well inside Google's 0.1 "good" line. Run it against the built site.
// =============================================================================
import { test, expect } from './fixtures';

for (const width of [375, 1280]) {
  test(`/course/ keeps layout shift under 0.05 at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 600 ? 812 : 800 });
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number };
      w.__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as unknown as {
          value: number;
          hadRecentInput: boolean;
        }[]) {
          if (!e.hadRecentInput) w.__cls += e.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto('/course/', { waitUntil: 'load' });
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += 300) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(120);
    }
    // The map hydrates when it scrolls into view; give it and the strip time to land.
    await page.waitForSelector('.cprof', { timeout: 20000 });
    await page.waitForTimeout(1500);
    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    expect(cls, `CLS ${cls.toFixed(4)}`).toBeLessThan(0.05);
  });
}
