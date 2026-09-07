// scripts/build-elevation.mjs
//
// Turns a real GPS track into the site's elevation profile, using public USGS
// LiDAR rather than the noisy barometric altitude a watch records.
//
// Usage:
//   node scripts/build-elevation.mjs course.gpx                 # report only
//   node scripts/build-elevation.mjs course.gpx --write         # save to Sanity
//   node scripts/build-elevation.mjs course.gpx --loops 4,3     # long/short counts
//
// Accepts .gpx or a GeoJSON LineString/Feature.
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS, AND WHY IT HAS NO INPUT YET
//
// The elevation profile on the site is currently SYNTHETIC: it illustrates the
// loop structure and says so in its own caption. Replacing it needs the one
// thing nobody has published, which is the actual route.
//
// I tried to reconstruct the route from the course map, because the 1998
// Cincinnati Park Board map does draw it: a red long loop and a blue short
// loop out of The Oval. It does not work, and the reason is worth recording so
// nobody spends the day on it again.
//
// Colour-separating the route lines works (the red loop yields ~10,800 pixels).
// Georeferencing it against the OpenStreetMap trail network does not. After
// optimising offset, scale and rotation, the best fit leaves a median residual
// of 84 ft with a standard deviation of 113 ft north and 127 ft east, while the
// MEAN offset is only -3 ft north and -14 ft east.
//
// That combination is the diagnosis: the registration is centred correctly and
// there is no systematic error left to remove, but the error is scattered. The
// map is a schematic drawn for legibility, not a survey. No affine transform
// fixes scattered error, and trails in Mt. Airy are frequently closer together
// than 120 ft, so snapping would pick the wrong trail often and compound along
// the route.
//
// A profile built on that would look surveyed and would not be. That is worse
// than the honest synthetic one, so it was not built.
//
// WHAT UNBLOCKS THIS: any GPX. The race is chip-timed and the Facebook group
// has over a thousand members, so one finisher's watch file is a single post
// away, and it gives the CURRENT route rather than a 1998 reconstruction. Point
// this script at it and the site has a real profile and a real download.
// ---------------------------------------------------------------------------

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { createClient } from '@sanity/client';
import { loadEnv } from './lib/loadEnv.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const env = loadEnv(root);

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const WRITE = args.includes('--write');
const loopArg = args[args.indexOf('--loops') + 1];

if (!file) {
  console.log('Usage: node scripts/build-elevation.mjs <course.gpx> [--write] [--loops 4,3]');
  process.exit(0);
}

/* ---------- Track parsing ------------------------------------------------ */

