// Safe to edit by hand
// =============================================================================
// events.ts - this site's map for the GA4 event layer (PORTS.md card 217)
// =============================================================================
// The shared half is src/lib/track.ts and src/components/analytics/SiteEvents.astro
// (PORTABLE); they read this map and nothing else.
//
// REGISTRATION IS NOT HERE ON PURPOSE. `registration_click` (parameter
// `link_url`: scheme, host and path only) is sent by the inline listener in
// src/lib/ga-events-listener.js, which also counts a middle-click that the
// shared listener does not see. A rule for runsignup.com in this map would send
// each click twice, so there is none, and `outbound_click` is off so a RunSignUp
// link falls through to nothing here. docs/agent/analytics.md has the reasons.
//
// What this map adds (new events only; nothing sent before changes):
//   contact_click     an email or phone link (built in)
//   directions_click  a Google or Apple Maps link (built in)
//   watch_click       a YouTube or Vimeo link (built in)
//   sponsor_click     a sponsor's patch on the page (the rule below)
//   generate_lead     the contact form was sent (RaceContactForm, unchanged)
//
// Everything else the shared layer can send is switched off in `off`, so the
// site counts exactly the list above and the privacy page (derived from this
// map in src/lib/event-kinds.ts) says the same.
// Docs: docs/agent/analytics.md.
// =============================================================================

import type { EventsConfig } from '@/lib/track';

export const eventsConfig: EventsConfig = {
  links: [
    // A sponsor's patch (SponsorPatches.astro, class patch__link) that leads to
    // the sponsor's own site. The classifier is handed an address, not the
    // element, so this looks the address up among the patches on the page.
    // Browser only: with no document (a unit test) it never matches.
    {
      own: false,
      test: (l) =>
        typeof document !== 'undefined' &&
        Array.from(document.querySelectorAll<HTMLAnchorElement>('a.patch__link')).some(
          (a) => a.href === l.url.href,
        ),
      event: 'sponsor_click',
      params: (l) => ({ destination: l.host.slice(0, 80) }),
      describe: 'links to the race’s sponsors',
    },
  ],

  off: [
    // Google's Enhanced Measurement already counts these, so ours would double them.
    'outbound_click',
    'download_click',
    // Registration is counted as registration_click by the inline listener.
    'register_click',
    // Not wanted here: nothing on the site uses them, or they were never counted.
    'form_view',
    'embed_interact',
    'article_progress',
    'article_read',
    'site_search',
    'search_no_results',
    'page_not_found',
    'js_error',
  ],
};
