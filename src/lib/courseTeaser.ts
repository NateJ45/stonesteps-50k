// Safe to edit by hand
// =============================================================================
// courseTeaser - the home page's course plate, drawn from the recorded run
// =============================================================================
// CoursePosterBand used to show a screenshot of the 3D map. This module is what
// replaced the screenshot: it turns the SAME recorded GPS run the real map uses
// (scripts/data/course-profile.json, one row per fix) into the handful of SVG
// shapes the plate draws, so the plate can never disagree with /course.
//
// WHAT THE DATA SAYS, and why the plate has two routes and not seven. The race
// is a long loop and a short loop run long, short, long, short, long, short,
// long. The recorded laps of each kind sit on top of each other (measured: the
// mean gap between lap 1 and lap 3 is about 50 ft, which is GPS noise), so
// drawing seven lines gives one thick smear. Two routes are drawn, from laps 1
// and 2; every lap still keeps its OWN elevation profile, because that is the
// part that differs and the part a runner cares about.
//
// WHAT IT DELIBERATELY DOES NOT STATE: climb per lap. The GPS-derived figure
// (about 1,000 ft a long lap, 6,000 ft all day) disagrees with the race's
// published number, and a teaser is the wrong place to open that argument. Miles
// are the published ones (5.3 and 3.2), and the elevations stated are the
// recorded low and high, which the map page states too.
//
// Pure functions, no DOM, so the unit test can pin the geometry.
// =============================================================================

/** The four derived files the plate reads. The component imports them; the test reads them from disk. */
export interface TeaserSource {
  profile: { points: number[][] };
  courseMap: { loops: { index: number; kind: string; startMile: number }[]; stoneSteps: number[] };
  grade: {
    features: {
      properties: { grade: number; loop: number };
      geometry: { coordinates: number[][] };
    }[];
  };
  miles: { features: { properties: { kind: string }; geometry: { coordinates: number[] } }[] };
}

/** One recorded fix: lon, lat, elevation ft, mile from the start, grade %, lap. */
type Fix = [number, number, number, number, number, number];

export type LapKind = 'long' | 'short';

export interface TeaserLap {
  index: number;
  kind: LapKind;
  /** Published distance, the number the race states. */
  miles: number;
  /** Where the lap starts on the all-day clock, for the readout. */
  startMile: number;
  /** The recorded length, which the all-day mile marker is measured in. */
  spanMiles: number;
  lowFt: number;
  highFt: number;
  /** [fraction of the lap, elevation ft] at even spacing, for scrubbing and the sparkline. */
  samples: [number, number][];
}

export interface TeaserLabel {
  key: 'oval' | 'steps' | 'low' | 'high';
  text: string;
  detail: string;
  /** Percent of the plate, so HTML labels sit on the SVG at any size. */
  left: number;
  top: number;
}

export interface CourseTeaser {
  width: number;
  height: number;
  routes: Record<LapKind, string>;
  steep: Record<LapKind, string>;
  mileDots: { kind: LapKind; x: number; y: number }[];
  laps: TeaserLap[];
  labels: TeaserLabel[];
  /** 1 mile in SVG units, for the scale bar. */
  mileUnits: number;
  /** Lowest and highest recorded elevation, ft. */
  lowFt: number;
  highFt: number;
}

const WIDTH = 1000;
const PAD = 0.07;
const SAMPLES = 48;
/** The published distances (course-map.json's `publishedMiles`), by kind. */
const PUBLISHED: Record<LapKind, number> = { long: 5.3, short: 3.2 };
/** A pitch steep enough to be worth lighting up. The Stone Steps are 39. */
export const STEEP_PERCENT = 18;

