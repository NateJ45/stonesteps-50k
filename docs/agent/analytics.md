# Analytics (GA4)

Cloudflare Web Analytics is cookieless; GA4 is the second, richer tag and is the one this file covers. Property 552910285, stream Measurement ID in the repo variable `PUBLIC_GA_ID` (read by `deploy.yml` only).

## The hostname rule (PORTS.md card 58)

`src/components/analytics/GoogleAnalytics.astro` is PORTABLE (canonical in the starter). It compares `location.hostname` with the host of `site` in `astro.config.mjs` (`stonesteps50k.com`, apex and `www`) and off those hosts does nothing: no `dataLayer`, no `window.gtag`, no request to Google. Why: in September 2026 the property held 347 sessions with hostName `localhost` (our own Playwright and Lighthouse runs, built with a developer `.env` that carries `PUBLIC_GA_ID`) against 735 real ones. CI never had the id; a developer's `.env` did.

- It also does nothing in automated browsers (`navigator.webdriver`, or a HeadlessChrome / Lighthouse / PTST / GTmetrix / Speed Insights user agent), so our own sweeps against production are not counted (card 96). The goal events below are unaffected: `tests/ga-events.spec.ts` stubs `window.gtag`.
- It fails OPEN when `site` is unset (the tag runs everywhere), so a misconfigured fork goes loud in the data rather than silently dark.
- A second domain or a `*.workers.dev` address that serves real visitors will record nothing. That is intended; serve the real domain instead of widening the list.
- `tests/smoke.spec.ts` carries the localhost test (no Google request, no `dataLayer`). It passes trivially in CI (no id) and bites on a local build that has one.
- To prove it by hand: `PUBLIC_GA_ID=G-TEST000000 npm run build` (environment only, never written to a file), then read the inline snippet in `dist/client/index.html`.

Reports: filter or segment by `hostName` = `stonesteps50k.com`. September's localhost rows are history and stay in the property.

## Goal events (Stone Steps only, not PORTABLE)

Both are no-ops unless `window.gtag` exists, which after the hostname rule means production only. Code: `src/lib/ga-events-listener.js` (the click listener, plain JS) printed inline by `src/components/analytics/GoogleAnalyticsEvents.astro` (rendered by `BaseLayout` next to the GA component, so only when `PUBLIC_GA_ID` is set), and `src/lib/ga-events.ts` (`trackContactSent`, called by `RaceContactForm.tsx`). The listener is inline on purpose: a bundled module script is a second network request (an entry plus a shared chunk, measured). `ga-events.test.ts` loads the listener file itself into a Node vm, so the test runs the code that ships.

| Event                | When                                                                                                   | Parameters                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `registration_click` | A click, or middle-click, on a link whose host is `runsignup.com` or a subdomain. Right-click ignored. | `link_url`: scheme, host and path only (query and fragment dropped) |
| `generate_lead`      | Once, when the contact form reports a confirmed send (`status` becomes `sent`)                         | `form_name: 'contact'`                                              |

Never sent: any form field, name, email address or message text. Mark both as key events (conversions) in the GA4 admin to see them as goals; that is a property setting, not code.

The listener is one delegated `document` listener added once per full page load. Do not re-bind it on `astro:page-load`: the ClientRouter keeps `document`, so that would send each click several times.

Tests: `tests/ga-events.spec.ts` stubs `window.gtag`, never leaves the site (RunSignUp navigation is cancelled) and never sends a message (the `/api/contact` POST is intercepted). The click tests skip when the build has no `PUBLIC_GA_ID` (CI), because the listener is not rendered there; run them locally with `PUBLIC_GA_ID=G-TEST000000 npm run build && npm test -- ga-events`. The lead tests need no GA build.

## The shared event layer (card 217)

`src/components/analytics/SiteEvents.astro`, `src/lib/track.ts` and `src/lib/event-kinds.ts` are PORTABLE; this site's map is `src/config/events.ts`. `SiteEvents` is a bundled script (one more file under `/_astro/`) and renders whether or not `PUBLIC_GA_ID` is set; it sends only when `window.gtag` exists, so the hostname rule above still decides everything. `BaseLayout` renders `Analytics.astro` (Cloudflare beacon and GA4, the same output as the two separate tags it replaced), then `GoogleAnalyticsEvents` (the inline listener, GA4 builds only), then `SiteEvents`.

| Event              | When                                                                                     | Parameters                           |
| ------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------ |
| `contact_click`    | An email or phone link (kind only, never the address)                                    | `method`: email or phone, `location` |
| `directions_click` | A Google or Apple Maps link                                                              | `location`                           |
| `watch_click`      | A YouTube or Vimeo link                                                                  | `destination`, `location`            |
| `sponsor_click`    | A sponsor patch (`a.patch__link`, SponsorPatches.astro) that leads to the sponsor's site | `destination`: host only, `location` |

**`registration_click` stays on the inline listener, on purpose.** The shared layer listens to `click` only (no middle-click) and always adds `location`; this event's history (265 clicks by 2026-11-06, parameter `link_url` only) is what the Report is built on, so it keeps its exact sender. `events.ts` has no RunSignUp rule and switches `register_click` off, so no click is sent twice; `src/lib/events-map.test.ts` and `tests/site-events.spec.ts` pin that RunSignUp links give the shared layer nothing. The host test is the listener's own, unchanged.

`off` in `events.ts` also lists `outbound_click` and `download_click` (Enhanced Measurement counts those) and every other shared event (`form_view`, `embed_interact`, `article_*`, `site_search`, `search_no_results`, `page_not_found`, `js_error`), so the site counts exactly the table above plus its two goal events. `sponsor_click` needs a look-up because the classifier gets an address, not the element: the rule checks the address against the `a.patch__link` links on the page.

September 2026: 335 of the 469 page views on 2026-09-18 (the day of the move) were hostName `localhost`, our own test runs (part of the 347-session localhost group above); the real site had 134 views that day. The Report does not count them: the `stonesteps` entry in studio-status `src/site-series-config.ts` has `hosts`, which limits every GA4 query to `stonesteps50k.com` and `www`.

## The Report (card 218)

The Studio's Report tool (Month, Quarter or Year against the year before) reads `src/config/board.ts`. It shows only when the repository variable `PUBLIC_BOARD_REPORT` is `true` at build time (`deploy.yml`); it is left out of `staffTools` so only administrators see it. Every `event:` measure in `board.ts` must also be listed under `stonesteps` in studio-status `src/site-series-config.ts`, and the tiles in `SITE_REPORT_EMAIL` (`src/site-report-email.ts`) follow `board.ts` by hand. Dates: visitors from 2026-09-05, `registration_click` and `generate_lead` from 2026-10-05, the four link events from the day the shared layer deployed (`NEW_LINK_EVENTS_SINCE` in `board.ts`), Search Console from 2026-09-15 (first day with data). Registration clicks are clicks through to RunSignUp, not entries. Detail: `docs/agent/studio-kit.md`, "The Report".

## Privacy copy

`src/pages/privacy.astro` derives its analytics paragraph from `hasGa` (`src/lib/analytics-config.ts`) and names the two goal events in plain words and then adds a sentence derived from `src/config/events.ts` (`eventsSentence()`), so the shared events cannot fall out of step with the copy. If a goal event is added or removed, change that paragraph in the same commit (vault gotcha: turning analytics on falsifies stored privacy copy). This page is code here, not Sanity content.
