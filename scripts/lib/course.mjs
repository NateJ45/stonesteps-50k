// scripts/lib/course.mjs
//
// The course, as geometry. Everything both the elevation profile and the course
// map need to know about a GPS track, in one place.
//
// WHY THIS FILE EXISTS. build-elevation.mjs grew these five pieces first, and
// build-course-map.mjs needs every one of them: read the track, measure along
// it, resample it evenly, ask USGS how high the ground is, and find where it
// came back through the start. Two copies of findLaps in particular would be a
// standing invitation for the elevation chart's aid marks and the map's loop
// colours to disagree about where a loop ends, which is exactly the kind of
// drift this repo keeps writing tests to prevent.
//
// Nothing here talks to Sanity or to the file system beyond reading the track,
// so it stays testable.

import { readFileSync } from 'node:fs';

/* ---------- Track parsing ------------------------------------------------ */

/** Pull [lon, lat] pairs out of a GPX or GeoJSON file. */
export function readTrack(path) {
  const raw = readFileSync(path, 'utf8');

  if (raw.trimStart().startsWith('{')) {
    const j = JSON.parse(raw);
    const geom =
      j.type === 'Feature'
        ? j.geometry
        : j.type === 'FeatureCollection'
          ? j.features[0].geometry
          : j;
    if (geom.type !== 'LineString') throw new Error('GeoJSON must be a LineString');
    return geom.coordinates.map(([lon, lat]) => [lon, lat]);
  }

  // GPX: trkpt is the recorded track, rtept a planned route. Take whichever
  // is present, in document order.
  const pts = [
    ...raw.matchAll(/<(?:trkpt|rtept)\s[^>]*?lat="([-\d.]+)"[^>]*?lon="([-\d.]+)"/g),
  ].map((m) => [Number(m[2]), Number(m[1])]);
  if (pts.length === 0) throw new Error('No <trkpt> or <rtept> found. Is this a GPX file?');
  return pts;
}

/* ---------- Geometry ----------------------------------------------------- */

const R_FT = 20925524.9; // Earth radius in feet

export function haversineFt([lon1, lat1], [lon2, lat2]) {
  const p = Math.PI / 180;
  const a =
    0.5 -
    Math.cos((lat2 - lat1) * p) / 2 +
    (Math.cos(lat1 * p) * Math.cos(lat2 * p) * (1 - Math.cos((lon2 - lon1) * p))) / 2;
  return 2 * R_FT * Math.asin(Math.sqrt(a));
}

/**
 * Resample the track to an even spacing.
 *
 * A watch logs every second, so a track has dense clusters at aid stations and
 * long gaps on a fast descent. Sampling a DEM at those raw points would weight
 * the profile by how fast someone was running. Even spacing measures the
 * GROUND, which is what an elevation profile is supposed to describe.
 */
export function densify(track, stepFt = 50) {
  const out = [track[0]];
  let carry = 0;
  for (let i = 1; i < track.length; i += 1) {
    const a = track[i - 1];
    const b = track[i];
    const seg = haversineFt(a, b);
    if (seg === 0) continue;
    let t = (stepFt - carry) / seg;
    while (t <= 1) {
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      t += stepFt / seg;
    }
    carry = (carry + seg) % stepFt;
  }
  return out;
}

/* ---------- Elevation ---------------------------------------------------- */

export const SAMPLES_URL =
  'https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/getSamples';

/**
 * Sample USGS 3DEP for every point, in batches.
 *
 * 3DEP over Ohio is LiDAR-derived at 1 metre, which is far better than the
 * barometric altitude in a GPX: a watch drifts with the weather and can be tens
 * of feet out over a morning. Taking the horizontal track from the watch and
 * the vertical from the DEM uses each source for the thing it is good at.
 */
