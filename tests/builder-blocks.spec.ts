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
});
