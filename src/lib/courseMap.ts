// Safe to edit by hand
// =============================================================================
// courseMap - turning the committed course data into something an SVG can draw
// =============================================================================
// scripts/build-course-map.mjs writes feet, x east and y NORTH, relative to a
// frame centred on the track. An SVG wants viewBox units with y growing DOWN.
// This module is the one place that conversion happens, so the route, the
// trails, the terrain and the labels cannot end up in four slightly different
// coordinate systems.
//
// Everything here is pure and unit-tested. The Astro component does the
// drawing, the island does the panning, and neither one does arithmetic.
// =============================================================================

/** A point in the data file's frame: feet, x east, y north. */
export type FeetPoint = [number, number];

export interface CourseLoop {
  index: number;
  kind: 'long' | 'short';
  miles: number;
  points: FeetPoint[];
}

export interface CourseTrail {
  name: string | null;
  kind: string | null;
  points: FeetPoint[];
}

export interface CourseMapData {
  frame: { lat0: number; lon0: number };
  loops: CourseLoop[];
  trails: CourseTrail[];
  trailsUsed: { name: string; percent: number }[];
  fit: { medianFt: number; p90Ft: number };
}

export interface ViewBox {
  minX: number;
  minY: number;
  width: number;
  height: number;
  /** Feet per viewBox unit. 1 here, but named so the maths reads. */
  scale: number;
}

/**
 * The viewBox that frames the course, with padding, at a given aspect ratio.
 *
 * THE ASPECT RATIO IS HONOURED BY GROWING, NEVER BY SQUASHING. The course box
 * is whatever shape the course is; the canvas is whatever shape the layout
 * gives it. Scaling x and y independently to make one fit the other would
 * distort every angle on the map, and on a map of a real place that is simply
 * a wrong drawing. So the shorter axis is EXPANDED to match, which shows a
 * little more of the surrounding park and keeps north square.
 */
export function fitViewBox(points: FeetPoint[], aspect: number, padFt = 300): ViewBox {
  if (points.length === 0) {
    return { minX: 0, minY: 0, width: 1, height: 1, scale: 1 };
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  minX -= padFt;
  maxX += padFt;
  minY -= padFt;
  maxY += padFt;

  let width = maxX - minX;
  let height = maxY - minY;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  if (width / height < aspect) {
    width = height * aspect;
  } else {
    height = width / aspect;
  }

  return {
    // y is flipped into SVG space by toSvg, so the viewBox's minY is derived
    // from the NORTH edge: -(cy + height / 2).
    minX: cx - width / 2,
    minY: -(cy + height / 2),
    width,
    height,
    scale: 1,
  };
}

/** Feet (y north) to SVG user units (y down). The only place the flip happens. */
export function toSvg([x, y]: FeetPoint): [number, number] {
  return [x, -y];
}

/**
 * An SVG path `d` for a run of points.
 *
 * Coordinates are rounded to one decimal. At the scales this draws, a tenth of
 * a foot is far below a pixel, and the full float expansion roughly triples the
 * size of the markup for nothing a reader can see.
 */
export function toPath(points: FeetPoint[]): string {
  if (points.length === 0) return '';
  return points
    .map((p, i) => {
      const [x, y] = toSvg(p);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

/**
 * Where a trail's label goes, and which way up it reads.
 *
 * The label sits at the trail's MIDPOINT BY LENGTH rather than at its middle
 * vertex, because OSM ways are not evenly sampled and a way with fifty points
 * clustered at one end would otherwise label itself in the cluster.
 *
 * The angle comes from the segment the midpoint falls on, flipped when it would
 * put the text upside down. A map label that reads right to left is worse than
 * no label.
 */
export function labelPlacement(
  points: FeetPoint[],
): { x: number; y: number; angle: number } | null {
  if (points.length < 2) return null;

  const lengths: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const d = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    lengths.push(d);
    total += d;
  }
  if (total === 0) return null;

  let walked = 0;
  for (let i = 0; i < lengths.length; i += 1) {
    if (walked + lengths[i] >= total / 2) {
      const t = lengths[i] === 0 ? 0 : (total / 2 - walked) / lengths[i];
      const a = points[i];
      const b = points[i + 1];
      const fx = a[0] + (b[0] - a[0]) * t;
      const fy = a[1] + (b[1] - a[1]) * t;
      const [x, y] = toSvg([fx, fy]);
      // atan2 in SVG space, so the angle is already in the drawing's terms.
      let angle = (Math.atan2(-(b[1] - a[1]), b[0] - a[0]) * 180) / Math.PI;
      if (angle > 90) angle -= 180;
      if (angle < -90) angle += 180;
      return { x, y, angle };
    }
    walked += lengths[i];
  }
  return null;
}

/**
 * Which trails are worth labelling at all.
 *
 * A short connector stub gets a label longer than the trail, which reads as
 * clutter rather than as information. Anything under `minFt` of drawn length is
 * left unlabelled; it is still drawn, and the list beside the map still names
 * every trail the course uses.
 */
export function labelWorthy(trails: CourseTrail[], minFt = 600): CourseTrail[] {
  return trails.filter((t) => {
    if (!t.name) return false;
    let total = 0;
    for (let i = 1; i < t.points.length; i += 1) {
      total += Math.hypot(t.points[i][0] - t.points[i - 1][0], t.points[i][1] - t.points[i - 1][1]);
    }
    return total >= minFt;
  });
}

/**
 * De-duplicate labels by name.
 *
 * OSM splits a named trail into many ways wherever a tag changes, so
 * "Ponderosa Trail (B)" is nine separate ways and would print nine times.
 * Keep the longest run of each name: it is the one with room for the text.
 */
export function oneLabelPerName(trails: CourseTrail[]): CourseTrail[] {
  const best = new Map<string, { len: number; trail: CourseTrail }>();
  for (const t of trails) {
    if (!t.name) continue;
    let len = 0;
    for (let i = 1; i < t.points.length; i += 1) {
      len += Math.hypot(t.points[i][0] - t.points[i - 1][0], t.points[i][1] - t.points[i - 1][1]);
    }
    const prev = best.get(t.name);
    if (!prev || len > prev.len) best.set(t.name, { len, trail: t });
  }
  return [...best.values()].map((v) => v.trail);
}
