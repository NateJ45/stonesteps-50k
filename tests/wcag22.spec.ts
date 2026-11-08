import { test, expect } from './fixtures';
import { settle } from './helpers';

// =============================================================================
// WCAG 2.2 behaviours axe cannot see (stonesteps-50k, 2026-11-08)
// =============================================================================
// 2.4.11 Focus Not Obscured (Minimum): tabbing BACKWARDS used to bring a link to
//   the very top edge of the viewport, under the sticky sign-board header, because
//   `html` had no scroll-padding-top. The check walks the page with Shift+Tab at
//   a phone width and, at every stop, samples nine points inside the focused
//   element's visible rectangle with elementFromPoint: at least one must land on
//   the element itself (or inside it). "Fully covered" is the failure.
//
// 2.2.2 Pause, Stop, Hide: the sponsor ticker moves for longer than five seconds,
//   so it carries a Pause / Play button. The strip is aria-hidden decoration, the
//   button is not.
//
// Site-specific on purpose (no PORTABLE marker): the ticker and this header are
// this repo's.
// =============================================================================

const PHONE = { width: 390, height: 844 };

for (const route of ['/', '/records/']) {
  test.describe(`2.4.11 Focus Not Obscured: ${route}`, () => {
    test.use({ viewport: PHONE });

    test('Shift+Tab up the page never leaves the focused element fully covered', async ({
      page,
    }) => {
      test.setTimeout(180_000);
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await settle(page, { freezeAnimations: false });
      // The header slides in and out on a 300ms transition; a check that fires
      // mid-slide would measure a header that is not there yet.
      await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important}' });

      // Start at the last tabbable element, then walk up.
      await page.evaluate(() => {
        const tabbable = Array.from(
          document.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
        });
        tabbable[tabbable.length - 1]?.focus();
      });

      const covered: string[] = [];
      let steps = 0;
      for (; steps < 400; steps++) {
        const result = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el || el === document.body || el === document.documentElement) return { done: true };
          const r = el.getBoundingClientRect();
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          // The part of the element that is inside the window at all.
          const x0 = Math.max(r.left, 0);
          const x1 = Math.min(r.right, vw);
          const y0 = Math.max(r.top, 0);
          const y1 = Math.min(r.bottom, vh);
          const label = `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 40)}" top=${Math.round(r.top)}`;
          if (r.width === 0 || r.height === 0) return { done: false, skipped: true, label };
          if (x1 <= x0 || y1 <= y0) return { done: false, hit: false, label };
          let hit = false;
          for (const fx of [0.1, 0.5, 0.9]) {
            for (const fy of [0.1, 0.5, 0.9]) {
              const top = document.elementFromPoint(x0 + (x1 - x0) * fx, y0 + (y1 - y0) * fy);
              if (top && (top === el || el.contains(top))) hit = true;
            }
          }
          return { done: false, hit, label };
        });
        if (result.done) break;
        if (!result.skipped && !result.hit) covered.push(result.label ?? '?');
        await page.keyboard.press('Shift+Tab');
      }

      expect(steps, 'walked a meaningful number of focus stops').toBeGreaterThan(5);
      expect(covered, `fully covered focus stops on ${route}:\n  ${covered.join('\n  ')}`).toEqual(
        [],
      );
    });

    test('html reserves room for the sticky header', async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const { padding, header } = await page.evaluate(() => ({
        padding: parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0,
        header: document.querySelector('header.site-header')?.getBoundingClientRect().height ?? 0,
      }));
      expect(padding).toBeGreaterThanOrEqual(header);
    });
  });
}

test.describe('2.2.2 Pause, Stop, Hide: the sponsor ticker', () => {
  test('a Pause / Play button holds the strip still and starts it again', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const strip = page.locator('[data-ticker]').first();
    const track = strip.locator('.ticker__track');
    const toggle = strip.locator('[data-ticker-toggle]');
    await expect(toggle).toBeVisible();
    // Past the entrance ease, so the only transform left moving is the loop.
    await page.waitForTimeout(1700);

    const x = () =>
      track.evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41);

    // Playing: it moves.
    const a = await x();
    await page.waitForTimeout(400);
    const b = await x();
    expect(b, 'the strip is moving before the click').not.toBe(a);

    // Reachable and operable from the keyboard (this also gives it focus, which
    // holds it still on its own, so the next step moves focus away again).
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(strip).toHaveAttribute('data-paused', '');
    await expect(toggle).toHaveAccessibleName(/play/i);
    await toggle.evaluate((el) => (el as HTMLElement).blur());
    await page.mouse.move(2, 2);

    const c = await x();
    await page.waitForTimeout(500);
    const d = await x();
    expect(d, 'the strip holds still while paused').toBe(c);
    await expect(track).toHaveCSS('animation-play-state', 'paused');

    // Play again, focus and pointer both elsewhere: it moves.
    await toggle.focus();
    await page.keyboard.press('Space');
    await expect(strip).not.toHaveAttribute('data-paused', /.*/);
    await expect(toggle).toHaveAccessibleName(/pause/i);
    await toggle.evaluate((el) => (el as HTMLElement).blur());
    const e = await x();
    await page.waitForTimeout(400);
    const f = await x();
    expect(f, 'the strip moves again after Play').not.toBe(e);
  });

  test('it also holds still while the pointer is over it', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const strip = page.locator('[data-ticker]').first();
    await expect(strip).toBeVisible();
    await page.waitForTimeout(1700);
    await strip.locator('.ticker__window').hover({ position: { x: 20, y: 10 } });
    await expect(strip.locator('.ticker__track')).toHaveCSS('animation-play-state', 'paused');
  });
});
