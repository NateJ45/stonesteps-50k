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
//   /index.htm, /index_files/Registration.htm, /results/results-<yyyy>
//                       404s reported by Search Console (checked live 2026-10-25); the
//                       year forwards cover only the years the archive has (2003-2025).
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
  '/index.htm': { status: 301, destination: '/' },
  '/index_files/Registration.htm': { status: 301, destination: '/' },
  '/results/results-2003': { status: 301, destination: '/results/2003/' },
  '/results/results-2004': { status: 301, destination: '/results/2004/' },
  '/results/results-2005': { status: 301, destination: '/results/2005/' },
  '/results/results-2006': { status: 301, destination: '/results/2006/' },
  '/results/results-2007': { status: 301, destination: '/results/2007/' },
  '/results/results-2008': { status: 301, destination: '/results/2008/' },
  '/results/results-2009': { status: 301, destination: '/results/2009/' },
  '/results/results-2010': { status: 301, destination: '/results/2010/' },
  '/results/results-2011': { status: 301, destination: '/results/2011/' },
  '/results/results-2012': { status: 301, destination: '/results/2012/' },
  '/results/results-2013': { status: 301, destination: '/results/2013/' },
  '/results/results-2014': { status: 301, destination: '/results/2014/' },
  '/results/results-2015': { status: 301, destination: '/results/2015/' },
  '/results/results-2016': { status: 301, destination: '/results/2016/' },
  '/results/results-2017': { status: 301, destination: '/results/2017/' },
  '/results/results-2018': { status: 301, destination: '/results/2018/' },
  '/results/results-2019': { status: 301, destination: '/results/2019/' },
  '/results/results-2020': { status: 301, destination: '/results/2020/' },
  '/results/results-2021': { status: 301, destination: '/results/2021/' },
  '/results/results-2022': { status: 301, destination: '/results/2022/' },
  '/results/results-2023': { status: 301, destination: '/results/2023/' },
  '/results/results-2024': { status: 301, destination: '/results/2024/' },
  '/results/results-2025': { status: 301, destination: '/results/2025/' },
};
