// ga-events - the two GA4 goal events. The registration_click listener is shipped
// as inline JS (ga-events-listener.js), so this test loads THAT FILE into a Node
// vm with a fake document and drives it with fake click events: what is tested
// is exactly what ships. generate_lead is the small helper RaceContactForm calls.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { trackContactSent, trackEvent } from './ga-events.ts';

const source = readFileSync(new URL('./ga-events-listener.js', import.meta.url), 'utf8');

type Handler = (e: unknown) => void;

/** Run the shipped listener against a fake page. Returns a driver. */
function page(opts: { gtag?: boolean } = { gtag: true }) {
  const handlers: Record<string, Handler[]> = {};
  const calls: unknown[][] = [];
  const win: Record<string, unknown> = {};
  if (opts.gtag !== false) win.gtag = (...a: unknown[]) => calls.push(a);
  const document = {
    baseURI: 'https://stonesteps50k.com/results',
    addEventListener: (type: string, fn: Handler) => (handlers[type] ??= []).push(fn),
  };
  const ctx = vm.createContext({ window: win, document, URL });
  vm.runInContext(source, ctx);

  /** Fire `type` (click or auxclick) on a link with this href. */
  function press(href: string | null, type = 'click', button = 0) {
    const link =
      href === null ? null : { getAttribute: (n: string) => (n === 'href' ? href : null) };
    const target = { closest: (sel: string) => (sel === 'a[href]' ? link : null) };
    for (const fn of handlers[type] ?? []) fn({ type, button, target, defaultPrevented: true });
  }
  return { press, calls, handlers, win };
}

const ok = (href: string) => {
  const p = page();
  p.press(href);
  return p.calls.length === 1;
};

test('it binds exactly one click and one auxclick listener, once', () => {
  const p = page();
  assert.equal(p.handlers.click?.length, 1);
  assert.equal(p.handlers.auxclick?.length, 1);
});

test('runsignup.com and its subdomains count', () => {
  assert.equal(ok('https://runsignup.com/Race/OH/Cincinnati/StoneSteps50K'), true);
  assert.equal(ok('https://www.runsignup.com/Race/Register/?raceId=1'), true);
  assert.equal(ok('http://RunSignUp.com/x'), true);
  assert.equal(ok('https://results.runsignup.com/Race/Results/1'), true);
  assert.equal(ok('//runsignup.com/Race/1'), true);
  assert.equal(ok('https://runsignup.com./Race/1'), true);
  assert.equal(ok('https://runsignup.com:443/Race/1'), true);
});

test('lookalike hosts do not count', () => {
  assert.equal(ok('https://notrunsignup.com/'), false);
  assert.equal(ok('https://runsignup.com.evil.example/'), false);
  assert.equal(ok('https://evil.example/runsignup.com'), false);
  assert.equal(ok('https://evil.example/?u=https://runsignup.com'), false);
  assert.equal(ok('https://runsignup.com@evil.example/'), false);
  assert.equal(ok('https://runsignup-com.example/'), false);
  assert.equal(ok('https://xrunsignup.com/'), false);
  assert.equal(ok('https://runsignup.co/'), false);
});

test('relative, empty and non-web links do not count', () => {
  assert.equal(ok('/results'), false);
  assert.equal(ok('runsignup.com'), false, 'a bare word is a relative path');
  assert.equal(ok('#register'), false);
  assert.equal(ok(''), false);
  assert.equal(ok('mailto:rd@runsignup.com'), false);
  assert.equal(ok('javascript:void(0)'), false);
  assert.equal(ok('https://'), false);
});

test('the event carries link_url only, with query and fragment dropped', () => {
  const p = page();
  p.press('https://runsignup.com/Race/Register/?raceId=1&coupon=SECRET#top');
  // JSON round-trip: the objects were built in another vm realm.
  assert.deepEqual(JSON.parse(JSON.stringify(p.calls)), [
    ['event', 'registration_click', { link_url: 'https://runsignup.com/Race/Register/' }],
  ]);
});

test('middle-click counts once, right-click and a click off any link do not', () => {
  const p = page();
  p.press('https://runsignup.com/Race/1', 'auxclick', 1);
  p.press('https://runsignup.com/Race/1', 'auxclick', 2);
  p.press('https://runsignup.com/Race/1', 'click', 2);
  p.press(null);
  assert.equal(p.calls.length, 1);
});

test('a primary click fires once even though two listeners are bound', () => {
  const p = page();
  p.press('https://runsignup.com/Race/1', 'click', 0);
  assert.equal(p.calls.length, 1);
});

test('with no gtag defined it does nothing and creates no dataLayer', () => {
  const p = page({ gtag: false });
  assert.doesNotThrow(() => p.press('https://runsignup.com/Race/1'));
  assert.equal(p.win.dataLayer, undefined);
  assert.equal(p.win.gtag, undefined);
});

test('generate_lead is exactly { form_name: contact }, and inert without gtag', () => {
  const g = globalThis as { gtag?: unknown; dataLayer?: unknown };
  delete g.gtag;
  assert.doesNotThrow(() => trackContactSent());
  assert.doesNotThrow(() => trackEvent('x', { a: 'b' }));
  assert.equal(g.dataLayer, undefined);
  const calls: unknown[][] = [];
  g.gtag = (...a: unknown[]) => calls.push(a);
  try {
    trackContactSent();
  } finally {
    delete g.gtag;
  }
  assert.deepEqual(calls, [['event', 'generate_lead', { form_name: 'contact' }]]);
});
