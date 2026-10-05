// =============================================================================
// ga-events-listener - the registration_click listener, shipped as INLINE JS
// =============================================================================
// Stone Steps only (not PORTABLE). A plain classic script with no imports or
// exports on purpose: GoogleAnalyticsEvents.astro imports this file as text
// (`?raw`) and prints it into the page as an inline <script>. A bundled module
// script would cost one more network request (the entry file plus a shared
// chunk, measured at 2 files on 2026-10-05); this costs none and runs before
// the first click can happen. tests (ga-events.test.ts) load this same file
// into a Node vm, so what is tested is exactly what ships.
//
// WHAT IT SENDS: gtag('event', 'registration_click', { link_url }) and nothing
// else. link_url is scheme, host and path only: a query string or fragment can
// carry a coupon or participant id, and the report only needs the page.
//
// INERT WITHOUT window.gtag. GoogleAnalytics.astro defines gtag only on the
// production hostname (PORTS.md card 58), so elsewhere this checks, finds
// nothing, and does nothing: no dataLayer, no request.
//
// ONE delegated listener on document, added once per full page load. The
// ClientRouter swaps the body between pages but never replaces `document`, so
// it survives navigation and also covers links added after load. It is NOT
// re-bound on astro:page-load: that would stack a listener per navigation and
// send each click several times.
//
// `click` covers a primary or ctrl/cmd click; a middle-click (new tab) fires
// `auxclick` with button 1. A right-click is an `auxclick` with button 2 and is
// ignored: it opens a menu, not the page. `defaultPrevented` is never read, so
// the click is counted whether or not something else handled the navigation.
(function () {
  var BASE = 'https://stonesteps50k.com/';

  // True for http(s) links on runsignup.com or any subdomain. Parsed with URL,
  // never string-matched, so notrunsignup.com, runsignup.com.evil.example and
  // https://runsignup.com@evil.example/ all fail. Relative links resolve
  // against the page and are on-site.
  function linkUrl(href, base) {
    try {
      var url = new URL(href, base || BASE);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
      var host = url.hostname.toLowerCase().replace(/\.$/, '');
      if (host !== 'runsignup.com' && !/\.runsignup\.com$/.test(host)) return null;
      return url.origin + url.pathname;
    } catch (e) {
      return null;
    }
  }

  function onClick(event) {
    if (event.type === 'auxclick' ? event.button !== 1 : event.button !== 0) return;
    var target = event.target;
    var link = target && target.closest ? target.closest('a[href]') : null;
    if (!link) return;
    var url = linkUrl(link.getAttribute('href') || '', document.baseURI);
    if (!url || typeof window.gtag !== 'function') return;
    window.gtag('event', 'registration_click', { link_url: url });
  }

  document.addEventListener('click', onClick);
  document.addEventListener('auxclick', onClick);
})();
