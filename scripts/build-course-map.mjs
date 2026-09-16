// scripts/build-course-map.mjs
//
// Builds the course map's data from the GPS track: the route as GeoJSON, and
// which trails the course actually runs on. Writes committed files so the site
// build never needs the network.
//
// WHAT THIS DELIBERATELY NO LONGER EMITS, and why. An earlier version of this
// script also wrote the OSM basemap geometry, a 256x256 heightfield, marching-
// squares contours and a USGS orthophotograph, because the map was a bespoke
// SVG renderer and a three.js scene that had to be handed every pixel they drew.
// The map is MapLibre now, which fetches imagery and terrain as tiles at the
// zoom the reader is actually at, so all of that became a megabyte of committed
// files reimplementing, worse, what a map engine does natively.
//
// The OSM fetch stays, because the trail ATTRIBUTION is a build-time
// measurement: matching the track against the named trail network is how the
// page can say the course is 17.8% Furnas Trail. Only the tally is kept; the
// geometry is thrown away.
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
const OVERPASS_MIRROR = 'https://overpass.kumi.systems/api/interpreter';

/**
 * Everything in the box, not just the trails.
 *
 * `nwr(bbox); out geom;` asks for every node, way and relation in the area and
 * lets this script decide what is interesting. It is a blunt query and a
 * deliberate one: a long filtered query is exactly what the public instances
 * time out on, and this one returns in seconds where the filtered version
 * failed repeatedly with "the server is probably too busy". It also means
 * adding a layer later is a change HERE rather than another round trip.
 *
 * CACHED TO DISK under node_modules/.cache, which is already ignored. Overpass
 * is a volunteer service and this script runs by hand whenever a new track
 * arrives; the committed OUTPUT is what the site builds from.
 *
 * A User-Agent is not optional: without one the main instance answers
 * 406 Not Acceptable, which reads like a malformed query and is not.
 */
async function fetchOsm(bbox) {
  mkdirSync(CACHE, { recursive: true });
  const key = join(CACHE, `osm-all-${bbox.map((n) => n.toFixed(4)).join('_')}.json`);
  if (existsSync(key)) {
    console.log('  (osm from cache)');
    return JSON.parse(readFileSync(key, 'utf8'));
  }

  const query = `[out:json][timeout:180];
nwr(${bbox.join(',')});
out geom;`;

  let lastErr;
  for (const host of [OVERPASS, OVERPASS_MIRROR]) {
    try {
      const res = await fetch(host, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'user-agent': 'stonesteps50k-course-map/1.0 (+https://stonesteps50k.com)',
        },
        body: new URLSearchParams({ data: query }),
      });
      if (!res.ok) throw new Error(`Overpass ${res.status} ${res.statusText}`);
      const text = await res.text();
      // A BUSY INSTANCE ANSWERS 200 WITH AN HTML ERROR PAGE, so the status code
      // is not the check. Parsing is.
      if (!text.trimStart().startsWith('{')) {
        throw new Error(text.includes('too busy') ? 'instance busy' : 'returned HTML');
      }
      const json = JSON.parse(text);
      writeFileSync(key, JSON.stringify(json));
      return json;
    } catch (err) {
      lastErr = err;
      console.log(`  (${host.split('/')[2]}: ${err.message}, trying next)`);
    }
  }
  throw lastErr;
}

/* ---------- What the map draws ------------------------------------------- */

/**
 * ROAD CLASSES, IN RANK ORDER, WITH THE ZOOM EACH APPEARS AT.
 *
 * A map where every line is the same weight reads as a circuit diagram. This
 * ranking is the one every road atlas uses and it does two jobs: it sets stroke
 * width, and it sets the zoom at which a class appears at all, so the default
 * fit carries the highways and the park roads while driveways wait until
 * somebody is actually looking closely.
 */
const ROAD_CLASSES = {
  motorway: { rank: 1, minZoom: 1 },
  trunk: { rank: 1, minZoom: 1 },
  motorway_link: { rank: 3, minZoom: 1.6 },
  trunk_link: { rank: 3, minZoom: 1.6 },
  primary: { rank: 2, minZoom: 1 },
  secondary: { rank: 2, minZoom: 1 },
  primary_link: { rank: 3, minZoom: 1.8 },
  tertiary: { rank: 3, minZoom: 1.4 },
  residential: { rank: 4, minZoom: 2.2 },
  unclassified: { rank: 4, minZoom: 2.2 },
  living_street: { rank: 4, minZoom: 2.2 },
  service: { rank: 5, minZoom: 3.4 },
};

/** Ways a person walks. Kept apart from roads so they can be drawn dashed. */
const PATH_CLASSES = new Set(['path', 'footway', 'track', 'cycleway', 'bridleway', 'steps']);

/**
 * The point features a runner actually wants, and nothing else.
 *
 * Deliberately short. Every marker competes with the course line, and a map
 * that shows bus stops and benches is a map you cannot find the toilets on.
 */
