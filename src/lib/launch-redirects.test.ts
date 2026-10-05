// launch-redirects - the hand-written forwards from the old WordPress site.
// The point of the test is that nobody can drop one by accident: the three
// old addresses are named here with where they must land.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { launchRedirects } from './launch-redirects.ts';
import { normalizeRedirectPath } from './redirects.ts';

test('the old WordPress addresses forward to the right pages with a 301', () => {
  assert.deepEqual(launchRedirects['/all-time-records'], { status: 301, destination: '/records/' });
  assert.deepEqual(launchRedirects['/the-course'], { status: 301, destination: '/course/' });
  assert.deepEqual(launchRedirects['/dev/wordpress/course'], {
    status: 301,
    destination: '/course/',
  });
});

test('every key is already in the canonical shape the redirect map uses', () => {
  for (const from of Object.keys(launchRedirects)) {
    assert.equal(normalizeRedirectPath(from), from, `${from} is not canonical`);
  }
});

test('no forward points at another forward, at itself, or off the site', () => {
  for (const [from, { destination }] of Object.entries(launchRedirects)) {
    assert.notEqual(destination, from, `${from} redirects to itself`);
    assert.equal(
      launchRedirects[normalizeRedirectPath(destination) ?? ''],
      undefined,
      `${from} -> ${destination} is a chain`,
    );
    assert.match(
      destination,
      /^\/[a-z0-9-]+\/$/,
      `${from} destination should be a local page path ending in a slash`,
    );
  }
});
