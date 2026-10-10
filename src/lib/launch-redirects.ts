// =============================================================================
// launch-redirects - hand-written forwards for URLs the old WordPress site had
// =============================================================================
// Stone Steps only (not PORTABLE). astro.config.mjs spreads this map into
// Astro's `redirects` BEFORE the editor's Studio redirects, so an editor entry
// can still correct one without a code change. They live in code rather than
// only in Sanity because a code redirect survives an empty dataset: a restore,
// a bad deploy or a dataset swap must not silently drop them.
//
// Every entry is here because there is EVIDENCE the old address is in use:
//
//   /all-time-records   twenty years of inbound links from running forums.
//   /the-course         a live WordPress page (Wayback Machine, 200 on
//                       2024-03-04) and 8 GA4 landings in September 2026 that
//                       landed on the 404 page.
//   /dev/wordpress/course
//                       a 2010 development address that old links still use
//                       (4 GA4 landings in September 2026).
//
// Do not add a path on a hunch. Check the Wayback Machine CDX index or GA4
// landing pages first; a forward nobody needs is one more thing to maintain.
// Keys are the canonical shape (leading slash, no trailing slash): Astro's
// adapter matches the trailing-slash form too. DESTINATIONS keep the trailing
// slash on purpose: the host answers a slash-less page address with a 307 to the
// slash form, so pointing straight at it saves a hop (301 then 307 then 200).
// =============================================================================

export interface LaunchRedirect {
  status: 301;
  destination: string;
}

export const launchRedirects: Record<string, LaunchRedirect> = {
  '/all-time-records': { status: 301, destination: '/records/' },
  '/the-course': { status: 301, destination: '/course/' },
  '/dev/wordpress/course': { status: 301, destination: '/course/' },
  '/registered-runners': { status: 301, destination: '/results/' },
};