function poiKind(tags) {
  if (!tags) return null;
  if (tags.amenity === 'toilets') return 'toilets';
  if (tags.amenity === 'drinking_water') return 'water';
  if (tags.amenity === 'shelter') return 'shelter';
  if (tags.tourism === 'picnic_site') return 'picnic';
  if (tags.amenity === 'parking') return 'parking';
  if (tags.highway === 'trailhead') return 'trailhead';
  if (tags.tourism === 'viewpoint') return 'viewpoint';
  return null;
}

/** Which filled area, if any, a way represents. Order matters: first match wins. */
function areaKind(tags) {
  if (!tags) return null;
  if (tags.natural === 'water' || tags.water || tags.landuse === 'reservoir') return 'water';
  if (tags.natural === 'wood' || tags.landuse === 'forest') return 'wood';
  if (tags.leisure === 'nature_reserve' || tags.boundary === 'protected_area') return 'reserve';
  if (tags.leisure === 'park' || tags.leisure === 'garden') return 'park';
  if (tags.leisure === 'pitch' || tags.leisure === 'playground') return 'pitch';
  if (tags.amenity === 'parking') return 'parking';
  if (tags.building) return 'building';
  return null;
}

/* ---------- Main ---------------------------------------------------------- */

async function main() {
  const track = readTrack(resolve(process.cwd(), file));
  console.log(`Track: ${track.length} points`);

  // A local flat frame in FEET, used only for measurement: simplification
  // tolerances and nearest-trail distances are both distances, and doing them
  // in degrees would make them 25% tighter north-south than east-west. The
  // OUTPUT is lon/lat, because that is what a map engine wants.
  const lat0 = track.reduce((s, p) => s + p[1], 0) / track.length;
  const lon0 = track.reduce((s, p) => s + p[0], 0) / track.length;
  const frame = makeFrame(lat0, lon0);
  const k = Math.cos((lat0 * Math.PI) / 180) * FT_PER_DEG_LAT;
  const unproject = ([x, y]) => [
    Number((lon0 + x / k).toFixed(6)),
    Number((lat0 + y / FT_PER_DEG_LAT).toFixed(6)),
  ];

  // The loop split uses the SAME dense walk and the SAME detector the elevation
  // chart uses, so the map's loop boundaries and the chart's aid marks are the
  // same seven numbers by construction.
  const dense = densify(track, 50);
  const laps = findLaps(dense);
  console.log(`Loops: ${laps.map((m) => m.toFixed(2)).join(', ')} miles`);

  const cum = [0];
  for (let i = 1; i < dense.length; i += 1) {
    cum.push(cum[i - 1] + haversineFt(dense[i - 1], dense[i]));
  }

  const loops = [];
  let from = 0;
  laps.forEach((endMile, li) => {
    const endFt = endMile * 5280;
    let to = from;
    while (to < dense.length - 1 && cum[to] < endFt) to += 1;
    const slice = dense.slice(from, to + 1).map(frame.project);
    const lengthMiles = (cum[to] - cum[from]) / 5280;
    loops.push({
      index: li + 1,
      kind: lengthMiles >= 4 ? 'long' : 'short',
      miles: Number(lengthMiles.toFixed(2)),
      // 12 ft: fine enough that no bend a reader can see is lost, coarse enough
      // to drop ~95% of the points a watch recorded.
      coords: simplify(slice, 12).map(unproject),
    });
    from = to;
  });
  const ptCount = loops.reduce((n, l) => n + l.coords.length, 0);
  console.log(`Route: ${ptCount} points after simplifying (from ${dense.length})`);

  /* --- Which trails does the course run on? ------------------------------ */

  const lats = track.map((p) => p[1]);
  const lons = track.map((p) => p[0]);
  const PAD = 0.004; // roughly a quarter mile of context around the course
  const bbox = [
    Math.min(...lats) - PAD,
    Math.min(...lons) - PAD,
    Math.max(...lats) + PAD,
    Math.max(...lons) + PAD,
  ];

  console.log('Fetching OpenStreetMap (for the trail tally only)...');
  const osm = await fetchOsm(bbox);
  const els = osm.elements ?? [];
  console.log(`  ${els.length} elements`);

  // TRAILS AND ROADS BOTH, because the course genuinely runs on park roads:
  // Trail Ridge Road, Blue Spruce Road, Lodge Road and Oak Ridge Road are all
  // in the answer. Indexing only the paths dropped the share of the course
  // found near a named way from 95% to 85%, which looked like the fit had
  // broken and was really a missing layer.
  const runnable = [];
  for (const e of els) {
    const t = e.tags ?? {};
    const hw = t.highway;
    if (!hw || !(ROAD_CLASSES[hw] || PATH_CLASSES.has(hw))) continue;
    const geom = e.geometry ?? [];
    if (geom.length < 2) continue;
    runnable.push({
      name: t.name ?? null,
      points: geom.map((g) => frame.project([g.lon, g.lat])),
    });
  }
  console.log(`  ${runnable.length} runnable ways`);

  // Densified so "nearest vertex" is a fair proxy for "nearest point on the
  // way": without it a long straight segment reports its ENDPOINTS as the
  // nearest thing, and a course running along its middle looks 200 ft off a
  // trail it is standing on.
  const flat = [];
  const owner = [];
  runnable.forEach((w, wi) => {
    for (let i = 1; i < w.points.length; i += 1) {
      const a = w.points[i - 1];
      const b = w.points[i];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.max(1, Math.round(L / 25));
      for (let c = 0; c < n; c += 1) {
        flat.push([a[0] + ((b[0] - a[0]) * c) / n, a[1] + ((b[1] - a[1]) * c) / n]);
        owner.push(wi);
      }
    }
    flat.push(w.points[w.points.length - 1]);
    owner.push(wi);
  });
  const nearest = gridIndex(flat, 60);

  const sample = dense.filter((_, i) => i % 10 === 0).map(frame.project);
  const tally = new Map();
  const residuals = [];
  let onTrail = 0;
  for (const [x, y] of sample) {
    const { dist, index } = nearest(x, y);
    residuals.push(dist);
    if (dist < 60 && index >= 0) {
      onTrail += 1;
      const nm = runnable[owner[index]].name;
      if (nm) tally.set(nm, (tally.get(nm) ?? 0) + 1);
    }
  }
  residuals.sort((a, b) => a - b);
  const median = residuals[Math.floor(residuals.length / 2)];
  const p90 = residuals[Math.floor(residuals.length * 0.9)];
  console.log(`Track to nearest way: median ${median.toFixed(1)} ft, 90th ${p90.toFixed(1)} ft`);
  console.log(`  ${((onTrail / sample.length) * 100).toFixed(0)}% within 60 ft of a named way`);

  const named = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  const namedTotal = named.reduce((s, [, c]) => s + c, 0);
  const trailsUsed = named
    .map(([name, count]) => ({ name, percent: Number(((count / namedTotal) * 100).toFixed(1)) }))
    .filter((t) => t.percent >= 0.5);
  console.log('Trails used:');
  for (const t of trailsUsed) console.log(`   ${String(t.percent).padStart(5)}%  ${t.name}`);

  /* --- Write ------------------------------------------------------------- */

  // GEOJSON, because that is the interchange format every map engine reads. One
  // Feature per loop with its own properties, so MapLibre can style the long
  // and short loops differently from one source without a second file.
  const geojson = {
    type: 'FeatureCollection',
    features: [
      ...loops.map((l) => ({
        type: 'Feature',
        properties: { kind: l.kind, index: l.index, miles: l.miles },
        geometry: { type: 'LineString', coordinates: l.coords },
      })),
      {
        type: 'Feature',
        properties: { kind: 'start', name: 'The Oval' },
        geometry: { type: 'Point', coordinates: loops[0].coords[0] },
      },
    ],
  };

  const bounds = {
    west: Math.min(...loops.flatMap((l) => l.coords.map((c) => c[0]))),
    south: Math.min(...loops.flatMap((l) => l.coords.map((c) => c[1]))),
    east: Math.max(...loops.flatMap((l) => l.coords.map((c) => c[0]))),
    north: Math.max(...loops.flatMap((l) => l.coords.map((c) => c[1]))),
  };

  const meta = {
    generatedBy: 'scripts/build-course-map.mjs',
    attribution: {
      osm: 'Map data (c) OpenStreetMap contributors, ODbL',
      usgs: 'Imagery and elevation courtesy of the U.S. Geological Survey',
    },
    bounds,
    loops: loops.map((l) => ({ index: l.index, kind: l.kind, miles: l.miles })),
    trailsUsed,
    fit: { medianFt: Number(median.toFixed(1)), p90Ft: Number(p90.toFixed(1)) },
  };

  if (REPORT_ONLY) {
    console.log('\n--report: nothing written.');
    return;
  }

  // STABLE KEY ORDER AND NO TIMESTAMP, so a re-run with unchanged inputs
  // rewrites byte-identical files. Same rule as `npm run mud`: a generator that
  // churns its output makes every diff unreadable and trains people to ignore
  // it.
  // NAMED .json, NOT .geojson, on purpose: the bundler parses a .json import
  // into an object and treats an unknown extension as an opaque asset it will
  // not inline.
  writeFileSync(join(DATA, 'course-geo.json'), `${JSON.stringify(geojson)}\n`);
  writeFileSync(join(DATA, 'course-map.json'), `${JSON.stringify(meta)}\n`);
  console.log('\nWrote scripts/data/course-geo.json and course-map.json');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
