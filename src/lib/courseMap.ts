// Safe to edit by hand
// =============================================================================
// courseMap - types for the derived course data
// =============================================================================
// scripts/build-course-map.mjs writes two files: course-geo.json (the route as
// GeoJSON, in lon/lat, which MapLibre reads directly) and course-map.json (the
// derived facts the PAGE states, chiefly which trails the course runs on).
//
// This module used to carry a small cartography library as well: viewBox
// fitting, SVG path building, label placement and angle flipping, zoom tiers
// and a scale bar. All of it existed to drive a hand-drawn SVG basemap, and all
// of it went when the map became MapLibre, which does those jobs natively and
// correctly. Deleting working, tested code is the right call when its only
// consumer is gone: the tests would otherwise keep passing forever while
// guarding nothing.
// =============================================================================

/** A point in the data file's frame: feet, x east, y north. */
export type FeetPoint = [number, number];

export interface CourseLoopSummary {
  index: number;
  kind: 'long' | 'short';
  miles: number;
}

export interface CourseMapMeta {
  attribution: { osm: string; usgs: string };
  bounds: { west: number; south: number; east: number; north: number };
  loops: CourseLoopSummary[];
  trailsUsed: { name: string; percent: number }[];
  fit: { medianFt: number; p90Ft: number };
}
