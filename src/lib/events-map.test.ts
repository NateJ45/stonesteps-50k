// Stone Steps only (not PORTABLE). Pins this site's own events map
// (src/config/events.ts, PORTS.md card 217), link by link.
//
// The point of most of it: RunSignUp links must produce NO event from the shared
// layer, because registration_click is sent by the inline listener
// (src/lib/ga-events-listener.js) and a second sender would count every click twice.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyLink } from './track.ts';
import { eventKinds, eventsSentence } from './event-kinds.ts';
import { eventsConfig } from '../config/events.ts';

const OWN = 'stonesteps50k.com';

function hit(href: string, where = 'page') {
  return classifyLink(href, new URL(href, `https://${OWN}/page/`).href, OWN, where, eventsConfig);
}

test('a RunSignUp link sends nothing from the shared layer (the inline listener counts it)', () => {
  assert.equal(hit('https://runsignup.com/Race/OH/Cincinnati/StoneSteps50K'), null);
  assert.equal(hit('https://secure.runsignup.com/Race/Register/?raceId=1'), null);
  assert.equal(hit('https://runsignup.com/Race/Results/1'), null);
});

test('email and phone links are contact_click, kind only', () => {
  assert.deepEqual(hit('mailto:rd@example.org', 'footer'), {
    event: 'contact_click',
    params: { method: 'email', location: 'footer' },
  });
  assert.deepEqual(hit('tel:+15135550100'), {
    event: 'contact_click',
    params: { method: 'phone', location: 'page' },
  });
});

test('map links are directions_click and video links are watch_click', () => {
  assert.equal(
    hit('https://www.google.com/maps/dir/?api=1&destination=x')?.event,
    'directions_click',
  );
  assert.equal(hit('https://maps.apple.com/?q=x')?.event, 'directions_click');
  assert.equal(hit('https://www.youtube.com/watch?v=abc')?.event, 'watch_click');
  assert.equal(hit('https://youtu.be/abc')?.event, 'watch_click');
});

test('links to other sites and files are left to Enhanced Measurement', () => {
  assert.equal(hit('https://www.facebook.com/groups/stonesteps'), null);
  assert.equal(hit('https://example.com/entry-form.pdf'), null);
  assert.equal(hit('/results/2025/'), null);
});

test('a sponsor rule only matches in a browser, on a patch link', () => {
  // No document here, so the rule never matches and a plain link stays null.
  assert.equal(hit('https://sponsor.example.com/'), null);
  const prior = (globalThis as { document?: unknown }).document;
  (globalThis as { document?: unknown }).document = {
    querySelectorAll: () => [{ href: 'https://sponsor.example.com/' }],
  };
  try {
    assert.deepEqual(hit('https://sponsor.example.com/', 'page'), {
      event: 'sponsor_click',
      params: { destination: 'sponsor.example.com', location: 'page' },
    });
    // A different external link is not a sponsor.
    assert.equal(hit('https://other.example.com/'), null);
  } finally {
    (globalThis as { document?: unknown }).document = prior;
  }
});

test('the privacy sentence names what is counted and nothing that is off', () => {
  const kinds = eventKinds(eventsConfig).join(' | ');
  assert.match(kinds, /sponsors/);
  assert.match(kinds, /video links/);
  assert.match(kinds, /map and directions links/);
  assert.match(kinds, /email and phone links/);
  assert.doesNotMatch(
    kinds,
    /links to other sites|file downloads|search|article|scripts|could not be found/,
  );
  assert.match(eventsSentence(eventsConfig), /^It also records what visitors do on the site: /);
});
