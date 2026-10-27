// Safe to edit by hand
// The one way a component reads the business facts (PORTS.md card 196): the
// site settings query (one memoized Sanity read per build, which folds in
// Business info) through resolveBusinessFacts(). With Sanity empty every fact
// is absent and nothing new renders. A church site would add its own layer on
// top (first-baptist-auburn's church-data.ts is the model).
import { getRace, getSiteSettings } from '@/lib/queries';
import {
  resolveBusinessFacts,
  type BusinessFacts,
  type RawBusinessFacts,
} from '@/lib/business-facts';

let _facts: Promise<BusinessFacts> | null = null;

interface RaceAddress {
  venue?: string | null;
  startArea?: string | null;
  streetAddress?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  geo?: { lat?: number | null; lng?: number | null } | null;
  confirmed?: boolean | null;
}

/**
 * Stone Steps keeps its address on the race document (Race > Where), not in Business info: the
 * race HQ is the start area at Mt. Airy Forest, typed once there and already shown in the footer,
 * the hero and the race's Event structured data. So the facts read it from there, and a value typed
 * in Business info (which the Studio keeps out of sight on this site) still wins. "Confirmed"
 * follows the race's own "confirmed" switch. The race has no opening hours; packet pickup and
 * race-morning times live in the Race-day schedule, so hours stay empty unless typed.
 */
export function withRaceAddress(
  s: RawBusinessFacts | null,
  race: RaceAddress | null,
): RawBusinessFacts {
  const out: RawBusinessFacts = { ...(s ?? {}) };
  if (!race) return out;
  if (!out.street && race.streetAddress) {
    out.street = race.streetAddress;
    out.city = race.city ?? out.city;
    out.state = race.region ?? out.state;
    out.zip = race.postalCode ?? out.zip;
    out.addressConfirmed = race.confirmed !== false;
    out.findUs ??= [race.venue, race.startArea].filter(Boolean).join(', ') || null;
  }
  if (out.geoLat == null && race.geo?.lat != null) out.geoLat = race.geo.lat;
  if (out.geoLng == null && race.geo?.lng != null) out.geoLng = race.geo.lng;
  return out;
}

/** The site's facts, resolved once per build. */
export function getBusinessFacts(): Promise<BusinessFacts> {
  _facts ??= Promise.all([getSiteSettings(), getRace()]).then(([s, race]) =>
    resolveBusinessFacts(
      withRaceAddress(s as RawBusinessFacts | null, race as RaceAddress | null),
    ),
  );
  return _facts;
}

/**
 * The facts a block draws: its own fixture facts when the styleguide wall
 * passes some (so the thumbnail and the tests have hours to show), else the
 * site's. A block in a real page never carries facts.
 */
export async function factsFor(fixture?: RawBusinessFacts | null): Promise<BusinessFacts> {
  return fixture ? resolveBusinessFacts(fixture) : getBusinessFacts();
}
