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

/**
 * The park's own published trail lengths, transcribed from the 2017 Cincinnati
 * Parks "Mt. Airy Forest East Section" sheet.
 *
 * TRANSCRIBED, NOT MEASURED, and that is the point: these are the figures on the
 * sign and on the map in the car park, so they are the numbers a runner will
 * have already read. Ours are computed from OSM geometry and agree with seven of
 * the eight trails that sit wholly inside our extract to within 11%, two of them
 * exactly, which is why both can be shown side by side without embarrassment.
 *
 * The map is the only source for these: OSM carries the geometry but not the
 * park's official length, and the two are different claims.
 *
 * Trails (E) and (I) are absent from the sheet. That is the park's numbering,
 * not a gap in the transcription.
 */
const PARKS_TRAIL_MILES = {
  'Colerain Trail (A)': 0.74,
  'Ponderosa Trail (B)': 3.76,
  'Red Oak Trail (C)': 0.82,
  'Quarry Trail (D)': 2.48,
  'Furnas Trail (F)': 1.46,
  'Twin Bridge Trail (G)': 0.25,
  'Beechwood Trail (H)': 1.15,
  'Blue Spruce (J)': 0.78,
  'Lingo Trail (K)': 1.41,
  'Cedar Trail (L)': 0.37,
  'Diehl Ridge Trail': 1.81,
};

/**
 * Match our trail name to the park's, which are not always spelled alike.
 *
 * OSM says "Blue Spruce Trail (J)" where the sheet says "Blue Spruce (J)", so an
 * exact-key lookup silently drops it. The letter in brackets is the park's own
 * identifier and is the reliable join; the words around it are not.
 */
function officialMiles(name) {
  if (PARKS_TRAIL_MILES[name] != null) return PARKS_TRAIL_MILES[name];
  const letter = /\(([A-Z])\)/.exec(name)?.[1];
  if (letter) {
    for (const [k, v] of Object.entries(PARKS_TRAIL_MILES)) {
      if (k.endsWith(`(${letter})`)) return v;
    }
  }
  return null;
}

/**
 * What a runner wants marked, and nothing else.
 *
 * A toilet at mile 8.5 is worth more than every picnic table in the park put
 * together, so the list is short on purpose. Picnic areas are in because the
 * race names its start as one of them ("The Oval, Area 13") and because the
 * numbered areas are how the park itself gives directions.
 */
function facilityKind(tags) {
  if (!tags) return null;
  if (tags.amenity === 'toilets') return 'toilets';
  if (tags.amenity === 'drinking_water') return 'water';
  if (tags.amenity === 'shelter') return 'shelter';
  if (tags.tourism === 'picnic_site') return 'picnic';
  if (tags.highway === 'trailhead') return 'trailhead';
  if (tags.tourism === 'viewpoint') return 'viewpoint';
  return null;
}

/**
 * Landmarks worth a label: things with a name that a runner would use to say
 * where they are. Buildings, water and shelters, not every mapped bench.
 */