/** Pull [lon, lat] pairs out of a GPX or GeoJSON file. */
function readTrack(path) {
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

function haversineFt([lon1, lat1], [lon2, lat2]) {
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
function densify(track, stepFt = 50) {
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

const SAMPLES_URL =
  'https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/getSamples';

/**
 * Sample USGS 3DEP for every point, in batches.
 *
 * 3DEP over Ohio is LiDAR-derived at 1 metre, which is far better than the
 * barometric altitude in a GPX: a watch drifts with the weather and can be tens
 * of feet out over a morning. Taking the horizontal track from the watch and
 * the vertical from the DEM uses each source for the thing it is good at.
 */
async function sampleElevations(points, batch = 200) {
  const out = [];
  for (let i = 0; i < points.length; i += batch) {
    const chunk = points.slice(i, i + batch);
    const geometry = JSON.stringify({
      points: chunk.map(([lon, lat]) => [lon, lat]),
      spatialReference: { wkid: 4326 },
    });
    const url =
      `${SAMPLES_URL}?` +
      new URLSearchParams({
        geometry,
        geometryType: 'esriGeometryMultipoint',
        returnFirstValueOnly: 'true',
        f: 'json',
        sampleCount: String(chunk.length),
      });

    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`3DEP ${res.status} ${res.statusText}`);
    const json = await res.json();
    const samples = json.samples ?? [];
    if (samples.length !== chunk.length) {
      throw new Error(`3DEP returned ${samples.length} samples for ${chunk.length} points`);
    }
    // Metres in, feet out.
    for (const s of samples) out.push(Number(s.value) * 3.28084);
    process.stdout.write(`\r  sampled ${out.length}/${points.length}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  process.stdout.write('\n');
  return out;
}

/* ---------- Gain --------------------------------------------------------- */

/**
 * Total climb, with a threshold.
 *
 * THIS IS THE PART THAT GOES WRONG IF YOU DO IT NAIVELY. Summing every positive
 * difference between consecutive DEM samples counts the DEM's own noise as
 * climbing, and over thousands of samples that inflates the figure enormously:
 * a 1m DEM sampled every 50 ft can easily manufacture several thousand feet of
 * imaginary gain on a flat towpath.
 *
 * The standard fix, and what a GPS watch does internally, is to require a
 * sustained rise before counting it. Only a run of ascent totalling more than
 * `thresholdFt` is banked, so sensor and DEM jitter cancel instead of
 * accumulating. 10 ft is a common choice and is used here.
 *
 * The race publishes 10,726 ft. That figure is the cross-check: a reconstructed
 * route whose computed gain lands far from it is a reconstruction that is wrong,
 * and should be discarded rather than published.
 */
function computeGain(elevations, thresholdFt = 10) {
  let gain = 0;
  let loss = 0;
  let ref = elevations[0];

  for (const e of elevations.slice(1)) {
    const d = e - ref;
    if (d >= thresholdFt) {
      gain += d;
      ref = e;
    } else if (d <= -thresholdFt) {
      loss += -d;
      ref = e;
    }
    // Inside the band: hold the reference. A slow steady climb still banks,
    // because the reference does not move until the cumulative rise clears the
    // threshold, so gradual ascent is measured rather than filtered away.
  }
  return { gain, loss };
}

/* ---------- Main --------------------------------------------------------- */

async function main() {
  const track = readTrack(resolve(process.cwd(), file));
  const closed = haversineFt(track[0], track[track.length - 1]) < 300;
  console.log(`Track: ${track.length} points, ${closed ? 'closed loop' : 'point to point'}`);

  const dense = densify(track, 50);
  let total = 0;
  for (let i = 1; i < dense.length; i += 1) total += haversineFt(dense[i - 1], dense[i]);
  console.log(`Resampled to ${dense.length} points at 50 ft spacing`);
  console.log(`Length: ${(total / 5280).toFixed(2)} miles\n`);

  console.log('Sampling USGS 3DEP (1 m LiDAR over Ohio)...');
  const elev = await sampleElevations(dense);

  const { gain, loss } = computeGain(elev);
  const lo = Math.min(...elev);
  const hi = Math.max(...elev);

  console.log(
    `\nElevation ${lo.toFixed(0)} to ${hi.toFixed(0)} ft (relief ${(hi - lo).toFixed(0)} ft)`,
  );
  console.log(`Gain ${gain.toFixed(0)} ft, loss ${loss.toFixed(0)} ft, per lap`);

  if (loopArg) {
    const [long, short] = loopArg.split(',').map(Number);
    console.log(
      `\nIf this is one long loop: ${long} long + ${short} short would need the short loop too.`,
    );
  }
  console.log(`\nCross-check: the race publishes 10,726 ft for the full 50K.`);
  console.log('A reconstruction far from that figure is wrong and should not be published.');

  // Downsample for the page. The SVG is ~1400px wide, so more than a few
  // hundred points is bytes nobody can see.
  const STEP = Math.max(1, Math.floor(dense.length / 400));
  const points = [];
  let dist = 0;
  for (let i = 0; i < dense.length; i += 1) {
    if (i > 0) dist += haversineFt(dense[i - 1], dense[i]);
    if (i % STEP === 0) points.push([Number((dist / 5280).toFixed(3)), Number(elev[i].toFixed(1))]);
  }

  const profile = {
    _type: 'elevationProfile',
    source: 'USGS 3DEP 1m LiDAR, sampled along a supplied GPS track',
    sampledAt: new Date().toISOString(),
    miles: Number((total / 5280).toFixed(2)),
    gainFt: Math.round(gain),
    lowFt: Math.round(lo),
    highFt: Math.round(hi),
    points: points.map(([m, e]) => ({
      _type: 'elevPoint',
      _key: `p${m}`.replace('.', '_'),
      mile: m,
      ft: e,
    })),
  };

  if (!WRITE) {
    console.log(`\n${profile.points.length} profile points ready. Re-run with --write to save.`);
    return;
  }

  const projectId = env.PUBLIC_SANITY_PROJECT_ID;
  const token = env.SANITY_API_WRITE_TOKEN;
  if (!projectId || !token) {
    console.log('\nPUBLIC_SANITY_PROJECT_ID and SANITY_API_WRITE_TOKEN are required to write.');
    process.exit(0);
  }
  const client = createClient({
    projectId,
    dataset: env.PUBLIC_SANITY_DATASET ?? 'production',
    token,
    apiVersion: '2026-05-01',
    useCdn: false,
  });
  await client.patch('race').set({ elevationProfile: profile }).commit();
  console.log('\nWritten to the race document. The site will use it on the next build.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
