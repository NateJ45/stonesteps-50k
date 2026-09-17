// Safe to edit by hand
// =============================================================================
// courseFlyover - the pure maths behind the flyover and the linked profile
// =============================================================================
// Kept out of the component so it can be unit-tested without a map, a canvas or
// a browser. What is left in CourseMapLibre.tsx is the part that genuinely has
// to talk to MapLibre.
// =============================================================================

/** One route vertex: lon, lat, elevation ft, mile into the race, grade %, loop. */
export type ProfilePoint = [number, number, number, number, number, number];

export const LON = 0;
export const LAT = 1;
export const ELE = 2;
export const MILE = 3;
export const GRADE = 4;
export const LOOP = 5;

/**
 * Where along the route a given mile falls, as a fractional index.
 *
 * BINARY SEARCH, because this runs on every animation frame and on every
 * pointer move over the profile. A linear scan of 972 points is fine once and
 * wasteful sixty times a second; at that rate it is the difference between a
 * flyover that holds 60fps and one that stutters on a phone.
 *
 * Returns a FRACTIONAL index so the caller can interpolate between vertices
 * rather than snapping to the nearest one, which would make the camera advance
 * in visible steps on the long straight sections where vertices are far apart.
 */
export function indexAtMile(points: ProfilePoint[], mile: number): number {
  if (points.length === 0) return 0;
  const first = points[0][MILE];
  const last = points[points.length - 1][MILE];
  if (mile <= first) return 0;
  if (mile >= last) return points.length - 1;

  let lo = 0;
  let hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid][MILE] <= mile) lo = mid;
    else hi = mid;
  }
  const span = points[hi][MILE] - points[lo][MILE];
  return span <= 0 ? lo : lo + (mile - points[lo][MILE]) / span;
}

/** Linear interpolation between two vertices at a fractional index. */
export function sampleAt(points: ProfilePoint[], index: number): ProfilePoint {
  if (points.length === 0) return [0, 0, 0, 0, 0, 1];
  const i = Math.max(0, Math.min(points.length - 1, index));
  const a = points[Math.floor(i)];
  const b = points[Math.min(points.length - 1, Math.ceil(i))];
  const t = i - Math.floor(i);
  if (a === b || t === 0) return a;
  return [
    a[LON] + (b[LON] - a[LON]) * t,
    a[LAT] + (b[LAT] - a[LAT]) * t,
    a[ELE] + (b[ELE] - a[ELE]) * t,
    a[MILE] + (b[MILE] - a[MILE]) * t,
    a[GRADE] + (b[GRADE] - a[GRADE]) * t,
    // A loop number is a label, not a quantity: halfway between loop 3 and
    // loop 4 is still loop 3 until you have actually crossed into 4.
    a[LOOP],
  ];
}

/*
 * THE BEARING HELPERS LIVED HERE and were removed on 2026-09-17, when the
 * flyover stopped chasing the direction of travel and locked to north. They
 * were bearingBetween, bearingAt, angleDelta and easeBearing, and the reasoning
 * in them (look ahead by DISTANCE not by vertex count, and ease the short way
 * round the compass) is worth reading in the history if heading-follow ever
 * comes back. Keeping four tested but uncalled functions in the shipped module
 * would be carrying a feature nobody can see.
 */

/**
 * How far along the route a flyover should be, given elapsed time.
 *
 * Constant GROUND SPEED, not constant index rate. Stepping the index at a fixed
 * rate would race through the simplified straights and crawl through the
 * switchbacks, because those are exactly where the vertices bunch up.
 */
export function mileAtElapsed(
  totalMiles: number,
  seconds: number,
  durationSeconds: number,
): number {
  if (durationSeconds <= 0) return totalMiles;
  return Math.max(0, Math.min(totalMiles, (seconds / durationSeconds) * totalMiles));
}

/**
 * How fast a runner moves on a given gradient, as a multiple of their flat
 * speed.
 *
 * THIS IS A MODEL, NOT DAVE'S WATCH. The GPX he sent carries no timestamps at
 * all (22,412 track points, zero <time> elements, which is what Strava exports
 * for a route rather than an activity), so his real pace is not available. The
 * shape below is the standard one from the literature on the energy cost of
 * gradient running: climbing costs steeply and roughly linearly, descending
 * buys speed up to about 12% and then starts costing again as braking takes
 * over. The constants are chosen for a technical trail rather than a track.
 *
 * If a timed file ever arrives, this function is the only thing that has to
 * change: everything downstream asks it how long a stretch should take.
 */
export function gradeSpeedFactor(gradePct: number): number {
  const g = Math.max(-40, Math.min(40, gradePct));
  let cost: number;
  if (g >= 0) {
    // Uphill: about 60% slower at 10%, and by 20% most of this field is
    // walking, which is what the flattening second term stands in for.
    cost = 1 + 0.06 * g + 0.0016 * g * g;
  } else if (g > -12) {
    // Downhill, still free speed.
    cost = 1 + 0.028 * g;
  } else {
    // Past about 12% down, braking costs more than gravity gives back. This
    // course touches -38%, and the steps are not run fast.
    cost = 0.664 + 0.022 * (-g - 12);
  }
  // A flyover that crawls is as bad as one that rockets: the clamp keeps the
  // whole range inside something watchable.
  return 1 / Math.max(0.62, Math.min(2.6, cost));
}