export async function sampleElevations(points, batch = 200) {
  const out = [];
  for (let i = 0; i < points.length; i += batch) {
    const chunk = points.slice(i, i + batch);
    const body = new URLSearchParams({
      geometry: JSON.stringify({
        points: chunk.map(([lon, lat]) => [lon, lat]),
        spatialReference: { wkid: 4326 },
      }),
      geometryType: 'esriGeometryMultipoint',
      returnFirstValueOnly: 'true',
      f: 'json',
      sampleCount: String(chunk.length),
    });

    // POST, NOT GET. A batch of 200 points is about 5KB of geometry once it is
    // URL-encoded, and the ArcGIS front end answers 414 Request-URI Too Large
    // long before that. The first real track run through this script died on
    // the very first batch (2026-09-16). POST puts the geometry in the body,
    // where there is no such ceiling.
    const res = await fetch(SAMPLES_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    if (!res.ok) throw new Error(`3DEP ${res.status} ${res.statusText}`);
    const json = await res.json();
    if (json.error) throw new Error(`3DEP: ${json.error.message ?? JSON.stringify(json.error)}`);
    const samples = json.samples ?? [];
    if (samples.length !== chunk.length) {
      throw new Error(`3DEP returned ${samples.length} samples for ${chunk.length} points`);
    }
    // ORDER BY locationId, NOT BY ARRIVAL. getSamples is documented to return a
    // sample per input point but not to preserve input order, and a profile
    // assembled in the wrong order is a plausible-looking lie rather than an
    // obvious failure. locationId is the index into the batch.
    samples.sort((a, b) => Number(a.locationId) - Number(b.locationId));
    // Metres in, feet out.
    for (const s of samples) out.push(Number(s.value) * 3.28084);
    process.stdout.write(`\r  sampled ${out.length}/${points.length}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  process.stdout.write('\n');
  return out;
}

/* ---------- Laps ---------------------------------------------------------- */

/**
 * Where the track came back through the start, in miles along the track.
 *
 * This is what puts the aid-station marks on a measured chart. The synthetic
 * chart could place them from the punch-card loop lengths because it DREW the
 * loops; a measured line has no loop boundaries of its own, so before this the
 * marks were simply dropped and the chart lost the one piece of information a
 * runner actually plans against.
 *
 * MEASURED ON THE DENSE TRACK, NOT THE RAW ONE, because the profile's x axis is
 * the dense walk. Detecting laps on the raw track and drawing them on the dense
 * one puts every mark about 1.4% to the right, which is a quarter mile out by
 * the end, and the error is invisible because the dots still look plausible.
 *
 * Two rules, and both come from watching the raw detection on Dave's file:
 *
 * 1. TAKE THE CLOSEST POINT OF EACH VISIT, not the first point inside the
 *    radius. Which point crosses an arbitrary circle first depends on how the
 *    watch happened to sample the approach; the nearest approach to The Oval is
 *    a real feature of the route.
 * 2. REQUIRE A MINIMUM SEPARATION. The raw run reported returns at 16.65 AND
 *    16.70 miles, because leaving the aid station means stepping out of a 250 ft
 *    circle and back into it while sorting a drop bag. Anything closer together
 *    than the shortest loop is one visit, not two.
 */
export function findLaps(dense, { radiusFt = 250, minLapMiles = 1.5 } = {}) {
  const start = dense[0];
  const cum = [0];
  for (let i = 1; i < dense.length; i += 1) {
    cum.push(cum[i - 1] + haversineFt(dense[i - 1], dense[i]));
  }

  // Group the points inside the radius into visits, keeping each visit's
  // nearest approach.
  const visits = [];
  let best = null;
  for (let i = 0; i < dense.length; i += 1) {
    const d = haversineFt(start, dense[i]);
    if (d <= radiusFt) {
      if (!best || d < best.d) best = { d, mile: cum[i] / 5280 };
    } else if (best) {
      visits.push(best);
      best = null;
    }
  }
  if (best) visits.push(best);

  // The first visit is the start line, not a lap. Everything after it is a lap
  // boundary as long as it is far enough from the one before.
  const laps = [];
  for (const v of visits) {
    if (v.mile < minLapMiles) continue;
    if (laps.length && v.mile - laps[laps.length - 1] < minLapMiles) continue;
    laps.push(v.mile);
  }
  return laps;
}

/* ---------- Simplification ------------------------------------------------ */

/**
 * Douglas-Peucker, iterative rather than recursive.
 *
 * The raw track is 22,412 points. Drawn as an SVG path that is about 500KB of
 * markup for a line whose every wiggle is smaller than its own stroke width.
 * Simplifying to a 15 ft tolerance keeps every bend a reader can see and drops
 * roughly 95% of the points.
 *
 * ITERATIVE ON PURPOSE. The recursive form is prettier and blows the stack on a
 * 22k-point track with a small tolerance, which is exactly the input this is
 * for.
 */
export function simplify(points, toleranceFt) {
  if (points.length < 3) return points.slice();

  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxDist = 0;
    let index = -1;

    const [ax, ay] = points[first];
    const [bx, by] = points[last];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;

    for (let i = first + 1; i < last; i += 1) {
      const [px, py] = points[i];
      // Perpendicular distance to the segment, with the degenerate
      // zero-length case falling back to plain distance from the endpoint.
      let d;
      if (len2 === 0) {
        d = Math.hypot(px - ax, py - ay);
      } else {
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
        d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
      }
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }

    if (maxDist > toleranceFt && index !== -1) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }

  return points.filter((_, i) => keep[i]);
}

/* ---------- Nearest-trail lookup ------------------------------------------ */

/**
 * A grid index over the trail vertices.
 *
 * The attribution pass asks "which trail is nearest" for a couple of thousand
 * course points against twenty thousand trail points. Brute force is 40 million
 * distance calculations; a grid makes it roughly linear, and this needs no
 * dependency to do it.
 */
export function gridIndex(points, cellFt) {
  const cells = new Map();
  points.forEach(([x, y], i) => {
    const k = `${Math.floor(x / cellFt)},${Math.floor(y / cellFt)}`;
    let bucket = cells.get(k);
    if (!bucket) cells.set(k, (bucket = []));
    bucket.push(i);
  });

  return function nearest(x, y, maxRings = 3) {
    const cx = Math.floor(x / cellFt);
    const cy = Math.floor(y / cellFt);
    let best = Infinity;
    let bestIndex = -1;
    for (let r = 0; r <= maxRings; r += 1) {
      for (let a = cx - r; a <= cx + r; a += 1) {
        for (let b = cy - r; b <= cy + r; b += 1) {
          // Only the new ring, not the whole square again.
          if (r > 0 && a !== cx - r && a !== cx + r && b !== cy - r && b !== cy + r) continue;
          for (const i of cells.get(`${a},${b}`) ?? []) {
            const [px, py] = points[i];
            const d = Math.hypot(px - x, py - y);
            if (d < best) {
              best = d;
              bestIndex = i;
            }
          }
        }
      }
      // A hit inside the rings already scanned cannot be beaten by a further
      // ring, so stop as soon as that is guaranteed.
      if (best <= r * cellFt) break;
    }
    return { dist: best, index: bestIndex };
  };
}
