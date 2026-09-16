// scripts/build-course-map.mjs
//
// Builds the course map's data: the route, the trails it runs on, and the
// ground under both. Writes committed JSON so the site build never needs the
// network.
//
// Usage:
//   node scripts/build-course-map.mjs course.gpx            # write the data files
//   node scripts/build-course-map.mjs course.gpx --report   # measure, write nothing
//
// ---------------------------------------------------------------------------
// WHY OPENSTREETMAP AND NOT THE PARKS MAP
//
// The obvious plan was to draw the course onto Cincinnati Parks' current trail
// map, which we have permission to use. It does not work, and the measurement
// is here so nobody spends another day rediscovering it.
//
// Registering the 2017 Parks PDF against the real track was tried three ways:
// an unconstrained similarity fit; the same with Bezier curves properly
// flattened (the first attempt sampled CONTROL points, which do not lie on the
// curve); and a constrained fit holding rotation near north-up with translation
// searched on a grid rather than seeded from bounding-box centres, which is
// what the first two got wrong, since the course covers only part of the park
// and the two bounding boxes have nothing to do with each other.
//
// Best of the three: 112 ft median error, 453 ft at the 90th percentile, with
// the scale parameter drifting to the edge of its range. That last detail is
// the diagnosis. An optimiser that wants to shrink is not finding an alignment,
// it is squashing the track into whatever blob of ink is densest. Trails in
// Mt. Airy are frequently closer together than 112 ft, so a course drawn on
// that basemap would sit confidently on the wrong trail.
//
// Same answer the 1998 race map gave (see build-elevation.mjs), same cause:
// both are cartography, drawn to be read, not surveys.
//
// OpenStreetMap needs no registration, because it is already in real
// coordinates. The track sits a MEDIAN OF 15.2 FT from the nearest OSM way with
// no fitting of any kind, 37 ft at the 90th percentile, which is GPS noise
// under canopy. So the basemap is rendered from OSM geometry in the site's own
// colours, and it is accurate by construction.
//
// The Parks map is still the reference that lets us label trails correctly, and
// it stays on the page as the printable official version.
// ---------------------------------------------------------------------------

import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import {
  readTrack,
  haversineFt,
  densify,
  sampleElevations,
  findLaps,
  simplify,
  gridIndex,
} from './lib/course.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const DATA = join(root, 'scripts', 'data');
const CACHE = join(root, 'node_modules', '.cache', 'course-map');

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const REPORT_ONLY = args.includes('--report');

if (!file) {
  console.log('Usage: node scripts/build-course-map.mjs <course.gpx> [--report]');
  process.exit(0);
}

/* ---------- A local flat frame ------------------------------------------- */

/**
 * Everything downstream works in FEET on a flat plane, not in degrees.
 *
 * Over a 1,500 acre park the curvature of the earth is irrelevant but the
 * aspect ratio is not: a degree of longitude at this latitude is about 77% of a
 * degree of latitude, so a map drawn straight from lat/lon is visibly squashed.
 * One projection, defined once, used by the route, the trails and the terrain,
 * so all three land in the same coordinate system by construction rather than
 * by three functions agreeing.
 *
 * x grows east, y grows NORTH. SVG's y grows downward, so the renderer flips it
 * once at the end rather than every consumer remembering to.
 */
const FT_PER_DEG_LAT = 364000;

function makeFrame(lat0, lon0) {
  const k = Math.cos((lat0 * Math.PI) / 180) * FT_PER_DEG_LAT;
  return {
    lat0,
    lon0,
    project: ([lon, lat]) => [(lon - lon0) * k, (lat - lat0) * FT_PER_DEG_LAT],
  };
}

/* ---------- OpenStreetMap ------------------------------------------------- */

const OVERPASS = 'https://overpass-api.de/api/interpreter';

/**
 * The trail network around the course.
 *
 * CACHED TO DISK. Overpass is a volunteer service and this script is run by
 * hand whenever a new track arrives, so hammering it during development is
 * rude and slow. The cache lives under node_modules/.cache, which is already
 * ignored, and the OUTPUT is what gets committed.
 *
 * A User-Agent is not optional: without one the main instance answers
 * 406 Not Acceptable, which looks like a malformed query and is not.
 */
