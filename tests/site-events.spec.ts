// Stone Steps only (not PORTABLE). The shared GA4 event layer (PORTS.md card 217)
// with this site's map (src/config/events.ts), checked in a real browser.
//
// SiteEvents.astro renders whether or not PUBLIC_GA_ID is set, so these run in CI.
// The test supplies window.gtag before any page script, records every call, and
// cancels every navigation so nothing leaves the site.
import { test, expect, type Page } from './fixtures';

async function stubGtag(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __gtagCalls: unknown[][]; gtag: (...a: unknown[]) => void };
    w.__gtagCalls = [];
    w.gtag = (...args: unknown[]) => {
      w.__gtagCalls.push(args);
    };
  });
}

const eventCalls = (page: Page) =>
  page.evaluate(() =>
    (window as unknown as { __gtagCalls: unknown[][] }).__gtagCalls.filter((c) => c[0] === 'event'),
  );

async function addLink(page: Page, href: string, id: string, className = '') {
  await page.evaluate(
    ({ href, id, className }) => {
      const a = document.createElement('a');
      a.id = id;
      a.href = href;
      a.className = className;
      a.textContent = id;
      const top = document.querySelectorAll('[data-added-link]').length * 60;
      a.setAttribute('data-added-link', '');
      a.style.cssText = `position:fixed;top:${top}px;left:0;z-index:99999;background:#fff;padding:12px`;
      document.body.appendChild(a);
    },
    { href, id, className },
  );
}

test.describe('shared GA4 events', () => {
  test.beforeEach(async ({ page }) => {
    await stubGtag(page);
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/i, (route) => route.abort());
    await page.goto('/', { waitUntil: 'load' });
    await page.evaluate(() => {
      document.addEventListener('click', (e) => e.preventDefault());
    });
  });

  test('an email link sends contact_click with the kind, never the address', async ({ page }) => {
    await addLink(page, 'mailto:someone@example.org', 'mail');
    await page.locator('#mail').click();
    expect(await eventCalls(page)).toEqual([
      ['event', 'contact_click', { method: 'email', location: 'page' }],
    ]);
  });

  test('a maps link sends directions_click and a YouTube link watch_click', async ({ page }) => {
    await addLink(page, 'https://www.google.com/maps/dir/?api=1&destination=x', 'map');
    await addLink(page, 'https://www.youtube.com/watch?v=abc', 'vid');
    await page.locator('#map').click();
    await page.locator('#vid').click();
    const names = (await eventCalls(page)).map((c) => c[1]);
    expect(names).toEqual(['directions_click', 'watch_click']);
  });

  test('a sponsor patch link sends sponsor_click with the host only', async ({ page }) => {
    await addLink(page, 'https://sponsor.example.com/path?x=1', 'sp', 'patch__link');
    await page.locator('#sp').click();
    expect(await eventCalls(page)).toEqual([
      ['event', 'sponsor_click', { destination: 'sponsor.example.com', location: 'page' }],
    ]);
  });

  test('an ordinary link to another site sends nothing', async ({ page }) => {
    await addLink(page, 'https://www.facebook.com/groups/x', 'fb');
    await page.locator('#fb').click();
    expect(await eventCalls(page)).toEqual([]);
  });

  test('a RunSignUp link sends nothing from the shared layer', async ({ page }) => {
    // registration_click comes from the inline listener only; a second sender would double it.
    await addLink(page, 'https://runsignup.com/Race/OH/Cincinnati/StoneSteps50K', 'rsu');
    await page.locator('#rsu').click();
    const names = (await eventCalls(page)).map((c) => c[1]);
    expect(names.filter((n) => n !== 'registration_click')).toEqual([]);
    expect(names.length).toBeLessThanOrEqual(1);
  });
});
