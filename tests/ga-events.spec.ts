// Stone Steps only (not PORTABLE). The two GA4 goal events, src/lib/ga-events.ts.
//
// NEVER LEAVES THE SITE, NEVER SENDS A MESSAGE. Every navigation to RunSignUp is
// cancelled by a document-level preventDefault plus a route that aborts the
// request, and the contact POST is intercepted and fulfilled by the test.
//
// THE CLICK TESTS NEED A BUILD WITH PUBLIC_GA_ID. The listener is rendered only
// when that id is set (BaseLayout), and CI builds without it (card 54), so there
// the click tests skip instead of failing; the pure logic is covered by
// src/lib/ga-events.test.ts either way. Run them locally with
//   PUBLIC_GA_ID=G-TEST000000 npm run build && npm test -- ga-events
// (the dummy id is passed through the environment only, never written to a file;
// the hostname guard means localhost sends nothing to Google regardless).
// The contact test needs no GA build: the form calls window.gtag directly, and
// the test supplies a stub.
import { test, expect, type Page } from './fixtures';

type GtagCall = unknown[];

/** Define window.gtag BEFORE any page script runs, recording every call. */
async function stubGtag(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __gtagCalls: unknown[][]; gtag: (...a: unknown[]) => void };
    w.__gtagCalls = [];
    w.gtag = (...args: unknown[]) => {
      w.__gtagCalls.push(args);
    };
  });
}

const calls = (page: Page) =>
  page.evaluate(() => (window as unknown as { __gtagCalls: GtagCall[] }).__gtagCalls);

/** Cancel every navigation to RunSignUp so the test stays on the site. */
async function neverLeave(page: Page) {
  await page.route(/^https?:\/\/([^/]+\.)?runsignup\.com\//i, (route) => route.abort());
  await page.evaluate(() => {
    document.addEventListener('click', (e) => e.preventDefault());
    document.addEventListener('auxclick', (e) => e.preventDefault());
  });
}

async function buildHasListener(page: Page): Promise<boolean> {
  // The GA snippet is only in the HTML when the build had PUBLIC_GA_ID.
  return /googletagmanager\.com\/gtag\/js/.test(await page.content());
}

/** Add a link after load, which is what proves the listener is delegated. */
async function addLink(page: Page, href: string, id: string) {
  await page.evaluate(
    ({ href, id }) => {
      const a = document.createElement('a');
      a.id = id;
      a.href = href;
      a.textContent = id;
      // Stack each added link lower so several never overlap and intercept clicks.
      const top = document.querySelectorAll('[data-added-link]').length * 60;
      a.setAttribute('data-added-link', '');
      a.style.cssText = `position:fixed;top:${top}px;left:0;z-index:99999;background:#fff;padding:12px`;
      document.body.appendChild(a);
    },
    { href, id },
  );
}

test.describe('GA4 goal: registration_click', () => {
  test.beforeEach(async ({ page }) => {
    await stubGtag(page);
    await page.goto('/', { waitUntil: 'load' });
    test.skip(!(await buildHasListener(page)), 'build has no PUBLIC_GA_ID, so no listener');
    await neverLeave(page);
  });

  test('a click on a RunSignUp link sends exactly one registration_click', async ({ page }) => {
    await addLink(page, 'https://runsignup.com/Race/OH/Cincinnati/StoneSteps50K?coupon=X#a', 'rsu');
    await page.locator('#rsu').click();
    await page.waitForTimeout(300);
    expect(await calls(page)).toEqual([
      [
        'event',
        'registration_click',
        { link_url: 'https://runsignup.com/Race/OH/Cincinnati/StoneSteps50K' },
      ],
    ]);
  });

  test('a middle-click (new tab) is counted once, a right-click is not', async ({ page }) => {
    await addLink(page, 'https://results.runsignup.com/Race/Results/1', 'rsu');
    await page.locator('#rsu').click({ button: 'middle' });
    await page.locator('#rsu').click({ button: 'right' });
    // Close the context menu a right-click opens in headed runs.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    expect(await calls(page)).toEqual([
      ['event', 'registration_click', { link_url: 'https://results.runsignup.com/Race/Results/1' }],
    ]);
  });

  test('a click inside a RunSignUp link (on a child element) counts', async ({ page }) => {
    await page.evaluate(() => {
      const a = document.createElement('a');
      a.href = 'https://runsignup.com/Race/1';
      a.style.cssText = 'position:fixed;top:0;left:0;z-index:99999;background:#fff;padding:12px';
      a.innerHTML = '<span id="inner">Register</span>';
      document.body.appendChild(a);
    });
    await page.locator('#inner').click();
    await page.waitForTimeout(300);
    expect((await calls(page)).length).toBe(1);
  });

  test('lookalike and on-site links send nothing', async ({ page }) => {
    await page.route(/notrunsignup\.com|evil\.example/i, (route) => route.abort());
    await addLink(page, 'https://notrunsignup.com/', 'a');
    await addLink(page, 'https://runsignup.com.evil.example/', 'b');
    await addLink(page, '/results/', 'c');
    for (const id of ['a', 'b', 'c']) await page.locator(`#${id}`).click();
    await page.waitForTimeout(300);
    expect(await calls(page)).toEqual([]);
  });
});

test('with no gtag defined a RunSignUp click throws nothing and creates no dataLayer', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/', { waitUntil: 'load' });
  await neverLeave(page);
  await addLink(page, 'https://runsignup.com/Race/1', 'rsu');
  await page.locator('#rsu').click();
  await page.waitForTimeout(300);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => typeof (window as { dataLayer?: unknown }).dataLayer)).toBe(
    'undefined',
  );
  expect(await page.evaluate(() => typeof (window as { gtag?: unknown }).gtag)).toBe('undefined');
});

test.describe('GA4 goal: generate_lead', () => {
  async function fill(page: Page) {
    // Wait for the React island to hydrate: submitting before it does is a
    // native form submit, not the handler under test.
    await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'));
    await page.locator('#name').fill('Test Runner');
    await page.locator('#email').fill('runner@example.com');
    await page.locator('#message').fill('Is there a shuttle?');
  }

  test('a confirmed send fires one generate_lead and carries no form content', async ({ page }) => {
    await stubGtag(page);
    let posts = 0;
    // The real endpoint is never reached.
    await page.route('**/api/contact', async (route) => {
      posts += 1;
      await route.fulfill({ json: { ok: true } });
    });
    await page.goto('/contact/', { waitUntil: 'load' });
    await fill(page);
    await page.getByRole('button', { name: /^Send/ }).click();
    await expect(page.getByText('Message sent')).toBeVisible();
    expect(posts).toBe(1);
    const sent = await calls(page);
    expect(sent).toEqual([['event', 'generate_lead', { form_name: 'contact' }]]);
    expect(JSON.stringify(sent)).not.toMatch(/runner@example|Test Runner|shuttle/);
  });

  test('a failed send fires nothing', async ({ page }) => {
    await stubGtag(page);
    await page.route('**/api/contact', (route) =>
      route.fulfill({ status: 422, json: { ok: false, error: 'Nope.' } }),
    );
    await page.goto('/contact/', { waitUntil: 'load' });
    await fill(page);
    await page.getByRole('button', { name: /^Send/ }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    expect(await calls(page)).toEqual([]);
  });
});
