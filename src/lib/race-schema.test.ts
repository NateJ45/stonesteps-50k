// Tests for the SportsEvent structured data.
//
// The assertions that matter here are the NEGATIVE ones. Structured data is
// read by a machine as fact and republished as fact, with no way to say "to be
// confirmed", so the thing worth testing is what the builder refuses to emit.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { raceEventSchema, type RaceForSchema } from './race-schema.ts';

const SITE = 'https://stonesteps50k.com';

const full: RaceForSchema = {
  name: 'Stone Steps 50K',
  tagline: "Cincinnati's longest running ultra marathon.",
  raceDate: '2026-10-25T08:00:00.000Z',
  venue: 'Mt. Airy Forest',
  startArea: 'The Oval, Area 13',
  streetAddress: '5083 Colerain Ave.',
  city: 'Cincinnati',
  region: 'OH',
  postalCode: '45223',
  geo: { lat: 39.17275, lng: -84.568806 },
  registerUrl: 'https://runsignup.com/Race/OH/Cincinnati/StoneSteps50KTrailRun',
  confirmed: true,
  feeTiers: [
    { label: 'Through January 31', amount: 35, endsOn: '2026-01-31' },
    { label: 'October 1 to race day', amount: 60, endsOn: '2026-10-25' },
  ],
};

describe('raceEventSchema', () => {
  it('emits a complete SportsEvent', () => {
    const s = raceEventSchema(full, SITE);
    assert.equal(s?.['@type'], 'SportsEvent');
    assert.equal(s?.startDate, '2026-10-25T08:00:00.000Z');
    assert.equal(s?.url, SITE);
  });

  it('carries the venue, address and coordinates', () => {
    const s = raceEventSchema(full, SITE) as any;
    assert.equal(s.location['@type'], 'Place');
    assert.match(s.location.name, /Mt\. Airy Forest/);
    assert.equal(s.location.address.addressLocality, 'Cincinnati');
    assert.equal(s.location.address.addressCountry, 'US');
    assert.equal(s.location.geo.latitude, 39.17275);
  });

  it('emits one offer per fee tier', () => {
    const s = raceEventSchema(full, SITE) as any;
    assert.equal(s.offers.length, 2);
    assert.equal(s.offers[0].price, '35');
    assert.equal(s.offers[0].priceCurrency, 'USD');
    assert.equal(s.offers[1].validThrough, '2026-10-25');
  });

  it('OMITS offers when the race is not confirmed', () => {
    // The point of the confirmed flag. A price nobody has stood behind must not
    // reach a search result, because the complaint lands at the registration
    // desk and not on this website.
    const s = raceEventSchema({ ...full, confirmed: false }, SITE) as any;
    assert.equal(s.offers, undefined);
    // The event itself still publishes: the date IS known.
    assert.equal(s['@type'], 'SportsEvent');
  });

  it('omits offers when there is no register link to buy through', () => {
    const s = raceEventSchema({ ...full, registerUrl: undefined }, SITE) as any;
    assert.equal(s.offers, undefined);
  });

  it('skips a fee tier with no amount rather than emitting a null price', () => {
    const s = raceEventSchema(
      { ...full, feeTiers: [{ label: 'TBC' }, { label: 'Early', amount: 35 }] },
      SITE,
    ) as any;
    assert.equal(s.offers.length, 1);
    assert.equal(s.offers[0].price, '35');
  });

  it('returns null rather than a skeleton when there is no date', () => {
    assert.equal(raceEventSchema({ ...full, raceDate: undefined }, SITE), null);
    assert.equal(raceEventSchema({ ...full, name: undefined }, SITE), null);
    assert.equal(raceEventSchema(null, SITE), null);
    assert.equal(raceEventSchema(undefined, SITE), null);
  });

  it('omits geo entirely when the coordinates are absent', () => {
    const s = raceEventSchema({ ...full, geo: null }, SITE) as any;
    assert.equal(s.location.geo, undefined);
    assert.equal(s.location.address.addressLocality, 'Cincinnati');
  });
});
