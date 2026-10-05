# Analytics (GA4)

Cloudflare Web Analytics is cookieless; GA4 is the second, richer tag and is the one this file covers. Property 552910285, stream Measurement ID in the repo variable `PUBLIC_GA_ID` (read by `deploy.yml` only).

## The hostname rule (PORTS.md card 58)

`src/components/analytics/GoogleAnalytics.astro` is PORTABLE (canonical in the starter). It compares `location.hostname` with the host of `site` in `astro.config.mjs` (`stonesteps50k.com`, apex and `www`) and off those hosts does nothing: no `dataLayer`, no `window.gtag`, no request to Google. Why: in September 2026 the property held 347 sessions with hostName `localhost` (our own Playwright and Lighthouse runs, built with a developer `.env` that carries `PUBLIC_GA_ID`) against 735 real ones. CI never had the id; a developer's `.env` did.

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

## Privacy copy

`src/pages/privacy.astro` derives its analytics paragraph from `hasGa` (`src/lib/analytics-config.ts`) and names both events in plain words. If an event is added or removed, change that paragraph in the same commit (vault gotcha: turning analytics on falsifies stored privacy copy). This page is code here, not Sanity content.
