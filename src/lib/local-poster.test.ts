import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localPosterFor } from './local-poster.ts';

// The live CTA on the contact page's "coming from out of town" block. If this
// stops matching, the page quietly goes back to showing a Google screenshot,
// which is the whole thing local-poster.ts exists to stop. See its header.
const LIVE_HOTELS_CTA =
  'https://www.google.com/maps/search/hotel/@39.1371651,-84.622812,77994m/data=!3m1!1e3';

test('the contact page hotel search asks for the region poster', () => {
  assert.equal(localPosterFor(LIVE_HOTELS_CTA), 'region');
});

test('any Google Maps link asks for it, whatever the shape of the URL', () => {
  for (const href of [
    'https://google.com/maps',
    'https://www.google.com/maps/place/Mt+Airy+Forest',
    'https://www.google.co.uk/maps/dir//Cincinnati',
    'https://maps.google.com/?q=cvg',
    'https://maps.app.goo.gl/abc123',
    'http://www.google.com/maps/search/hotel',
  ]) {
    assert.equal(localPosterFor(href), 'region', `expected ${href} to match`);
  }
});

test('a link to anything else keeps the block on its own image', () => {
  for (const href of [
    'https://runsignup.com/Race/OH/Cincinnati/StoneSteps50K',
    'https://www.google.com/search?q=hotels+cincinnati',
    'https://www.facebook.com/groups/stonesteps',
    'https://cincinnatiparks.com/mt-airy-forest/',
    '/contact',
    'mailto:hello@example.com',
    'not a url at all',
  ]) {
    assert.equal(localPosterFor(href), null, `expected ${href} not to match`);
  }
});

test('no CTA means no override', () => {
  assert.equal(localPosterFor(undefined), null);
  assert.equal(localPosterFor(null), null);
  assert.equal(localPosterFor(''), null);
});
