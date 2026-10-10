// =============================================================================
// ga-events - the contact-form goal event for GA4 (Stone Steps only)
// =============================================================================
// Not PORTABLE: a client goal, not starter behaviour. The other goal,
// registration_click, is the inline listener in ga-events-listener.js.
//
//   generate_lead  { form_name: 'contact' }   once per confirmed contact send
//
// No form field, name, email or message text ever reaches GA.
//
// INERT WITHOUT window.gtag. GoogleAnalytics.astro defines gtag only on the
// production hostname (PORTS.md card 58), so on localhost, *.workers.dev and in
// CI this does nothing: no dataLayer, no request. Keep this file free of DOM
// types so `node --test` can import it directly.

type Gtag = (command: 'event', name: string, params: Record<string, string>) => void;

/** Send one GA4 event. A no-op unless the production snippet defined `gtag`. */
export function trackEvent(name: string, params: Record<string, string>): void {
  const gtag = (globalThis as { gtag?: unknown }).gtag;
  if (typeof gtag !== 'function') return;
  (gtag as Gtag)('event', name, params);
}

/** `generate_lead`: the contact form reported a confirmed send. Call once per send. */
export function trackContactSent(): void {
  trackEvent('generate_lead', { form_name: 'contact' });
}
