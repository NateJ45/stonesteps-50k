# Course map: 2D and 3D, from the track rather than from the artwork

2026-09-16. Dave supplied a GPX of the 50K and permission to use both it and
Cincinnati Parks' trail map. This is the design for putting the course on a map
that a visitor can move around, in two and three dimensions.

## The finding that set the approach

The obvious plan was to draw the course onto Parks' current trail map. It does
not work, and the measurement is worth keeping so nobody retries it.

Registering the 2017 Parks PDF against Dave's track was attempted three ways:
an unconstrained similarity fit, the same with Bezier curves properly flattened
(the first pass sampled control points, which do not lie on the curve), and a
constrained fit holding rotation near north-up with translation searched on a
real grid rather than seeded from bounding-box centres. The best of the three
lands at **112 ft median error, 453 ft at the 90th percentile**, and the scale
parameter drifts to the edge of the search range, which is the signature of an
optimiser minimising by squashing the track into dense blobs rather than finding
an alignment. Trails in Mt. Airy are frequently closer together than that, so a
course line drawn on this basemap would sit confidently on the wrong trail.

This is the same result PENDING entry 11 records for the 1998 race map, and the
same cause: both are cartography, drawn for legibility, not surveys.

OpenStreetMap needs no registration, because it is already in real coordinates.
Dave's track sits a **median of 15.2 ft** from the nearest OSM way, 37 ft at the
90th percentile, with no fitting of any kind. That is GPS noise under canopy.
93% of course samples fall within 60 ft of a *named* trail.

So the basemap is rendered from OSM geometry and USGS 3DEP elevation, in the
site's own colours. Accurate by construction, no registration step that can go
stale, no copyright question, and one dataset feeds both the 2D and the 3D view.

**The permission is still used.** The Parks map is the reference that lets us
label trails correctly and stays on the page as the official printable version.

### What the track says the course runs on

Derived, not typed. This answers the question PENDING entry 11 says the site
does not record.

| Share | Trail |
| --- | --- |
| 16.0% | Ponderosa Trail (B) |
| 15.6% | Furnas Trail (F) |
| 8.7% | Trail Ridge Road |
| 8.3% | Quarry Trail (D) |
| 7.2% | Cedar Trail (L) |
| 6.8% | Red Oak Trail (C) |
| 5.4% | Colerain Trail (A) |
| 4.6% | Beechwood Trail (H) |
| 3.8% | Lingo Trail (K) |
| 3.7% | Blue Spruce Trail (J) |
| 3.0% | Twin Bridge Trail (G) |
| 2.6% | Arboretum Trail (E) |

Plus an E Trail and some unnamed connectors. The letter codes match the Parks
map's own, so the two cross-reference even though we do not draw on it.

## Architecture

### 1. Build-time pipeline

`scripts/build-course-map.mjs` emits committed data files so the site build
never touches the network, matching the existing `sanityFetch` discipline that
lets a fresh clone build with nothing configured.

- `scripts/data/course-map.json` — the course polyline simplified
  (Douglas-Peucker) and split into its seven loops using the lap boundaries the
  elevation script already derives; the named OSM trail network clipped to a box
  around the course; the trail attribution table above.
- `scripts/data/course-terrain.json` — a 3DEP heightfield over the course
  bounding box, for the 3D scene.

Three required properties, each borrowed from a convention already in the repo:
network responses are cached so re-runs are cheap; output is **deterministic**,
so a re-run with unchanged inputs rewrites byte-identical files (the `npm run
mud` rule); and the outputs are committed.

`scripts/lib/course.mjs` is extracted from `build-elevation.mjs`: GPX/GeoJSON
reading, `haversineFt`, `densify`, 3DEP sampling and `findLaps`. Both scripts
import it. Two copies of `findLaps` that can disagree about where the loops end
is exactly the drift this repo keeps writing tests to prevent.

### 2. The 2D map

Inline **SVG generated at build time**, not an image. The trails and the course
are real elements, so they theme in light and dark through the existing CSS
variables, stay crisp at any zoom without tiles, and print.

Pan and zoom is a small React island applying a transform to an SVG group: drag
to pan, wheel and pinch to zoom, a reset control, arrow keys to pan and `+`/`-`
to zoom. Written by hand rather than taking a dependency, because the
interaction is translate-and-scale on an element we own. If cross-browser pinch
proves ugly, taking a small library is the fallback and is a decision to raise,
not to make silently.

**Trail labels are gated on zoom.** At fit-to-view the map shows the course, the
loops and The Oval; labels fade in past a zoom threshold so the default view is
not a wall of text. The trail list beside it is the accessible version and
carries the percentages, so the information is fully available to a screen
reader and to anyone who never touches the map. The map takes `role="img"` with
a description; the list does the real work.

### 3. The 3D view

Orbit, not flythrough: the Mt. Airy terrain as a surface with the course ribbon
on it, drag to rotate, scroll to zoom.

It loads **on demand**. The 2D map is what the page ships; a "See it in 3D"
control fetches the WebGL chunk only when pressed, so the page's measured load
never pays for it and the Lighthouse budget is untouched. Reduced-motion and
absent-WebGL both fall back to the 2D map with the control hidden, because a
3D view is an enhancement and the flat map already carries the information.

The renderer dependency is a separate decision and is NOT taken in this spec.

### 4. Page integration

A new `courseMapSection` block type on the page builder, which in this repo
means: `sections.ts` (and so `SECTION_TYPES` / `SECTION_INSERT_MENU`),
`SectionRenderer.astro`, `sectionsProjection()` in `queries.ts`,
`pageBuilder.types.ts`, `npm run typegen`, and the `section-fields.ts` registry
whose drift test fails until it agrees. No colour or surface field, per
CLAUDE.md rule 9 and the test that enforces it.

The section carries editorial fields only (eyebrow, headline, intro). The
geometry comes from the committed data file, never from Sanity: it is derived
data, and a number an editor can retype is a number that can disagree with the
map.

### 5. Testing and budgets

- Unit tests on the pure logic: Douglas-Peucker simplification, the loop split,
  the trail-attribution tally, and the SVG viewBox fit. `node --test`, beside
  the existing 25 suites.
- `npm run parity compare` on the build, since everything else must stay
  render-neutral.
- Playwright: the section renders, axe passes in both themes, and the map is
  operable by keyboard.
- Lighthouse: accessibility stays a hard 100. The 3D chunk must not appear in
  the initial load of `/course`.

## Deliberately not in scope

- No tile service, no map provider, no runtime API key.
- No live location dot. It is a race-day feature and a permissions prompt.
- No editing the course in the Studio. The track is the source.
- No replacing the existing Parks course-map image. It stays as the printable
  official reference.
