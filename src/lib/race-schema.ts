// schema.org/SportsEvent for the race.
//
// WHY THIS MATTERS HERE MORE THAN ON MOST SITES. Structured event data is what
// drives Google's event results, and a race is exactly the thing people search
// for by name plus year. The site this replaces has none, so this is a gap
// being closed rather than a nicety.
//
// THE RULE THIS FILE ENFORCES: nothing unconfirmed reaches the structured data.
// Page copy can say "to be confirmed" out loud, but structured data has no way
// to hedge: it is read by a machine as fact and republished as fact. So when
// the race document is not confirmed, the offers and the start time are
// omitted rather than guessed at, and an absent field is always preferred to a
// plausible one.
//
// Covered by src/lib/race-schema.test.ts.

export type RaceForSchema = {
  name?: string;
  tagline?: string;
  raceDate?: string;
  venue?: string;
  startArea?: string;
  streetAddress?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  geo?: { lat?: number; lng?: number } | null;
  registerUrl?: string;
  confirmed?: boolean;
  feeTiers?: { label?: string; amount?: number; endsOn?: string }[];
};

/**
 * Build the SportsEvent object, or null when there is not enough to say.
 *
 * Returns null rather than a skeleton: a SportsEvent with no date is not a
 * useful search result, and publishing an incomplete one is worse than
 * publishing none.
 */
export function raceEventSchema(
  race: RaceForSchema | null | undefined,
  siteUrl: string,
): Record<string, unknown> | null {
  if (!race?.name || !race?.raceDate) return null;

  const location: Record<string, unknown> = {
    '@type': 'Place',
    name: [race.venue, race.startArea].filter(Boolean).join(', ') || race.venue,
  };

  if (race.streetAddress || race.city) {
    location.address = {
      '@type': 'PostalAddress',
      ...(race.streetAddress ? { streetAddress: race.streetAddress } : {}),
      ...(race.city ? { addressLocality: race.city } : {}),
      ...(race.region ? { addressRegion: race.region } : {}),
      ...(race.postalCode ? { postalCode: race.postalCode } : {}),
      addressCountry: 'US',
    };
  }

  if (typeof race.geo?.lat === 'number' && typeof race.geo?.lng === 'number') {
    location.geo = {
      '@type': 'GeoCoordinates',
      latitude: race.geo.lat,
      longitude: race.geo.lng,
    };
  }

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: race.name,
    ...(race.tagline ? { description: race.tagline } : {}),
    startDate: race.raceDate,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    sport: 'Trail running',
    url: siteUrl,
    location,
  };

  // Offers only when the race document is confirmed. An unconfirmed fee tier is
  // a price nobody has stood behind, and a wrong price in a search result is a
  // complaint at the registration desk.
  if (
    race.confirmed === true &&
    Array.isArray(race.feeTiers) &&
    race.feeTiers.length > 0 &&
    race.registerUrl
  ) {
    schema.offers = race.feeTiers
      .filter((t) => typeof t.amount === 'number')
      .map((t) => ({
        '@type': 'Offer',
        name: t.label,
        price: String(t.amount),
        priceCurrency: 'USD',
        url: race.registerUrl,
        availability: 'https://schema.org/InStock',
        ...(t.endsOn ? { validThrough: t.endsOn } : {}),
      }));
  }

  return schema;
}
