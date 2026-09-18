// Foundation, edit with care
// Single source of truth for reserved URL slugs — routes served by explicit
// Astro page files that a custom `page` document may not shadow.
//
// Used by:
//   - studio/schemaTypes/page.ts   (Studio slug validation rule)
//   - src/pages/[slug].astro       (getStaticPaths filter)
//
// Keep both consumers in sync: when adding a new page route (e.g., a new
// module), add its slug here so the page builder guard stays current.

export const RESERVED_SLUGS = new Set([
  '404',
  'sitemap-index.xml',
  'og',
  '_astro',
  'results',
  'runners',
  // The privacy policy is a code page on purpose (see src/pages/privacy.astro),
  // so a custom Sanity page called "privacy" must not be able to shadow it.
  'privacy',
  // The fixed-data wall the visual-regression suite shoots.
  'styleguide',
  // Mounted routes rather than pages, but a custom page at any of these would
  // still shadow one or be shadowed by it.
  'studio',
  'preview',
  'api',
]);

/** Returns true when a slug collides with a built-in route. */
export function isReservedSlug(slug: string | undefined | null): boolean {
  if (!slug) return false;
  return RESERVED_SLUGS.has(slug);
}