export function buildCourseTeaser(source: TeaserSource): CourseTeaser {
  const { courseMap, grade, miles } = source;
  const fixes = source.profile.points as Fix[];
  const byLap = new Map<number, Fix[]>();
  for (const f of fixes) {
    const list = byLap.get(f[5]) ?? [];
    list.push(f);
    byLap.set(f[5], list);
  }

  // Equirectangular at the course's own latitude: at 39 degrees a degree of
  // longitude is cos(lat) of a degree of latitude, and over four miles that is
  // the whole projection.
  let west = Infinity;
  let east = -Infinity;
  let south = Infinity;
  let north = -Infinity;
  for (const f of fixes) {
    west = Math.min(west, f[0]);
    east = Math.max(east, f[0]);
    south = Math.min(south, f[1]);
    north = Math.max(north, f[1]);
  }
  const kx = Math.cos((((south + north) / 2) * Math.PI) / 180);
  const spanX = (east - west) * kx;
  const spanY = north - south;
  const scale = (WIDTH * (1 - PAD * 2)) / spanX;
  const HEIGHT = Math.round(spanY * scale + WIDTH * PAD * 2);
  const project = (lon: number, lat: number): [number, number] => [
    WIDTH * PAD + (lon - west) * kx * scale,
    WIDTH * PAD + (north - lat) * scale,
  ];
  // Miles per degree of latitude is about 69.05; the scale bar is one mile.
  const mileUnits = scale / 69.05;

  const toPath = (pts: [number, number][]) =>
    pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');

  const lapFixes = (kind: LapKind) => byLap.get(kind === 'long' ? 1 : 2) ?? [];
  const routes = {
    long: toPath(lapFixes('long').map((f) => project(f[0], f[1]))),
    short: toPath(lapFixes('short').map((f) => project(f[0], f[1]))),
  };

  // Steep runs: consecutive grade segments over the threshold, merged into one
  // sub-path so there are a dozen shapes and not a hundred.
  const steepFor = (loop: number) => {
    const parts: string[] = [];
    let open: [number, number][] = [];
    const flush = () => {
      if (open.length > 1) parts.push(toPath(open));
      open = [];
    };
    for (const feat of grade.features) {
      if (feat.properties.loop !== loop) continue;
      if (feat.properties.grade < STEEP_PERCENT) {
        flush();
        continue;
      }
      const [a, b] = feat.geometry.coordinates.map(([lon, lat]) => project(lon, lat));
      const last = open[open.length - 1];
      if (!last || Math.hypot(last[0] - a[0], last[1] - a[1]) > 1) {
        flush();
        open.push(a);
      }
      open.push(b);
    }
    flush();
    return parts.join('');
  };
  const steep = { long: steepFor(1), short: steepFor(2) };

  const laps: TeaserLap[] = [];
  for (const meta of courseMap.loops) {
    const pts = byLap.get(meta.index) ?? [];
    if (!pts.length) continue;
    const kind = meta.kind as LapKind;
    const total = pts[pts.length - 1][3] - pts[0][3] || 1;
    const samples: [number, number][] = [];
    for (let i = 0; i < SAMPLES; i++) {
      const t = i / (SAMPLES - 1);
      const target = pts[0][3] + t * total;
      let j = 1;
      while (j < pts.length - 1 && pts[j][3] < target) j++;
      const a = pts[j - 1];
      const b = pts[j];
      const span = b[3] - a[3] || 1;
      const u = Math.min(1, Math.max(0, (target - a[3]) / span));
      samples.push([Number(t.toFixed(4)), Math.round(a[2] + (b[2] - a[2]) * u)]);
    }
    const els = pts.map((p) => p[2]);
    laps.push({
      index: meta.index,
      kind,
      miles: PUBLISHED[kind],
      startMile: meta.startMile,
      spanMiles: Number(total.toFixed(3)),
      lowFt: Math.min(...els),
      highFt: Math.max(...els),
      samples,
    });
  }

  const pct = ([x, y]: [number, number]) => ({
    left: Number(((x / WIDTH) * 100).toFixed(2)),
    top: Number(((y / HEIGHT) * 100).toFixed(2)),
  });
  const extreme = (pts: Fix[], pick: 'min' | 'max') =>
    pts.reduce((best, p) =>
      pick === 'min' ? (p[2] < best[2] ? p : best) : p[2] > best[2] ? p : best,
    );

  const longFixes = lapFixes('long');
  const shortFixes = lapFixes('short');
  const low = extreme(longFixes, 'min');
  const high = extreme(shortFixes, 'max');
  const oval = longFixes[0];
  const steps = courseMap.stoneSteps;

  const labels: TeaserLabel[] = [
    {
      key: 'oval',
      text: 'The Oval',
      detail: 'Start and every finish',
      ...pct(project(oval[0], oval[1])),
    },
    { key: 'steps', text: 'Stone Steps', detail: '39% grade', ...pct(project(steps[0], steps[1])) },
    { key: 'low', text: `${low[2]} ft`, detail: 'Creek bottom', ...pct(project(low[0], low[1])) },
    {
      key: 'high',
      text: `${high[2]} ft`,
      detail: 'Top of the ridge',
      ...pct(project(high[0], high[1])),
    },
  ];

  const mileDots = miles.features.map((f) => {
    const [x, y] = project(f.geometry.coordinates[0], f.geometry.coordinates[1]);
    return { kind: f.properties.kind as LapKind, x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  });

  return {
    width: WIDTH,
    height: HEIGHT,
    routes,
    steep,
    mileDots,
    laps,
    labels,
    mileUnits,
    lowFt: Math.min(...fixes.map((f) => f[2])),
    highFt: Math.max(...fixes.map((f) => f[2])),
  };
}

/** A lap's profile as an SVG path in a `w` by `h` box, on a shared elevation range. */
export function sparkPath(
  samples: [number, number][],
  lowFt: number,
  highFt: number,
  w: number,
  h: number,
): string {
  const range = highFt - lowFt || 1;
  return samples
    .map(([t, ele], i) => {
      const x = (t * w).toFixed(1);
      const y = (h - ((ele - lowFt) / range) * h).toFixed(1);
      return `${i ? 'L' : 'M'}${x},${y}`;
    })
    .join('');
}
