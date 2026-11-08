// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test, expect } from './fixtures';
import AxeBuilder from '@axe-core/playwright';
import { routes } from './routes';
import { settle } from './helpers';

// Accessibility (axe-core), light mode, every route. Zero violations.
//
// Tags are explicit: WCAG 2.0 / 2.1 / 2.2 level A and AA plus axe's best
// practices. WCAG 2.2 is listed on purpose, because axe leaves its 2.2 rules
// (target-size, 2.5.8) off unless 'wcag22aa' is requested. Exclude a rule only
// with a comment saying which false positive it is.

for (const route of routes) {
  test(`a11y (light): ${route} has no axe violations`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await settle(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .analyze();

    if (results.violations.length > 0) {
      const report = results.violations
        .map((v) => {
          const targets = v.nodes.map((n) => n.target.join(' ')).join(', ');
          return `  [${v.impact ?? 'unknown'}] ${v.id}: ${v.help}\n    route: ${route}\n    selectors: ${targets}`;
        })
        .join('\n');
      expect(results.violations, `axe violations on ${route}:\n${report}`).toEqual([]);
    }
  });
}
