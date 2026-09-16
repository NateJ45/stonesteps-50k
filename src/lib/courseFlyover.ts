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

/**
 * Compass bearing from one point to another, in degrees clockwise from north.
 *
 * Used to point the flyover camera down the trail. The great-circle formula
 * rather than a flat atan2 of the coordinate difference: over a mile it makes
 * no practical difference, but the flat version is wrong in a way that grows
 * with latitude and there is no reason to ship the wrong one.
 */
export function bearingBetween(
  [lon1, lat1]: [number, number],
  [lon2, lat2]: [number, number],
): number {
  const r = Math.PI / 180;
  const y = Math.sin((lon2 - lon1) * r) * Math.cos(lat2 * r);
  const x =
    Math.cos(lat1 * r) * Math.sin(lat2 * r) -
    Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos((lon2 - lon1) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
}

/**
 * The bearing the camera should hold at a point on the route.
 *
 * LOOKS AHEAD BY A DISTANCE, not by a fixed number of vertices. The route is
 * simplified, so consecutive vertices are anywhere from a few feet to a few
 * hundred apart; a fixed look-ahead of "three points" swings wildly through
 * switchbacks and barely moves on a straight. Averaging the heading over a
 * fixed distance ahead is what makes the camera read as following a trail
 * rather than being yanked around by it.
 */
export function bearingAt(points: ProfilePoint[], index: number, aheadMiles = 0.06): number {
  const here = sampleAt(points, index);
  const ahead = sampleAt(points, indexAtMile(points, here[MILE] + aheadMiles));
  // At the very end there is nothing ahead; hold the last real heading.
  if (ahead[MILE] <= here[MILE] + 1e-6) {
    const back = sampleAt(points, indexAtMile(points, here[MILE] - aheadMiles));
    return bearingBetween([back[LON], back[LAT]], [here[LON], here[LAT]]);
  }
  return bearingBetween([here[LON], here[LAT]], [ahead[LON], ahead[LAT]]);
}

/**
 * Shortest signed angular difference, for easing a bearing without spinning.
 *
 * THE 359-TO-1 PROBLEM. Interpolating bearings as plain numbers sends the
 * camera the long way round the compass whenever the route crosses north, which
 * on a loop course happens constantly and looks like the map having a seizure.
 */
export function angleDelta(from: number, to: number): number {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

/** Ease a bearing towards a target by a fraction, the short way round. */
export function easeBearing(from: number, to: number, amount: number): number {
  return (from + angleDelta(from, to) * amount + 360) % 360;
}

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