async function fetchTrails(bbox) {
  mkdirSync(CACHE, { recursive: true });
  const key = join(CACHE, `osm-${bbox.map((n) => n.toFixed(4)).join('_')}.json`);
  if (existsSync(key)) {
    console.log('  (osm from cache)');
    return JSON.parse(readFileSync(key, 'utf8'));
  }

  const query = `[out:json][timeout:90];
(
  way["highway"~"path|footway|track|cycleway|service|unclassified|residential"](${bbox.join(',')});
);
out geom;`;

  const res = await fetch(OVERPASS, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'user-agent': 'stonesteps50k-course-map/1.0 (+https://stonesteps50k.com)',
    },
    body: new URLSearchParams({ data: query }),
  });
  if (!res.ok) throw new Error(`Overpass ${res.status} ${res.statusText}`);
  const json = await res.json();
  writeFileSync(key, JSON.stringify(json));
  return json;
}

/* ---------- Main ---------------------------------------------------------- */

async function main() {
  const track = readTrack(resolve(process.cwd(), file));
  console.log(`Track: ${track.length} points`);

  // The frame is centred on the track, so coordinates stay small and readable.
  const lat0 = track.reduce((s, p) => s + p[1], 0) / track.length;
  const lon0 = track.reduce((s, p) => s + p[0], 0) / track.length;
  const frame = makeFrame(lat0, lon0);

  // The loop split uses the SAME dense walk and the SAME detector the elevation
  // chart uses, so the map's loop boundaries and the chart's aid marks are the
  // same seven numbers by construction.
  const dense = densify(track, 50);
  const laps = findLaps(dense);
  console.log(`Loops: ${laps.map((m) => m.toFixed(2)).join(', ')} miles`);

  // Split the dense track into loops, project, and simplify each independently
  // so a simplification never smooths across a loop boundary.
  const cum = [0];
  for (let i = 1; i < dense.length; i += 1)
    cum.push(cum[i - 1] + haversineFt(dense[i - 1], dense[i]));

  const loops = [];
  let from = 0;
  laps.forEach((endMile, li) => {
    const endFt = endMile * 5280;
    let to = from;
    while (to < dense.length - 1 && cum[to] < endFt) to += 1;
    const slice = dense.slice(from, to + 1).map(frame.project);
    const simplified = simplify(slice, 15);
    const lengthMiles = (cum[to] - cum[from]) / 5280;
    loops.push({
      index: li + 1,
      kind: lengthMiles >= 4 ? 'long' : 'short',
      miles: Number(lengthMiles.toFixed(2)),
      points: simplified.map(([x, y]) => [Math.round(x), Math.round(y)]),
    });
    from = to;
  });
  const routePoints = loops.reduce((n, l) => n + l.points.length, 0);
  console.log(`Route: ${routePoints} points after simplification (from ${dense.length})`);

  /* --- Trails ------------------------------------------------------------ */

  const lats = track.map((p) => p[1]);
  const lons = track.map((p) => p[0]);
  const PAD = 0.004; // roughly a quarter mile of context around the course
  const bbox = [
    Math.min(...lats) - PAD,
    Math.min(...lons) - PAD,
    Math.max(...lats) + PAD,
    Math.max(...lons) + PAD,
  ];
  console.log('Fetching the OSM trail network...');
  const osm = await fetchTrails(bbox);

  const ways = (osm.elements ?? [])
    .filter((w) => (w.geometry ?? []).length > 1)
    .map((w) => ({
      name: w.tags?.name ?? null,
      highway: w.tags?.highway ?? null,
      points: w.geometry.map((g) => frame.project([g.lon, g.lat])),
    }));
  console.log(`  ${ways.length} ways`);

  // One flat array of trail vertices, densified so "nearest vertex" is a fair
  // proxy for "nearest point on the trail". Without this a long straight
  // segment reports its ENDPOINTS as the nearest thing, and a course running
  // along its middle looks 200 ft off a trail it is standing on.
  const flat = [];
  const owner = [];
  ways.forEach((w, wi) => {
    for (let i = 1; i < w.points.length; i += 1) {
      const a = w.points[i - 1];
      const b = w.points[i];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.max(1, Math.round(L / 25));
      for (let k = 0; k < n; k += 1) {
        flat.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
        owner.push(wi);
      }
    }
    flat.push(w.points[w.points.length - 1]);
    owner.push(wi);
  });
  const nearest = gridIndex(flat, 60);

  /* --- Attribution: which trails does the course run on? ----------------- */

  const sample = dense.filter((_, i) => i % 10 === 0).map(frame.project);
  const tally = new Map();
  const residuals = [];
  let onTrail = 0;
  for (const [x, y] of sample) {
    const { dist, index } = nearest(x, y);
    residuals.push(dist);
    if (dist < 60 && index >= 0) {
      onTrail += 1;
      const nm = ways[owner[index]].name;
      if (nm) tally.set(nm, (tally.get(nm) ?? 0) + 1);
    }
  }
  residuals.sort((a, b) => a - b);
  const median = residuals[Math.floor(residuals.length / 2)];
  const p90 = residuals[Math.floor(residuals.length * 0.9)];
  console.log(`Track to nearest trail: median ${median.toFixed(1)} ft, 90th ${p90.toFixed(1)} ft`);
  console.log(
    `  ${((onTrail / sample.length) * 100).toFixed(0)}% of the course is within 60 ft of a trail`,
  );

  const named = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  const namedTotal = named.reduce((s, [, c]) => s + c, 0);
  const trailsUsed = named
    .map(([name, count]) => ({ name, percent: Number(((count / namedTotal) * 100).toFixed(1)) }))
    .filter((t) => t.percent >= 0.5);
  console.log('Trails used:');
  for (const t of trailsUsed) console.log(`   ${String(t.percent).padStart(5)}%  ${t.name}`);

  /* --- Terrain ----------------------------------------------------------- */

  // A heightfield over the course box for the 3D view. GRID_N is the knob: the
  // file is GRID_N^2 numbers, and 3DEP is sampled once per cell, so doubling it
  // quadruples both the bytes and the number of API calls.
  const GRID_N = 96;
  const xs = sample.map((p) => p[0]);
  const ys = sample.map((p) => p[1]);
  const margin = 500;
  const box = {
    minX: Math.min(...xs) - margin,
    maxX: Math.max(...xs) + margin,
    minY: Math.min(...ys) - margin,
    maxY: Math.max(...ys) + margin,
  };
  const gridPoints = [];
  for (let j = 0; j < GRID_N; j += 1) {
    for (let i = 0; i < GRID_N; i += 1) {
      const x = box.minX + ((box.maxX - box.minX) * i) / (GRID_N - 1);
      const y = box.minY + ((box.maxY - box.minY) * j) / (GRID_N - 1);
      // Back to lon/lat for the DEM query.
      const k = Math.cos((lat0 * Math.PI) / 180) * FT_PER_DEG_LAT;
      gridPoints.push([lon0 + x / k, lat0 + y / FT_PER_DEG_LAT]);
    }
  }
  console.log(`Sampling 3DEP for a ${GRID_N}x${GRID_N} heightfield...`);
  const heights = await sampleElevations(gridPoints);

  /* --- Write ------------------------------------------------------------- */

  const courseMap = {
    generatedBy: 'scripts/build-course-map.mjs',
    frame: { lat0: Number(lat0.toFixed(7)), lon0: Number(lon0.toFixed(7)) },
    units: 'feet, x east, y north, relative to frame',
    loops,
    trails: ways
      .filter((w) => w.points.length > 1)
      .map((w) => ({
        name: w.name,
        kind: w.highway,
        points: simplify(w.points, 12).map(([x, y]) => [Math.round(x), Math.round(y)]),
      })),
    trailsUsed,
    fit: { medianFt: Number(median.toFixed(1)), p90Ft: Number(p90.toFixed(1)) },
  };

  const terrain = {
    generatedBy: 'scripts/build-course-map.mjs',
    grid: GRID_N,
    box: {
      minX: Math.round(box.minX),
      maxX: Math.round(box.maxX),
      minY: Math.round(box.minY),
      maxY: Math.round(box.maxY),
    },
    // Rounded to the foot. A 1 m DEM does not justify decimals and they double
    // the file size.
    heights: heights.map((h) => Math.round(h)),
  };

  if (REPORT_ONLY) {
    console.log('\n--report: nothing written.');
    return;
  }

  // STABLE KEY ORDER AND NO TIMESTAMP, so a re-run with unchanged inputs
  // rewrites byte-identical files. Same rule as `npm run mud`: a generator that
  // churns its output on every run makes every diff unreadable and trains
  // people to ignore it.
  writeFileSync(join(DATA, 'course-map.json'), `${JSON.stringify(courseMap)}\n`);
  writeFileSync(join(DATA, 'course-terrain.json'), `${JSON.stringify(terrain)}\n`);
  console.log('\nWrote scripts/data/course-map.json and course-terrain.json');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
