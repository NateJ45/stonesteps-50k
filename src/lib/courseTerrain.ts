// Safe to edit by hand
// =============================================================================
// courseTerrain - the pure maths behind the 3D view
// =============================================================================
// Kept out of the renderer so it can be unit-tested without a WebGL context,
// and so the renderer is left holding only the things that genuinely need a
// GPU. Everything here is arithmetic on the committed heightfield.
// =============================================================================

export interface TerrainData {
  grid: number;
  box: { minX: number; maxX: number; minY: number; maxY: number };
  /** Row-major, `grid * grid` values in feet. Row j runs west to east at y_j. */
  heights: number[];
}

/**
 * The ground height at an arbitrary point, by bilinear interpolation.
 *
 * NEAREST-NEIGHBOUR IS NOT GOOD ENOUGH HERE and the reason is visible rather
 * than theoretical. The heightfield is 96 samples across roughly 7,700 ft, so
 * one cell is about 80 ft of ground. The course is draped onto this surface, and
 * with nearest-neighbour the route would step between cell heights and read as a
 * staircase climbing a smooth hill, which looks like a rendering fault rather
 * than like terrain.
 *
 * Points outside the box are clamped to the edge. The box is built with a 500 ft
 * margin around the course, so this only ever fires on floating-point slop at
 * the boundary, and returning NaN there would punch a hole in the mesh.
 */
export function heightAt(terrain: TerrainData, x: number, y: number): number {
  const { grid, box, heights } = terrain;
  const n = grid - 1;
  const fx = ((x - box.minX) / (box.maxX - box.minX)) * n;
  const fy = ((y - box.minY) / (box.maxY - box.minY)) * n;

  const cx = Math.min(n, Math.max(0, fx));
  const cy = Math.min(n, Math.max(0, fy));

  const i0 = Math.min(n - 1, Math.floor(cx));
  const j0 = Math.min(n - 1, Math.floor(cy));
  const tx = cx - i0;
  const ty = cy - j0;

  const at = (i: number, j: number) => heights[j * grid + i] ?? 0;

  const h00 = at(i0, j0);
  const h10 = at(i0 + 1, j0);
  const h01 = at(i0, j0 + 1);
  const h11 = at(i0 + 1, j0 + 1);

  return h00 * (1 - tx) * (1 - ty) + h10 * tx * (1 - ty) + h01 * (1 - tx) * ty + h11 * tx * ty;
}

/** The lowest and highest samples, for colouring and for the camera framing. */
export function heightRange(terrain: TerrainData): { lo: number; hi: number } {
  let lo = Infinity;
  let hi = -Infinity;
  for (const h of terrain.heights) {
    if (h < lo) lo = h;
    if (h > hi) hi = h;
  }
  return { lo, hi };
}

/**
 * How much to stretch the vertical axis.
 *
 * TERRAIN AT TRUE SCALE LOOKS LIKE A PLATE. Mt. Airy's relief across the course
 * box is about 370 ft over roughly 7,700 ft of ground, so the hills are under 5%
 * of the width and at honest proportions the model reads as flat. Every
 * topographic visualisation exaggerates for this reason.
 *
 * The exaggeration is DERIVED rather than typed, so it does the right thing for
 * a flatter or steeper course without anybody retuning it: aim for the relief to
 * occupy a fixed fraction of the box, and clamp so a genuinely mountainous
 * course is not flattened and a billiard table is not turned into the Alps.
 *
 * It is also the reason the view has to say it is exaggerated. A 3D picture of
 * terrain is read as a measurement unless it says otherwise, exactly like the
 * elevation profile's caption.
 */
export function verticalExaggeration(
  terrain: TerrainData,
  targetFraction = 0.22,
  min = 1,
  max = 6,
): number {
  const { lo, hi } = heightRange(terrain);
  const relief = hi - lo;
  if (relief <= 0) return min;
  const span = Math.min(terrain.box.maxX - terrain.box.minX, terrain.box.maxY - terrain.box.minY);
  const wanted = (span * targetFraction) / relief;
  return Math.min(max, Math.max(min, wanted));
}
