// Safe to edit by hand
//
// The "Get directions" link, built from the race's own pin.
//
// A Google Maps DIRECTIONS url rather than a search: with a destination given
// as coordinates it opens turn-by-turn from wherever the visitor is, which is
// what Dave asked for on 2026-09-18 ("to get directions from your location"),
// and it cannot land on the wrong park entrance the way a place-name search
// can. The footer's "Where" link in Site settings carries the same url by hand.

export function directionsUrl(geo?: { lat?: number; lng?: number } | null): string | null {
  if (!geo || typeof geo.lat !== 'number' || typeof geo.lng !== 'number') return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${geo.lat},${geo.lng}`;
}
