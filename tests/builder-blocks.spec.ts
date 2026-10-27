import { test, expect } from './fixtures';

// =============================================================================
// The builder kit in a real browser (PORTS.md card 173)
// =============================================================================
// /styleguide/sections/ draws one of every builder-kit block with fixed data
// (the event's dates relative to the build day). These drive what node --test
// cannot: the tabs' keyboard pattern and the event's calendar file, directions
// and structured data. The pure logic is pinned in src/lib/builder-blocks.test.ts.
// Stone Steps carries eight of the starter's twelve blocks (no fold-outs,
// countdown or dated notice), so their tests are not here.
// =============================================================================

const box = (type: string) => `[data-section-type="${type}"]`;

test.describe('Builder kit blocks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/styleguide/sections/', { waitUntil: 'domcontentloaded' });
  });

  test('tabs become a tab list that the arrow keys move through', async ({ page }) => {
    const tabs = page.locator(`${box('tabsSection')} [role="tab"]`);
    await expect(tabs).toHaveCount(2);
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
    const panels = page.locator(`${box('tabsSection')} [role="tabpanel"]`);
    await expect(panels.nth(0)).toBeVisible();
    await expect(panels.nth(1)).toBeHidden();
    await tabs.first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(1)).toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(panels.nth(1)).toBeVisible();
    await page.keyboard.press('Home');
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
  });

  test('event details: calendar file, directions and Event structured data', async ({ page }) => {
    const event = page.locator(box('eventDetailsSection'));
    const cal = event.getByRole('link', { name: 'Add to my calendar' });
    const href = (await cal.getAttribute('href')) ?? '';
    expect(href.startsWith('data:text/calendar;charset=utf-8,')).toBe(true);
    const ics = decodeURIComponent(href.slice(href.indexOf(',') + 1));
    expect(ics.match(/BEGIN:VEVENT/g)?.length).toBe(2);
    expect(ics).toContain('LOCATION:The shelter\\, Mt. Airy Forest\\, Cincinnati');
    await expect(cal).toHaveAttribute('download', 'packet-pickup.ics');
    await expect(event.getByRole('link', { name: /Directions/ })).toHaveAttribute(
      'href',
      /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/,
    );
    const ld = JSON.parse(
      (await event.locator('script[type="application/ld+json"]').textContent()) ?? '{}',
    );
    expect(ld['@graph']).toHaveLength(2);
    expect(ld['@graph'][0]['@type']).toBe('Event');
    expect(ld['@graph'][0].location.name).toBe('The shelter');
  });

  // ── Card 193 ──────────────────────────────────────────────────────────────

  test('contact card: big Call and Email buttons, details and directions', async ({ page }) => {
    const card = page.locator(box('contactCardSection'));
    const buttons = card.locator('[data-call-buttons] a');
    await expect(buttons).toHaveCount(2);
    await expect(buttons.first()).toHaveAttribute('href', 'tel:5555550100');
    await expect(buttons.nth(1)).toHaveAttribute('href', 'mailto:hello@example.com');
    expect((await buttons.first().boundingBox())?.height).toBeGreaterThanOrEqual(44);
    await expect(card.getByRole('link', { name: /Get directions/ })).toHaveAttribute(
      'href',
      /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/,
    );
  });

  test('progress: one progressbar with a spoken value and twenty steps', async ({ page }) => {
    const bar = page.locator(`${box('progressSection')} [role="progressbar"]`);
    await expect(bar).toHaveAttribute('aria-valuenow', '65');
    await expect(bar).toHaveAttribute('aria-valuetext', '$32,500 of $50,000, 65 percent');
    await expect(bar.locator('.bb-progress__step')).toHaveCount(20);
  });

  // No newsletter block on this site (no list of its own), so only the calendar half is here.
  test('calendar block links out safely', async ({ page }) => {
    const subscribe = page.locator(`${box('calendarSubscribeSection')} [data-bb-subscribe] a`);
    await expect(subscribe).toHaveCount(3);
    await expect(subscribe.nth(1)).toHaveAttribute(
      'href',
      'webcal://example.com/calendar/events.ics',
    );
    await expect(subscribe.first()).toHaveAttribute('rel', /noopener/);
  });

  test('icon cards and the steps rail: icons, numbered steps, one list each', async ({ page }) => {
    const cards = page.locator(`${box('iconCardsSection')} .bb-icard`);
    await expect(cards).toHaveCount(3);
    await expect(cards.first().locator('svg.bb-icon')).toHaveCount(1);
    const steps = page.locator(`${box('stepsRailSection')} ol > li`);
    await expect(steps).toHaveCount(3);
    await expect(steps.nth(2).locator('.bb-rail__n')).toHaveText('Step 3');
    await expect(steps.nth(2).locator('.bb-rail__trail')).toHaveCount(0);
  });

  test('hub: the index jumps to a group and follows the scroll', async ({ page }) => {
    const hub = page.locator(box('hubSection'));
    const jumps = hub.locator('[data-hub-jump]');
    await expect(jumps).toHaveCount(3);
    await expect(jumps.first()).toHaveAttribute('aria-current', 'true');
    const target = (await jumps.nth(2).getAttribute('href')) ?? '';
    await jumps.nth(2).click();
    await expect(page.locator(target)).toBeInViewport();
    await expect(jumps.nth(2)).toHaveAttribute('aria-current', 'true');
    // The card with a link is one big tap target: its link covers the card.
    await expect(hub.locator('.bb-hcard.bb-stretch').first().locator('a')).toHaveCount(1);
  });
});