/**
 * Cumulative EFFORT along the course, in flat-mile equivalents.
 *
 * The flyover used to advance at a constant ground speed, which is honest about
 * distance and wrong about running: it crossed the steepest climb on the course
 * at the same rate as the road round The Oval. Weighting each step by
 * gradeSpeedFactor means the camera slows on the climbs and runs the descents,
 * and because the total is normalised the whole flight still takes exactly as
 * long as it did.
 */
export function buildPacing(pts: ProfilePoint[]): number[] {
  const cum = new Array<number>(pts.length);
  cum[0] = 0;
  for (let i = 1; i < pts.length; i += 1) {
    const d = pts[i][MILE] - pts[i - 1][MILE];
    // The grade of the step being taken, not of the point being left.
    const g = (pts[i][GRADE] + pts[i - 1][GRADE]) / 2;
    cum[i] = cum[i - 1] + Math.max(0, d) / gradeSpeedFactor(g);
  }
  return cum;
}

/**
 * The mile the camera should be at, `seconds` into a flight that starts at
 * `fromMile` and lasts `durationSeconds`, paced by the course's gradient.
 *
 * Binary search over the cumulative effort, then interpolate within the step,
 * so the camera moves smoothly rather than snapping between samples.
 */
export function pacedMileAtElapsed(
  pts: ProfilePoint[],
  cum: number[],
  fromMile: number,
  seconds: number,
  durationSeconds: number,
): number {
  if (!pts.length) return 0;
  const lastMile = pts[pts.length - 1][MILE];
  if (durationSeconds <= 0) return lastMile;

  const startEffort = effortAtMile(pts, cum, fromMile);
  const endEffort = cum[cum.length - 1];
  const span = endEffort - startEffort;
  if (span <= 0) return lastMile;

  const t = Math.max(0, Math.min(1, seconds / durationSeconds));
  const target = startEffort + t * span;

  let lo = 0;
  let hi = cum.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= target) lo = mid;
    else hi = mid;
  }
  const denom = cum[hi] - cum[lo];
  const f = denom > 0 ? (target - cum[lo]) / denom : 0;
  return pts[lo][MILE] + f * (pts[hi][MILE] - pts[lo][MILE]);
}

/** Cumulative effort at an arbitrary mile, interpolated between samples. */
export function effortAtMile(pts: ProfilePoint[], cum: number[], mile: number): number {
  const i = indexAtMile(pts, mile);
  const lo = Math.floor(i);
  const hi = Math.min(pts.length - 1, lo + 1);
  const f = i - lo;
  return cum[lo] + f * (cum[hi] - cum[lo]);
}

/**
 * How far through a flight the camera is: 0 at the mile it started from, 1 at
 * the finish.
 *
 * MEASURED IN EFFORT, NOT IN MILES. pacedMileAtElapsed maps elapsed time
 * linearly onto cumulative effort, so effort IS elapsed time and a bar drawn
 * from it answers "how much of the ninety seconds is left", which is the
 * question a progress line is asked. A bar drawn from miles would sprint down
 * the descents and stall on the climbs, which is the exact behaviour the
 * gradient pacing was added to get rid of.
 */
export function flightProgress(
  pts: ProfilePoint[],
  cum: number[],
  fromMile: number,
  mile: number,
): number {
  if (pts.length === 0 || cum.length !== pts.length) return 0;
  const start = effortAtMile(pts, cum, fromMile);
  const span = cum[cum.length - 1] - start;
  // Starting at the finish line is a flight with nothing left in it.
  if (span <= 0) return 1;
  return Math.max(0, Math.min(1, (effortAtMile(pts, cum, mile) - start) / span));
}

/**
 * The colour ramp for gradient shading, as MapLibre `interpolate` stops.
 *
 * Centred on zero and symmetric, so flat ground is neutral and the eye reads
 * colour as steepness rather than as direction of travel. The range is clamped
 * at +/-20% because this course touches +38% on the steps themselves: letting
 * one staircase set the scale would wash out the entire rest of the course.
 */
export const GRADE_STOPS: [number, string][] = [
  [-20, '#3b7dd8'],
  [-10, '#6fb1e3'],
  [-3, '#cfe3f2'],
  [0, '#f2efe6'],
  [3, '#f6d68a'],
  [10, '#e2763c'],
  [20, '#a8231a'],
];

/** Flatten GRADE_STOPS into the alternating list a MapLibre expression wants. */
export function gradeExpressionStops(): (number | string)[] {
  return GRADE_STOPS.flat();
}

/**
 * The same ramp, positioned along a 0 to 100% bar for the legend under the map.
 *
 * DERIVED, NOT TYPED OUT AGAIN. The key used to be a seven-colour
 * linear-gradient written into the stylesheet by hand, which is a second copy of
 * the ramp that nothing checks: move a stop on the map and the key goes on
 * describing the old one, silently and in the one place a reader goes to find
 * out what the colours mean. Each stop's position is its own grade, so a stop
 * moved from -10 to -8 moves in the key too, and evenly spacing them (which is
 * what a hand-written gradient does) would have put -3% and 0% a sixth of the
 * bar apart when they are a seventh of a percent of its range.
 */
export function gradeRampStops(): { color: string; pct: number }[] {
  const lo = GRADE_STOPS[0][0];
  const hi = GRADE_STOPS[GRADE_STOPS.length - 1][0];
  const span = hi - lo || 1;
  return GRADE_STOPS.map(([grade, color]) => ({ color, pct: ((grade - lo) / span) * 100 }));
}

/** Those stops as a CSS gradient, left to right. */
export function gradeRampCss(): string {
  return `linear-gradient(to right, ${gradeRampStops()
    .map((s) => `${s.color} ${s.pct.toFixed(1)}%`)
    .join(', ')})`;
}