function landmarkName(tags) {
  if (!tags?.name) return null;
  if (tags.natural === 'water') return tags.name;
  if (tags.amenity === 'community_centre' || tags.amenity === 'shelter') return tags.name;
  if (tags.building && tags.name) return tags.name;
  if (tags.leisure === 'disc_golf_course') return tags.name;
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
    // 12 ft: fine enough that no bend a reader can see is lost, coarse enough
    // to drop ~95% of the points a watch recorded.
    const simplified = simplify(slice, 12);
    loops.push({
      index: li + 1,
      kind: lengthMiles >= 4 ? 'long' : 'short',
      miles: Number(lengthMiles.toFixed(2)),
      // Cumulative miles at the START of this loop, so a point's distance into
      // the RACE can be computed without re-walking the whole route.
      startMile: Number((cum[from] / 5280).toFixed(3)),
      flat: simplified,
      coords: simplified.map(unproject),
    });
    from = to;
  });
  const ptCount = loops.reduce((n, l) => n + l.coords.length, 0);
  console.log(`Route: ${ptCount} points after simplifying (from ${dense.length})`);

  /* --- Elevation along the route ----------------------------------------- */

  // EVERY ROUTE VERTEX GETS A HEIGHT, from the same USGS LiDAR the elevation
  // profile uses. This is what lets the map do three things it otherwise
  // could not: colour the line by gradient, drive a linked profile that
  // scrubs with the flyover, and put the camera at a sensible altitude above
  // ground rather than above sea level.
  //
  // The DEM, not the GPX's own barometric column, for the reason recorded in
  // build-elevation.mjs: a watch's altimeter drifts with the weather over a
  // morning, and taking the horizontal from the watch and the vertical from
  // LiDAR uses each source for what it is good at.
  const allVerts = loops.flatMap((l) => l.flat);
  console.log(`Sampling 3DEP for ${allVerts.length} route vertices...`);
  const vertHeights = await sampleElevations(allVerts.map(unproject));

  let vi = 0;
  for (const loop of loops) {
    loop.ele = loop.flat.map(() => Math.round(vertHeights[vi++]));
  }

  // Distance into the race, and gradient, per vertex. GRADIENT IS SMOOTHED OVER
  // A WINDOW, not taken between neighbouring points: simplification leaves
  // vertices anywhere from a few feet to a few hundred apart, and a raw
  // rise-over-run between two close points is mostly DEM noise, which paints a
  // gradient-coloured line as confetti. 150 ft is about the shortest run over
  // which a change of slope is something a runner would actually feel.
  const GRADE_WINDOW_FT = 150;
  for (const loop of loops) {
    const n = loop.flat.length;
    const d = [0];
    for (let i = 1; i < n; i += 1) {
      d.push(
        d[i - 1] +
          Math.hypot(loop.flat[i][0] - loop.flat[i - 1][0], loop.flat[i][1] - loop.flat[i - 1][1]),
      );
    }
    loop.mile = d.map((ft) => Number((loop.startMile + ft / 5280).toFixed(4)));
    loop.grade = d.map((_, i) => {
      let a = i;
      let b = i;
      while (a > 0 && d[i] - d[a] < GRADE_WINDOW_FT / 2) a -= 1;
      while (b < n - 1 && d[b] - d[i] < GRADE_WINDOW_FT / 2) b += 1;
      const run = d[b] - d[a];
      if (run < 1) return 0;
      return Number((((loop.ele[b] - loop.ele[a]) / run) * 100).toFixed(1));
    });
  }

  const grades = loops.flatMap((l) => l.grade);
  const steepest = Math.max(...grades);
  const steepestDown = Math.min(...grades);
  console.log(
    `Gradient: ${steepestDown.toFixed(1)}% to +${steepest.toFixed(1)}% ` +
      `over a ${GRADE_WINDOW_FT} ft window`,
  );

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
    .map(([name, count]) => ({
      name,
      percent: Number(((count / namedTotal) * 100).toFixed(1)),
      // The park's own published length, where the sheet lists one. Null for
      // the park ROADS the course also uses, which the trail sheet does not
      // measure, and for anything the sheet does not name.
      officialMiles: officialMiles(name),
    }))
    .filter((t) => t.percent >= 0.5);
  console.log('Trails used:');
  for (const t of trailsUsed) console.log(`   ${String(t.percent).padStart(5)}%  ${t.name}`);

  /* --- What is beside the course ----------------------------------------- */

  // NEAREST POINT ON THE ROUTE, AND THE MILE THERE. A toilet is only useful if
  // you know when you reach it, so every facility is reported as a distance
  // from the course AND a distance into the race.
  const routePts = [];
  const routeMiles = [];
  for (const loop of loops) {
    for (let i = 0; i < loop.flat.length; i += 1) {
      routePts.push(loop.flat[i]);
      routeMiles.push(loop.mile[i]);
    }
  }
  /**
   * Every time the course comes within reach of a point, not just the closest.
   *
   * THE NEAREST PASS IS A LIE ON A LOOP COURSE. The first version of this
   * reported only the closest approach, which labelled the drinking water by
   * The Oval as "Water 24.7" when it is in fact reachable from MILE 0.0 and
   * passed eight times; one toilet block came out as "WC 5.1" and is passed
   * ten times. A runner reading that would plan around the wrong lap. So each
   * facility carries the mile of every distinct pass, and the label says how
   * many there are.
   *
   * A pass ENDS when the course leaves the radius, which is what stops one slow
   * curve past a building from counting as six.
   */
  const passesNear = (x, y, withinFt) => {
    const out = [];
    let best = Infinity;
    let inRange = false;
    for (let i = 0; i < routePts.length; i += 1) {
      const d = Math.hypot(routePts[i][0] - x, routePts[i][1] - y);
      if (d < best) best = d;
      const near = d < withinFt;
      if (near && !inRange) out.push(Number(routeMiles[i].toFixed(1)));
      inRange = near;
    }
    return { dist: best, passes: out };
  };

  // 160 FT. Wide enough to catch a toilet block set back from the trail behind
  // a screen of trees, tight enough that nothing across the valley qualifies.
  // At 200 ft the list starts collecting facilities you cannot see from the
  // course, which is worse than not listing them.
  const NEAR_FT = 160;
  const facilities = [];
  const landmarks = [];
  const seen = new Set();

  for (const e of els) {
    const t = e.tags ?? {};
    let pt = null;
    if (e.type === 'node' && typeof e.lat === 'number') pt = frame.project([e.lon, e.lat]);
    else if ((e.geometry ?? []).length) {
      const ps = e.geometry.map((g) => frame.project([g.lon, g.lat]));
      pt = [
        ps.reduce((a, q) => a + q[0], 0) / ps.length,
        ps.reduce((a, q) => a + q[1], 0) / ps.length,
      ];
    }
    if (!pt) continue;

    const { dist, passes } = passesNear(pt[0], pt[1], NEAR_FT);
    if (dist > NEAR_FT) continue;
    const mile = passes.length ? passes[0] : 0;

    const kind = facilityKind(t);
    if (kind) {
      // The same toilet block can be mapped as a node AND as a building. Key on
      // position so it is marked once.
      const key = `${kind}:${Math.round(pt[0] / 40)}:${Math.round(pt[1] / 40)}`;
      if (!seen.has(key)) {
        seen.add(key);
        facilities.push({
          type: 'Feature',
          properties: {
            kind,
            name: t.name ?? null,
            ref: t.ref ?? null,
            // The mile you FIRST reach it, and how many times in total.
            mile,
            passes: passes.length,
            everyMile: passes,
            offsetFt: Math.round(dist),
          },
          geometry: { type: 'Point', coordinates: unproject(pt) },
        });
      }
    }

    const lname = landmarkName(t);
    if (lname && !seen.has(`L:${lname}`)) {
      seen.add(`L:${lname}`);
      landmarks.push({
        type: 'Feature',
        properties: { name: lname, mile },
        geometry: { type: 'Point', coordinates: unproject(pt) },
      });
    }
  }

  facilities.sort((a, b) => a.properties.mile - b.properties.mile);
  const byKind = facilities.reduce((m, f) => {
    m[f.properties.kind] = (m[f.properties.kind] ?? 0) + 1;
    return m;
  }, {});
  console.log(
    `Beside the course (within ${NEAR_FT} ft): ` +
      Object.entries(byKind)
        .map(([k, n]) => `${n} ${k}`)
        .join(', ') +
      `, ${landmarks.length} named landmarks`,
  );
  for (const f of facilities.filter((q) => ['toilets', 'water'].includes(q.properties.kind))) {
    const pr = f.properties;
    console.log(
      `   ${pr.kind.padEnd(8)} first at mile ${String(pr.mile).padStart(5)}` +
        `, passed ${pr.passes}x  (${pr.everyMile.join(', ')})`,
    );
  }

  /* --- Write ------------------------------------------------------------- */

  // GEOJSON, because that is the interchange format every map engine reads. One
  // Feature per loop with its own properties, so MapLibre can style the long
  // and short loops differently from one source without a second file.
  // GRADIENT IS PAINTED WITH A LINE-GRADIENT, which needs `lineMetrics` on the
  // source and a per-vertex position along the line. MapLibre cannot read a
  // property array off a LineString, so each loop also ships as a run of short
  // two-point segments carrying their own grade. That is more features, and it
  // is the only way to colour a line by a value that varies along it.
  const gradeSegments = [];
  for (const loop of loops) {
    for (let i = 1; i < loop.coords.length; i += 1) {
      gradeSegments.push({
        type: 'Feature',
        properties: { grade: loop.grade[i], loop: loop.index },
        geometry: { type: 'LineString', coordinates: [loop.coords[i - 1], loop.coords[i]] },
      });
    }
  }

  /*
   * MILES WITHIN THE LOOP, NOT MILES INTO THE RACE, which is how the 1998 race
   * map numbered them and how a marker on the ground has to behave.
   *
   * The first version placed a marker at every whole CUMULATIVE mile, 1 to 29.
   * On a course that runs the same trails seven times that puts several
   * different numbers on one piece of ground: the same tree is mile 4 on the
   * first lap and mile 19 on the fourth, and the map ended up showing "15" and
   * "25" a few hundred feet apart with no way to tell what either meant. A
   * runner cannot use that, and nobody could paint it on a post.
   *
   * So each KIND of loop gets one set: 1 to 5 round the long loop, 1 to 3 round
   * the short one. Later laps retrace the same ground, so one set per kind
   * covers all seven, and eight markers replace twenty-nine.
   */
  // The race's own length, still counted end to end: the markers changed, the
  // course did not.
  const lastLoop = loops[loops.length - 1];
  const totalMiles = lastLoop.mile[lastLoop.mile.length - 1];

  const mileMarkers = [];
  for (const kind of ['long', 'short']) {
    // The FIRST lap of each kind. Any lap would do, since they are the same
    // ground; the first is the one whose mile column starts at zero.
    const loop = loops.find((l) => l.kind === kind);
    if (!loop) continue;
    const start = loop.mile[0];
    const loopMiles = loop.mile[loop.mile.length - 1] - start;
    for (let m = 1; m <= Math.floor(loopMiles); m += 1) {
      let best = null;
      for (let i = 0; i < loop.mile.length; i += 1) {
        const diff = Math.abs(loop.mile[i] - start - m);
        if (!best || diff < best.diff) best = { diff, coord: loop.coords[i], ele: loop.ele[i] };
      }
      // 0.05 miles is 264 ft: past that the track has no sample near the mile
      // and a marker would be a guess rather than a measurement.
      if (best && best.diff < 0.05) {
        mileMarkers.push({
          type: 'Feature',
          properties: { mile: m, kind, ele: best.ele },
          geometry: { type: 'Point', coordinates: best.coord },
        });
      }
    }
  }

  const geojson = {
    type: 'FeatureCollection',
    features: [
      ...loops.map((l) => ({
        type: 'Feature',
        properties: { kind: l.kind, index: l.index, miles: l.miles, startMile: l.startMile },
        // THREE-COMPONENT COORDINATES. GeoJSON allows an altitude as the third
        // element, MapLibre ignores it for drawing, and the flyover reads it to
        // put the camera above the GROUND rather than above sea level.
        geometry: {
          type: 'LineString',
          coordinates: l.coords.map((c, i) => [c[0], c[1], l.ele[i]]),
        },
      })),
      {
        type: 'Feature',
        properties: { kind: 'start', name: 'The Oval' },
        geometry: { type: 'Point', coordinates: loops[0].coords[0] },
      },
    ],
  };

  const gradeGeojson = { type: 'FeatureCollection', features: gradeSegments };
  const mileGeojson = { type: 'FeatureCollection', features: mileMarkers };

  // The flyover and the linked profile both walk the whole course as one list,
  // so it is flattened once here rather than stitched back together in the
  // browser every time somebody presses play.
  const profile = [];
  for (const loop of loops) {
    for (let i = 0; i < loop.coords.length; i += 1) {
      // The loops share a vertex at each boundary; keeping both would put a
      // zero-length step in the flyover and a duplicate point in the profile.
      if (profile.length && i === 0) continue;
      profile.push([
        loop.coords[i][0],
        loop.coords[i][1],
        loop.ele[i],
        loop.mile[i],
        loop.grade[i],
        loop.index,
      ]);
    }
  }

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
    loops: loops.map((l) => ({
      index: l.index,
      kind: l.kind,
      miles: l.miles,
      startMile: l.startMile,
    })),
    totalMiles: Number(totalMiles.toFixed(2)),
    gradeRange: { min: steepestDown, max: steepest },
    elevation: {
      lowFt: Math.min(...loops.flatMap((l) => l.ele)),
      highFt: Math.max(...loops.flatMap((l) => l.ele)),
    },
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
  writeFileSync(join(DATA, 'course-grade.json'), `${JSON.stringify(gradeGeojson)}\n`);
  writeFileSync(join(DATA, 'course-miles.json'), `${JSON.stringify(mileGeojson)}\n`);
  writeFileSync(
    join(DATA, 'course-poi.json'),
    `${JSON.stringify({ type: 'FeatureCollection', features: facilities })}\n`,
  );
  writeFileSync(
    join(DATA, 'course-landmarks.json'),
    `${JSON.stringify({ type: 'FeatureCollection', features: landmarks })}\n`,
  );
  writeFileSync(join(DATA, 'course-profile.json'), `${JSON.stringify({ points: profile })}\n`);
  writeFileSync(join(DATA, 'course-map.json'), `${JSON.stringify(meta)}\n`);
  console.log(
    `\nWrote course-geo.json, course-grade.json (${gradeSegments.length} segments), ` +
      `course-miles.json (${mileMarkers.length} markers, per loop), ` +
      `course-poi.json (${facilities.length}), course-landmarks.json (${landmarks.length}), ` +
      `course-profile.json ` +
      `(${profile.length} points) and course-map.json`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
