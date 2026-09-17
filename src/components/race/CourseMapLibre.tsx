// Foundation, edit with care
// =============================================================================
// CourseMapLibre - the course on a real map engine
// =============================================================================
// WHY A MAP ENGINE AND NOT OUR OWN RENDERER. This was a hand-drawn SVG basemap
// and a three.js terrain scene before. Both worked, and both were reimplementing
// things a map engine has solved: paint order over hundreds of translucent
// polygons (which went visibly wrong, blacking the map out past a zoom level),
// label placement, tile-appropriate detail, and a camera. MapLibre does all of
// that, reads GeoJSON directly, and gives smooth zoom, rotate and pitch-into-3D
// from one component.
//
// NO API KEY AND NO TILE BILL, which is the reason for these two sources in
// particular:
//   - USGS imagery. Federal orthophotography, public domain, served as XYZ
//     tiles from The National Map.
//   - AWS terrain tiles. The Terrarium-encoded DEM mirror on S3, open data.
// Both were checked reachable before this was written. If either ever goes away
// the map degrades to a blank frame with the course still drawn on it, which is
// why the course is its own GeoJSON source rather than baked into a basemap.
//
// MAPLIBRE IS IMPORTED DYNAMICALLY, inside the effect. It is ~250KB gzipped and
// a static import would put it in the page's own bundle and run it during SSR,
// where `window` does not exist. The component's shell renders server-side so
// the box is in the layout from the first paint; the engine arrives after.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
// THE STYLESHEET IS IMPORTED STATICALLY, and the engine is not. Reaching the CSS
// through a dynamic import made Vite route it via the preload helper, and
// Astro's client and server passes hashed the same file differently: the
// browser asked for maplibre-gl.PxdK6UrK.css, the build had written
// maplibre-gl.CKRTiAqP.css, and the 404 came back as the HTML 404 page, which
// then failed MIME checking. The stylesheet is ~5KB gzipped and it is the map's
// controls and attribution, so having it in the page's CSS is both cheap and
// correct: the controls are styled the moment the engine paints them.
import 'maplibre-gl/dist/maplibre-gl.css';
// THE WORKER HAS TO BE BUNDLED EXPLICITLY. MapLibre v6 loads its worker as a
// separate module resolved against import.meta.url, and Astro's bundling breaks
// that resolution: no worker request is ever made, so every GeoJSON source
// stays permanently un-loaded, `load` never fires, and NOTHING reports an
// error. Raster tiles keep working because they never touch the worker, which
// is what makes the symptom so misleading: a perfect satellite map with no
// route drawn on it, and a status line stuck on "Loading". `?worker&url` makes
// Vite bundle the worker with its dependencies and hand back a URL that
// actually resolves.
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import meta from '../../../scripts/data/course-map.json';
import CourseProfileStrip from './CourseProfileStrip';
import {
  indexAtMile,
  sampleAt,
  buildPacing,
  pacedMileAtElapsed,
  gradeExpressionStops,
  LON,
  LAT,
  MILE,
  LOOP,
  type ProfilePoint,
} from '@/lib/courseFlyover';

type Status = 'loading' | 'ready' | 'failed';

/** Terrain exaggeration. 1.5 is what Strava's terrain mode used, and it reads. */
const EXAGGERATION = 1.5;

const USGS_IMAGERY =
  'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}';

/**
 * The same National Map service, drawn as a topographic quad instead of a
 * photograph. Public domain, no key, and it answers a different question:
 * the photograph shows what the ground looks like, the topo shows the contours,
 * the creeks and the names the park itself uses.
 */
const USGS_TOPO =
  'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}';

/** Terrarium-encoded DEM. NOT mapbox encoding: the two are not interchangeable. */
const TERRAIN_DEM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

/**
 * How long the whole 29.6 miles takes to fly.
 *
 * Ninety seconds is a judgement, not a measurement, and it is the one number
 * here most worth arguing about. Much faster and the switchbacks are a blur;
 * much slower and nobody reaches loop seven. The profile strip doubles as a
 * scrubber precisely so that anybody who disagrees can skip.
 */
const FLYOVER_SECONDS = 90;

/**
 * Camera while flying. Pitched hard, because the point is the terrain.
 *
 * MAPLIBRE'S DEFAULT CEILING IS 60 AND IT CLAMPS SILENTLY. This was 68 for a
 * while and was quietly rendered at 60, which is why the frame was always full
 * of ground with no horizon in it: the single most Earth-like thing a 3D map
 * does is show its own sky, and we had switched it off by accident. maxPitch is
 * raised on the map below, and past about 70 the horizon comes into frame.
 */
const FLY_PITCH = 74;

/**
 * NORTH, AND IT STAYS THERE.
 *
 * The flyover used to swing the camera round to face the direction of travel.
 * On a course of switchbacks that is a camera turning almost continuously, and
 * on a seven-lap course it turns the same corners four times: it reads as being
 * thrown around rather than as following a trail, and a reader loses track of
 * which way the park is pointing. Fixed north means every frame can be compared
 * with every other one, and with the resting map.
 */
const FLY_BEARING = 0;
const FLY_ZOOM = 15.2;

/** The resting shot. High enough to put sky in the frame rather than only dirt. */
const REST_PITCH = 66;

/**
 * How long the route takes to draw itself in, once, on arrival.
 *
 * Long enough to read as the course being traced and short enough that nobody
 * waiting to use the map is annoyed by it. It runs ONCE and never again.
 */
const DRAW_SECONDS = 2.2;

/**
 * Does this reader want motion at all?
 *
 * Read at the moment of use rather than cached, because the setting can change
 * mid-session and a flyover is the single most motion-heavy thing on the site.
 */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
}

export default function CourseMapLibre() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [terrainOn, setTerrainOn] = useState(true);
  const [gradeOn, setGradeOn] = useState(false);
  const [activeLoop, setActiveLoop] = useState<number | null>(null);
  const [basemap, setBasemap] = useState<'satellite' | 'topo'>('satellite');
  /**
   * Hover handling lives behind a ref because the map's listeners are attached
   * once, inside the mount effect, while the callbacks they need are defined
   * further down the component. Attaching through a ref means the listener
   * always calls the current one rather than the one that existed at mount.
   */
  const hoverRef = useRef<((lngLat: [number, number], px: [number, number]) => void) | null>(null);
  const clickRef = useRef<((lngLat: [number, number], px: [number, number]) => void) | null>(null);
  const activeLoopRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [cursorMile, setCursorMile] = useState<number | null>(null);
  /**
   * The mile the reader PLACED, as opposed to the one they are hovering.
   *
   * Hover is a moment: move the pointer onto the map to look at where you just
   * were and the marker you were reading is already gone. The pin outlives the
   * pointer, and the map marker shows the hover when there is one and the pin
   * when there is not.
   *
   * Mirrored into a ref because the callbacks below are memoised and are also
   * handed to MapLibre event handlers: reading the state in them would either
   * capture a stale value or force every handler to be rebuilt on each hover.
   */
  const [pinnedMile, setPinnedMile] = useState<number | null>(null);
  const pinnedRef = useRef<number | null>(null);
  const [profile, setProfile] = useState<ProfilePoint[]>([]);
  const mapRef = useRef<unknown>(null);

  // THE ANIMATION READS REFS, NOT STATE. A requestAnimationFrame loop that
  // closes over state re-closes on every render, and at 60fps that is a new
  // closure sixty times a second chasing a value that has already moved. Refs
  // are the only things the loop is allowed to read.
  const profileRef = useRef<ProfilePoint[]>([]);
  const rafRef = useRef(0);
  const flyStartRef = useRef(0);
  const flyFromMileRef = useRef(0);
  /**
   * Whether the map is in 3D, mirrored into a ref.
   *
   * FLATTEN HAS TO SURVIVE THE NEXT CLICK. Seeking and flying both set the
   * camera, and both used to set the pitch unconditionally, so a reader who had
   * deliberately flattened the map got 3D back the moment they touched the
   * profile. A view the reader chose outranks the view the feature prefers.
   */
  const terrainRef = useRef(true);

  /** Cumulative gradient-weighted effort, built once the profile lands. */
  const pacingRef = useRef<number[] | null>(null);
  const playingRef = useRef(false);
  const drawRafRef = useRef(0);
  const drawDoneRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let map: import('maplibre-gl').Map | null = null;

    (async () => {
      try {
        // NAMESPACE IMPORT, not a default one: maplibre-gl v6 ships named
        // exports and no default, so `{ default: maplibregl }` is undefined at
        // runtime and only fails when you try to construct a Map.
        // The facilities and landmark files are NOT loaded any more: they are
        // still built (they are true, and the audit that found them is worth
        // keeping) but nothing on this map draws them, so shipping them to the
        // browser would be bytes for a layer that does not exist.
        const [maplibregl, courseMod, gradeMod, milesMod, profileMod] = await Promise.all([
          import('maplibre-gl'),
          import('../../../scripts/data/course-geo.json'),
          import('../../../scripts/data/course-grade.json'),
          import('../../../scripts/data/course-miles.json'),
          import('../../../scripts/data/course-profile.json'),
        ]);
        if (cancelled || !hostRef.current) return;
        maplibregl.setWorkerUrl(maplibreWorkerUrl);

        // Passed as an OBJECT, not a URL. It is 6KB gzipped inside this chunk,
        // which is cheaper than a second round trip and cannot 404.
        type GeoData = import('maplibre-gl').GeoJSONSourceSpecification['data'];
        const course = (courseMod.default ?? courseMod) as unknown as GeoData;
        const gradeData = (gradeMod.default ?? gradeMod) as unknown as GeoData;
        const milesData = (milesMod.default ?? milesMod) as unknown as GeoData;
        const pts = ((profileMod.default ?? profileMod) as unknown as { points: ProfilePoint[] })
          .points;
        profileRef.current = pts;
        setProfile(pts);

        // ONE LINESTRING, AND ONLY THE FIRST TWO LOOPS OF IT.
        //
        // It is one feature because `line-gradient` measures progress along one
        // feature: animating the seven loop features would grow all seven at
        // once, each from its own start, which reads as a spider rather than as
        // a course being run.
        //
        // IT STOPS AFTER LOOP 2 BECAUSE THE REST IS THE SAME GROUND. Loops 3, 5
        // and 7 retrace loop 1 and loop 6 retraces loop 2, so a reveal of the
        // full 29.6 miles spends its first 28% lighting up every pixel the
        // course will ever touch and the remaining 72% redrawing pixels that are
        // already lit. Measured at 42% through: the map looks finished. That
        // reads as the animation stalling, not as a lap. The unique geometry is
        // loops 1 and 2, so that is what draws, and every frame of it puts new
        // line on the map.
        const uniqueGeometry = pts.filter((q) => q[5] <= 2);
        const wholeRoute = {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: uniqueGeometry.map((q) => [q[LON], q[LAT]]),
              },
            },
          ],
        } as unknown as GeoData;
        const b = meta.bounds;

        map = new maplibregl.Map({
          container: hostRef.current,
          // THE STYLE IS DECLARED INLINE rather than fetched from a style
          // server, because a remote style URL is one more service that can go
          // down or start charging, and this one is four layers.
          style: {
            version: 8,
            sources: {
              imagery: {
                type: 'raster',
                tiles: [USGS_IMAGERY],
                tileSize: 256,
                maxzoom: 16,
                // "Basemap", not "Imagery": this source serves the photograph
                // OR the topographic quad depending on which the reader has
                // chosen, and the credit has to be true of both.
                attribution:
                  'Basemap &copy; <a href="https://www.usgs.gov/">USGS</a> The National Map',
              },
              terrain: {
                type: 'raster-dem',
                tiles: [TERRAIN_DEM],
                tileSize: 256,
                maxzoom: 14,
                encoding: 'terrarium',
                attribution: 'Elevation: AWS Terrain Tiles',
              },
              course: { type: 'geojson', data: course },
              // lineMetrics is what makes ['line-progress'] available, and
              // without it line-gradient silently does nothing at all.
              whole: { type: 'geojson', data: wholeRoute, lineMetrics: true },
              grade: { type: 'geojson', data: gradeData },
              miles: { type: 'geojson', data: milesData },
              // ONE NAMED PLACE, AND IT IS THE ONE THE RACE IS NAMED AFTER.
              // The facility dots and the park's building labels came off on
              // 2026-09-16: on a map whose subject is a route, a scatter of
              // shelters, toilets and taps reads as clutter around the thing
              // you came to look at. What is left answers "where am I round the
              // loop" and "where are the Stone Steps", which are the two
              // questions this map exists for.
              steps: {
                type: 'geojson',
                data: {
                  type: 'FeatureCollection',
                  features: meta.stoneSteps
                    ? [
                        {
                          type: 'Feature',
                          properties: { name: 'Stone Steps' },
                          geometry: { type: 'Point', coordinates: meta.stoneSteps },
                        },
                      ]
                    : [],
                } as unknown as GeoData,
              },
              // The scrub marker. Starts empty and is fed a single point as the
              // reader moves along the profile.
              cursor: {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] },
              },
            },
            layers: [
              { id: 'imagery', type: 'raster', source: 'imagery' },
              // A GLOW UNDER THE CASING. Wide, blurred and warm, so the route
              // reads as LIT rather than drawn on top: it lifts the line off a
              // busy forest canopy without thickening it, which a heavier
              // stroke would. Cheap, and it is most of the difference between
              // "a line on a photo" and "a route".
              {
                id: 'course-glow',
                type: 'line',
                source: 'course',
                filter: ['==', ['geometry-type'], 'LineString'],
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: {
                  'line-color': '#ff9a5c',
                  'line-opacity': 0.34,
                  'line-blur': ['interpolate', ['linear'], ['zoom'], 11, 6, 16, 16],
                  'line-width': ['interpolate', ['linear'], ['zoom'], 11, 10, 16, 26],
                },
              },
              // A CASING UNDER THE COURSE. Over a photograph of a forest a bare
              // coloured line disappears into the canopy; a dark stroke behind
              // it is what keeps the route readable on any ground.
              {
                id: 'course-casing',
                type: 'line',
                source: 'course',
                filter: ['==', ['geometry-type'], 'LineString'],
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: {
                  'line-color': '#1a1712',
                  'line-opacity': 0.55,
                  'line-width': ['interpolate', ['linear'], ['zoom'], 11, 5, 16, 11],
                },
              },
              // THE DRAW-ON LINE. Visible only while it is drawing; the real
              // per-loop colouring takes over the instant it finishes, because
              // this one line cannot distinguish a long loop from a short one.
              {
                id: 'course-draw',
                type: 'line',
                source: 'whole',
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: {
                  'line-width': ['interpolate', ['linear'], ['zoom'], 11, 3, 16, 7],
                  'line-opacity': 0,
                  'line-gradient': [
                    'interpolate',
                    ['linear'],
                    ['line-progress'],
                    0,
                    '#e2593c',
                    0.0001,
                    '#e2593c',
                    0.0002,
                    'rgba(226,89,60,0)',
                    1,
                    'rgba(226,89,60,0)',
                  ],
                },
              },
              {
                id: 'course-long',
                type: 'line',
                source: 'course',
                filter: ['==', ['get', 'kind'], 'long'],
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: {
                  'line-color': '#e2593c',
                  'line-width': ['interpolate', ['linear'], ['zoom'], 11, 2.5, 16, 6],
                },
              },
              {
                id: 'course-short',
                type: 'line',
                source: 'course',
                filter: ['==', ['get', 'kind'], 'short'],
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: {
                  'line-color': '#ffd9a0',
                  'line-width': ['interpolate', ['linear'], ['zoom'], 11, 2.5, 16, 6],
                  'line-dasharray': [2, 1.6],
                },
              },
              // THE GRADIENT LINE IS A SECOND DRAWING OF THE SAME ROUTE, laid
              // over the flat-coloured one and switched on by opacity rather
              // than by adding and removing layers. Toggling layers means
              // re-parsing a source; toggling opacity is a paint property and
              // costs a frame.
              {
                id: 'course-grade',
                type: 'line',
                source: 'grade',
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: {
                  'line-opacity': 0,
                  'line-width': ['interpolate', ['linear'], ['zoom'], 11, 3, 16, 7],
                  'line-color': [
                    'interpolate',
                    ['linear'],
                    ['get', 'grade'],
                    ...gradeExpressionStops(),
                  ],
                },
              },
              {
                id: 'miles',
                type: 'circle',
                source: 'miles',
                // NO FILTER ANY MORE. These used to be 29 markers counting
                // miles into the RACE, which on a lapped course put several
                // numbers on one piece of ground, so only every fifth was
                // drawn and the map showed a bare "15" and "25". They now
                // count miles round each LOOP, the way the 1998 race map
                // numbered them and the way a marker on a post has to work, so
                // there are eight in total and all eight can be shown.
                paint: {
                  'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 3, 16, 7],
                  // The marker takes the colour of the loop it counts, because
                  // "mile 3" is a different place on the long loop than on the
                  // short one and the numbers repeat.
                  'circle-color': ['match', ['get', 'kind'], 'short', '#f6d9b0', '#e2593c'],
                  'circle-stroke-color': '#1a1712',
                  'circle-stroke-width': 1.5,
                },
              },
              {
                id: 'mile-labels',
                type: 'symbol',
                source: 'miles',
                layout: {
                  'text-field': ['to-string', ['get', 'mile']],
                  'text-size': 11,
                  'text-offset': [0, -1.2],
                  'text-allow-overlap': false,
                },
                paint: {
                  'text-color': '#ffffff',
                  'text-halo-color': '#1a1712',
                  'text-halo-width': 1.4,
                },
              },
              // DIRECTION OF TRAVEL. Which way round the loops go is not
              // guessable from a drawn line, and on a course that runs the same
              // trails seven times it is the difference between a map and a
              // diagram. The arrows are placed ALONG the line and rotated with
              // the map, so they always point the way the race runs.
              {
                id: 'course-arrows',
                type: 'symbol',
                source: 'course',
                filter: ['==', ['geometry-type'], 'LineString'],
                layout: {
                  'symbol-placement': 'line',
                  'symbol-spacing': 90,
                  'icon-image': 'course-arrow',
                  'icon-size': ['interpolate', ['linear'], ['zoom'], 12, 0.5, 16, 0.95],
                  'icon-rotation-alignment': 'map',
                  'icon-allow-overlap': false,
                  'icon-ignore-placement': false,
                },
                // Off at low zoom: at the default fit the arrows crowd the line
                // into a dotted mess.
                minzoom: 13.5,
              },
              // THE STONE STEPS THEMSELVES. The race is named after them, they
              // are 2.7% of it, and until now the map did not say which 2.7%.
              // Placed by the build script from the middle of the sampled track
              // points whose nearest named way is the Stone Steps, so the
              // marker sits on the course rather than at the end of the way.
              {
                id: 'steps',
                type: 'circle',
                source: 'steps',
                paint: {
                  'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 4, 16, 8],
                  'circle-color': '#1a1712',
                  'circle-stroke-color': '#ffffff',
                  'circle-stroke-width': 2,
                },
              },
              {
                id: 'steps-label',
                type: 'symbol',
                source: 'steps',
                layout: {
                  'text-field': ['get', 'name'],
                  'text-size': 12,
                  'text-offset': [0, 1.1],
                  'text-optional': true,
                },
                paint: {
                  'text-color': '#ffe9c4',
                  'text-halo-color': '#1a1712',
                  'text-halo-width': 1.6,
                },
              },
              {
                id: 'course-start',
                type: 'circle',
                source: 'course',
                filter: ['==', ['get', 'kind'], 'start'],
                paint: {
                  'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 5, 16, 10],
                  'circle-color': '#ffffff',
                  'circle-stroke-color': '#1a1712',
                  'circle-stroke-width': 2,
                },
              },
              // The scrub marker sits on top of everything, because its whole
              // job is to be findable.
              {
                id: 'cursor-halo',
                type: 'circle',
                source: 'cursor',
                paint: {
                  'circle-radius': 14,
                  'circle-color': '#ffffff',
                  'circle-opacity': 0.28,
                },
              },
              {
                id: 'cursor',
                type: 'circle',
                source: 'cursor',
                paint: {
                  'circle-radius': 6,
                  'circle-color': '#ffd9a0',
                  'circle-stroke-color': '#1a1712',
                  'circle-stroke-width': 2,
                },
              },
            ],
            sky: {
              'sky-color': '#8fb3d9',
              'horizon-color': '#dfe8f2',
              'fog-color': '#e8e0cc',
              'fog-ground-blend': 0.6,
            },
            // THE LIGHT IS RACE MORNING. The gun is 8:00 am on 25 October, when
            // the sun over Cincinnati is about 18 degrees up and just south of
            // east, so the hills shade the way they will on the day rather than
            // the way a default noon sun would flatten them. It is a small
            // thing that makes the terrain read as a place at a time.
            light: {
              anchor: 'map',
              position: [1.5, 105, 72],
              color: '#fff3dd',
              intensity: 0.35,
            },
          },
          bounds: [
            [b.west, b.south],
            [b.east, b.north],
          ],
          fitBoundsOptions: { padding: 40 },
          pitch: REST_PITCH,
          bearing: -18,
          maxZoom: 18,
          // Past the default 60 the horizon appears. See FLY_PITCH.
          maxPitch: 85,
          // A LEASH. Without it a stray two-finger drag sends the reader to
          // Kansas with no way back except reloading, because there is no
          // "recentre" affordance on a map this small. Generous enough that
          // panning around the park never fights you.
          maxBounds: [
            [meta.bounds.west - 0.06, meta.bounds.south - 0.05],
            [meta.bounds.east + 0.06, meta.bounds.north + 0.05],
          ],
          attributionControl: false,
          // The scroll wheel belongs to the PAGE until somebody has decided to
          // use the map. A long article that eats your scroll halfway down is
          // the single most complained-about behaviour an embedded map has.
          scrollZoom: false,
          cooperativeGestures: true,
        });
        mapRef.current = map;
        // A non-null local, because `map` is a `let` the compiler cannot prove
        // stays assigned inside the callbacks below.
        const m = map;

        m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
        m.addControl(new maplibregl.ScaleControl({ unit: 'imperial' }), 'bottom-left');
        m.addControl(new maplibregl.FullscreenControl(), 'top-right');
        m.addControl(
          new maplibregl.AttributionControl({
            compact: true,
            customAttribution: meta.attribution.osm,
          }),
          'bottom-right',
        );

        m.on('load', () => {
          if (cancelled) return;

          // THE ARROW IS DRAWN, NOT A FONT GLYPH. A text symbol would need the
          // style to carry a glyphs endpoint and would depend on the arrow
          // existing in whatever font got substituted; a canvas image is
          // guaranteed and is 24 lines.
          if (!m.hasImage('course-arrow')) {
            const S = 24;
            const c = document.createElement('canvas');
            c.width = S;
            c.height = S;
            const ctx = c.getContext('2d');
            if (ctx) {
              ctx.translate(S / 2, S / 2);
              // Point along +x: MapLibre rotates a line symbol so the image's
              // right edge follows the direction of the line.
              ctx.beginPath();
              ctx.moveTo(7, 0);
              ctx.lineTo(-4, -5.5);
              ctx.lineTo(-4, 5.5);
              ctx.closePath();
              ctx.fillStyle = '#ffffff';
              ctx.strokeStyle = 'rgba(26,23,18,0.75)';
              ctx.lineWidth = 1.5;
              ctx.fill();
              ctx.stroke();
              m.addImage('course-arrow', ctx.getImageData(0, 0, S, S), { pixelRatio: 2 });
            }
          }

          // READY FIRST, TERRAIN SECOND. Doing these the other way round meant a
          // throw from setTerrain aborted the whole handler: no terrain, and the
          // status stuck over a map that was plainly finished. The 3D is an
          // enhancement on top of a working map, so its failure must not be able
          // to claim the map never arrived.
          setStatus('ready');

          // COLLAPSE THE ATTRIBUTION ON A NARROW SCREEN. MapLibre's compact
          // control renders expanded, and on a 375px map that is three lines of
          // credits over the course. It stays in the DOM and is one tap away
          // behind its own "i" button, which is what every mapping product
          // does and what the licence asks for: attribution has to be
          // reasonably available, not permanently in the way.
          if (window.innerWidth < 720) {
            m.getContainer()
              .querySelector('.maplibregl-ctrl-attrib')
              ?.classList.remove('maplibregl-compact-show');
          }

          try {
            m.setTerrain({ source: 'terrain', exaggeration: EXAGGERATION });
          } catch (err) {
            console.error('Terrain failed; the map stays flat', err);
            setTerrainOn(false);
            terrainRef.current = false;
          }

          drawRoute(m);

          // POSTER MODE, for scripts/capture-map-poster.mjs and nothing else.
          //
          // The home page shows a STILL of this map with the route drawn over
          // it in SVG, so the still must contain the terrain and none of the
          // route: leaving the line in would draw it twice, once photographed
          // and once animated, a pixel apart. This strips the map back to its
          // photograph and hands the capture script the route already projected
          // into the same frame, so the overlay cannot drift from the picture.
          //
          // Inert unless the URL asks for it, which nothing the public reaches
          // ever does. It lives here rather than in the script because the
          // whole point is that the poster is THIS map, at this camera, with
          // this terrain exaggeration, rather than a second rendering that
          // quietly disagrees with it.
          const posterParams = new URLSearchParams(window.location.search);
          if (posterParams.has('poster')) {
            // SETTLE FIRST, THEN HIDE. Settling ends the draw-on animation, and
            // part of ending it is turning the mile markers, arrows and start
            // dot back on. Hiding before settling therefore un-hides them, and
            // the first poster came out with "15" and "25" floating over the
            // forest.
            settleRoute(m);
            // THE POSTER IS A COMPOSITION, NOT A SCREENSHOT OF THE DEFAULT
            // VIEW. The interactive map opens wide on purpose, so a reader can
            // see where the park sits in the city. A still on the home page is
            // doing the opposite job: it has one second to say "this is a run
            // through a forest on a hill", so the course fills the frame and
            // the suburbs stay at the edges. jumpTo, not fitBounds, because the
            // capture has to be the same picture every run.
            // The committed composition, overridable from the URL so the
            // camera can be auditioned against the real imagery rather than
            // guessed at in numbers. The capture script passes nothing, so what
            // ships is what is written here.
            const num = (k: string, fallback: number) => {
              const v = Number(posterParams.get(k));
              return Number.isFinite(v) && posterParams.has(k) ? v : fallback;
            };
            m.jumpTo({
              center: [
                (meta.bounds.west + meta.bounds.east) / 2 + num('dx', 0),
                (meta.bounds.south + meta.bounds.north) / 2 + num('dy', -0.004),
              ],
              zoom: num('z', 14.6),
              pitch: num('p', 63),
              bearing: num('b', -22),
            });
            for (const id of [
              'course-glow',
              'course-casing',
              'course-draw',
              'course-long',
              'course-short',
              'course-grade',
              'course-arrows',
              'miles',
              'mile-labels',
              'course-start',
              'steps',
              'steps-label',
              'cursor',
              'cursor-halo',
            ]) {
              if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', 'none');
            }
            (window as any).__poster = {
              /** Route points projected to CSS pixels in the map's own frame. */
              project: () =>
                profileRef.current.map((q) => {
                  // locationPoint3D, not project: project() ignores the terrain
                  // and at 66 degrees of pitch a point on a hillside lands tens
                  // of pixels from where it is drawn.
                  const t = (m as any).transform;
                  const ll = { lng: q[LON], lat: q[LAT] };
                  const pt =
                    typeof t?.locationPoint3D === 'function'
                      ? t.locationPoint3D(ll)
                      : m.project([q[LON], q[LAT]]);
                  return [Math.round(pt.x * 10) / 10, Math.round(pt.y * 10) / 10, q[LOOP]];
                }),
              size: () => {
                const c = m.getCanvas();
                return [c.clientWidth, c.clientHeight];
              },
            };
          }
        });

        // A tile service failing is not a broken page: the course is its own
        // source and still draws. Only a hard style error is worth reporting.
        // HOVERING THE ROUTE ON THE MAP PLACES THE SAME MARKER the profile
        // does. Throttled to one lookup per frame: a mousemove can fire far
        // more often than the map can paint.
        let hoverPending = false;
        m.on('mousemove', (e) => {
          if (hoverPending) return;
          hoverPending = true;
          requestAnimationFrame(() => {
            hoverPending = false;
            hoverRef.current?.([e.lngLat.lng, e.lngLat.lat], [e.point.x, e.point.y]);
          });
        });
        m.on('click', (e) => {
          clickRef.current?.([e.lngLat.lng, e.lngLat.lat], [e.point.x, e.point.y]);
        });

        // Leaving the canvas clears the hover, exactly as leaving the profile
        // does. The pin, if there is one, stays.
        m.on('mouseout', () => {
          hoverRef.current?.([NaN, NaN], [NaN, NaN]);
        });

        m.on('error', (e) => {
          // A tile 404 arrives here, not as a thrown error. Warn rather than
          // fail: a missing tile is a gap in the photograph, not a broken page.
          console.warn('Course map', e.error ?? e);
        });
      } catch (err) {
        console.error('Course map failed to load', err);
        if (!cancelled) setStatus('failed');
      }
    })();

    return () => {
      cancelled = true;
      playingRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (drawRafRef.current) cancelAnimationFrame(drawRafRef.current);
      // remove() releases the WebGL context. Without it, navigating away and
      // back leaks a context per visit until the browser starts dropping them.
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  const getMap = () => mapRef.current as import('maplibre-gl').Map | null;

  /** The route's resting appearance, once the draw-on is out of the way. */
  const settleRoute = useCallback((m: import('maplibre-gl').Map) => {
    drawDoneRef.current = true;
    if (drawRafRef.current) cancelAnimationFrame(drawRafRef.current);
    drawRafRef.current = 0;
    if (m.getLayer('course-draw')) m.setPaintProperty('course-draw', 'line-opacity', 0);
    for (const id of ['course-long', 'course-short']) {
      if (m.getLayer(id)) m.setPaintProperty(id, 'line-opacity', 1);
    }
    if (m.getLayer('course-glow')) m.setPaintProperty('course-glow', 'line-opacity', 0.34);
    if (m.getLayer('course-casing')) m.setPaintProperty('course-casing', 'line-opacity', 0.55);
    for (const id of ['course-arrows', 'miles', 'mile-labels', 'course-start']) {
      if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', 'visible');
    }
  }, []);

  /**
   * Trace the course once, on arrival.
   *
   * THE GRADIENT IS THE ANIMATION. Four stops walk along ['line-progress']: solid
   * up to the head, then transparent past it. Moving the head from 0 to 1 draws
   * the line. This is a paint property on one layer, so it costs a frame rather
   * than a source update, which is what makes it smooth on a phone.
   *
   * THE STOPS MUST STAY STRICTLY ASCENDING or MapLibre rejects the whole
   * expression, which is why the head is clamped away from both ends rather
   * than allowed to sit exactly on 0 or 1.
   *
   * Everything that would spoil the reveal (mile markers, arrows, the start dot)
   * is hidden until it finishes, so the map arrives empty and fills in.
   */
  const drawRoute = useCallback(
    (m: import('maplibre-gl').Map) => {
      if (drawDoneRef.current) return;

      // Reduced motion gets the finished map. A line that draws itself is
      // decoration, and decoration is exactly what that setting refuses.
      if (prefersReducedMotion()) {
        settleRoute(m);
        return;
      }

      for (const id of ['course-arrows', 'miles', 'mile-labels', 'course-start']) {
        if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', 'none');
      }
      for (const id of ['course-long', 'course-short']) {
        if (m.getLayer(id)) m.setPaintProperty(id, 'line-opacity', 0);
      }
      if (m.getLayer('course-glow')) m.setPaintProperty('course-glow', 'line-opacity', 0);
      // THE CASING IS DRAWN FROM THE WHOLE COURSE AND IT WAS NEVER HIDDEN.
      // Measured: with every other route layer at zero the map still showed a
      // finished course, because this dark stroke under it was still at 0.55.
      // The reveal had been running correctly the whole time and was invisible
      // underneath its own outline.
      if (m.getLayer('course-casing')) m.setPaintProperty('course-casing', 'line-opacity', 0);
      if (m.getLayer('course-draw')) m.setPaintProperty('course-draw', 'line-opacity', 1);

      const started = performance.now();
      const step = () => {
        const t = Math.min(1, (performance.now() - started) / (DRAW_SECONDS * 1000));
        // Ease out, so the line leaves The Oval quickly and settles into the
        // finish rather than stopping dead.
        const eased = 1 - (1 - t) ** 2.2;
        const head = Math.min(0.9996, Math.max(0.0002, eased));
        if (m.getLayer('course-draw')) {
          m.setPaintProperty('course-draw', 'line-gradient', [
            'interpolate',
            ['linear'],
            ['line-progress'],
            0,
            '#e2593c',
            head,
            '#ffb27a',
            Math.min(0.9999, head + 0.0015),
            'rgba(226,89,60,0)',
            1,
            'rgba(226,89,60,0)',
          ]);
        }
        if (t >= 1) {
          settleRoute(m);
          return;
        }
        drawRafRef.current = requestAnimationFrame(step);
      };
      drawRafRef.current = requestAnimationFrame(step);
    },
    [settleRoute],
  );

  /**
   * Put the scrub marker at a mile, without moving the camera.
   *
   * Feeding the source a one-feature collection rather than adding a Marker:
   * a GeoJSON source update is a paint, a DOM Marker is a layout, and this runs
   * on every pointer move across the profile.
   */
  const showCursorAt = useCallback((mile: number | null) => {
    const map = getMap();
    const pts = profileRef.current;
    if (!map || !pts.length) return;
    const src = map.getSource('cursor') as import('maplibre-gl').GeoJSONSource | undefined;
    if (!src) return;
    if (mile == null) {
      src.setData({ type: 'FeatureCollection', features: [] });
      return;
    }
    const p = sampleAt(pts, indexAtMile(pts, mile));
    src.setData({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'Point', coordinates: [p[LON], p[LAT]] },
        },
      ],
    });
  }, []);

  const onScrub = useCallback(
    (mile: number | null) => {
      setCursorMile(mile);
      // Leaving the profile does not clear the marker, it falls back to the
      // pinned one. Passing `mile` straight through here is what made the
      // marker vanish the moment the pointer left.
      showCursorAt(mile ?? pinnedRef.current);
    },
    [showCursorAt],
  );

  /** Place or clear the marker that outlives the pointer. */
  const onPin = useCallback(
    (mile: number | null) => {
      pinnedRef.current = mile;
      setPinnedMile(mile);
      showCursorAt(mile);
    },
    [showCursorAt],
  );

  /**
   * Turn a point on the map into a mile on the course.
   *
   * THE LOOPS ARE THE PROBLEM, and they are not solvable by geometry: a tree on
   * the Furnas Trail is mile 2.1, 8.6, 15.1 and 21.6 of the same race, and no
   * amount of hovering it will say which one the reader means. So the answer is
   * chosen rather than computed.
   *
   * With a loop isolated by the chips, the question has one answer and that lap
   * is used. With all seven showing, the FIRST lap to cover that ground is used
   * (loop 1 or 2), which is the same geometry the draw-on animation treats as
   * the whole course, and the readout names the loop so nothing is implied that
   * is not true.
   *
   * Nearest point is found in lng/lat and then checked in PIXELS, because 25
   * pixels means the same thing to a reader at every zoom and 200 feet does
   * not.
   */
  useEffect(() => {
    /**
     * The mile under a point on the map, or null if the pointer is not on the
     * route. Shared by hover and click so the two can never disagree about
     * which lap a piece of ground belongs to.
     */
    const mileUnder = (lngLat: [number, number], px: [number, number]): number | null => {
      const map = getMap();
      const pts = profileRef.current;
      if (!map || !pts.length || !Number.isFinite(lngLat[0])) return null;

      const loop = activeLoopRef.current;
      let best = -1;
      let bestD = Infinity;
      for (let i = 0; i < pts.length; i += 1) {
        const p = pts[i];
        if (loop == null ? p[LOOP] > 2 : p[LOOP] !== loop) continue;
        // Squared degrees, with longitude scaled for latitude. Comparing only,
        // so no square root and no haversine.
        const dx = (p[LON] - lngLat[0]) * 0.77;
        const dy = p[LAT] - lngLat[1];
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      if (best < 0) return null;

      const p = pts[best];
      const at = map.project([p[LON], p[LAT]]);
      return Math.hypot(at.x - px[0], at.y - px[1]) <= 25 ? p[MILE] : null;
    };

    hoverRef.current = (lngLat, px) => {
      const map = getMap();
      // The flyover owns the marker while it is playing; a stray mousemove must
      // not yank the camera's own readout sideways.
      if (!map || playingRef.current) return;
      const mile = mileUnder(lngLat, px);
      onScrub(mile);
      // A pointer cursor is the only thing that says the line can be clicked.
      map.getCanvas().style.cursor = mile == null ? '' : 'pointer';
    };

    /**
     * CLICKING THE ROUTE LEAVES THE MARKER THERE, which is what the profile has
     * always done and what the map did not: hover set the live position and
     * nothing set the pinned one, so the moment the pointer moved away the
     * marker snapped back to whatever the profile had pinned, or vanished.
     *
     * Clicking the marker again clears it, same as on the profile, and the
     * tolerance is the same 25 pixels used to decide the line was hit at all.
     */
    clickRef.current = (lngLat, px) => {
      const map = getMap();
      if (!map || playingRef.current) return;
      const mile = mileUnder(lngLat, px);
      if (mile == null) return;

      const pinned = pinnedRef.current;
      if (pinned != null) {
        const pts = profileRef.current;
        const p = sampleAt(pts, indexAtMile(pts, pinned));
        const at = map.project([p[LON], p[LAT]]);
        if (Math.hypot(at.x - px[0], at.y - px[1]) <= 25) {
          onPin(null);
          return;
        }
      }
      onPin(mile);
      // The camera stays put on purpose. The reader is pointing at something
      // they can already see, and recentring the map under their own cursor is
      // disorienting in a way that recentring from the profile is not.
    };
  }, [onScrub, onPin]);

  // ESCAPE CLEARS IT. Anything a reader can place has to come off without
  // hunting for the exact pixel they placed it on, and Escape is what every
  // other dismissable thing on this page already answers to.
  useEffect(() => {
    if (pinnedMile == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onPin(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pinnedMile, onPin]);

  /** Fly the camera to a mile, as a one-off move rather than a playback. */
  const onSeek = useCallback(
    (mile: number) => {
      const map = getMap();
      const pts = profileRef.current;
      if (!map || !pts.length) return;
      stopFly();
      settleRoute(map);
      const i = indexAtMile(pts, mile);
      const p = sampleAt(pts, i);
      map.easeTo({
        center: [p[LON], p[LAT]],
        bearing: FLY_BEARING,
        // Flat stays flat. See terrainRef.
        pitch: terrainRef.current ? FLY_PITCH : 0,
        zoom: FLY_ZOOM,
        duration: prefersReducedMotion() ? 0 : 900,
      });
    },
    // Empty on purpose: the only thing this closes over is stopFly, which is a
    // hoisted function declaration rather than a value that can go stale. (No
    // eslint-disable here: this repo does not enable react-hooks rules, and a
    // disable comment for a rule that is not configured is itself an error.)
    [],
  );

  /**
   * THE FLYOVER.
   *
   * One requestAnimationFrame loop driving jumpTo, rather than a chain of
   * easeTo calls. easeTo owns the camera for its duration and queues badly:
   * chaining one per vertex fights itself at every boundary and cannot be
   * interrupted cleanly. Driving the camera directly each frame means the
   * flyover can be stopped, scrubbed or resumed at any instant, and the bearing
   * can be EASED rather than snapped, which is the difference between following
   * a trail and being thrown around a corner.
   */
  function stopFly() {
    playingRef.current = false;
    setPlaying(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }

  const startFly = useCallback(
    (fromMile = 0) => {
      const map = getMap();
      const pts = profileRef.current;
      if (!map || !pts.length) return;
      settleRoute(map);

      // REDUCED MOTION GETS THE DESTINATION, NOT THE JOURNEY. A 90 second
      // camera flight is exactly the kind of motion the setting exists to
      // refuse, so it jumps to the finish and leaves the profile scrubbable.
      if (prefersReducedMotion()) {
        onSeek(pts[pts.length - 1][MILE]);
        return;
      }

      const total = pts[pts.length - 1][MILE];
      flyFromMileRef.current = fromMile >= total - 0.05 ? 0 : fromMile;
      flyStartRef.current = performance.now();
      playingRef.current = true;
      setPlaying(true);

      // Built once per flight rather than per frame: it is one pass over 972
      // points, and doing it inside the rAF loop would be 60 of those a second
      // for a number that cannot change.
      if (!pacingRef.current) pacingRef.current = buildPacing(pts);
      const pacing = pacingRef.current;

      const step = () => {
        if (!playingRef.current) return;
        const m = getMap();
        if (!m) return;
        const elapsed = (performance.now() - flyStartRef.current) / 1000;
        const remaining = total - flyFromMileRef.current;
        // PACED BY THE GRADIENT, not by distance. The camera used to cross the
        // steepest climb on the course at the same rate as the road round The
        // Oval. The flight still takes the same total time; only how it spends
        // it has changed.
        const mile = pacedMileAtElapsed(
          pts,
          pacing,
          flyFromMileRef.current,
          elapsed,
          (remaining / total) * FLYOVER_SECONDS,
        );
        const i = indexAtMile(pts, mile);
        const p = sampleAt(pts, i);

        m.jumpTo({
          center: [p[LON], p[LAT]],
          bearing: FLY_BEARING,
          pitch: terrainRef.current ? FLY_PITCH : 0,
          zoom: FLY_ZOOM,
        });
        setCursorMile(mile);
        showCursorAt(mile);

        if (mile >= total - 1e-4) {
          stopFly();
          return;
        }
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [onSeek, showCursorAt],
  );

  /** Frame a single loop, or the whole course when cleared. */
  const focusLoop = useCallback((loop: number | null) => {
    const map = getMap();
    const pts = profileRef.current;
    setActiveLoop(loop);
    activeLoopRef.current = loop;
    if (!map) return;
    stopFly();

    // Dim the rest rather than hiding it: the point of isolating a loop is to
    // see where it sits in the others.
    for (const id of ['course-long', 'course-short']) {
      if (!map.getLayer(id)) continue;
      map.setPaintProperty(
        id,
        'line-opacity',
        loop == null ? 1 : ['case', ['==', ['get', 'index'], loop], 1, 0.18],
      );
    }

    if (loop == null) {
      map.fitBounds(
        [
          [meta.bounds.west, meta.bounds.south],
          [meta.bounds.east, meta.bounds.north],
        ],
        { padding: 40, pitch: 55, duration: prefersReducedMotion() ? 0 : 900 },
      );
      return;
    }

    const own = pts.filter((q) => q[5] === loop);
    if (!own.length) return;
    const lons = own.map((q) => q[LON]);
    const lats = own.map((q) => q[LAT]);
    map.fitBounds(
      [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ],
      { padding: 60, pitch: 60, duration: prefersReducedMotion() ? 0 : 900 },
    );
  }, []);

  const toggleGrade = () => {
    const map = getMap();
    if (map) settleRoute(map);
    const next = !gradeOn;
    setGradeOn(next);
    if (!map) return;
    // Cross-fade rather than swap: both drawings are already there.
    map.setPaintProperty('course-grade', 'line-opacity', next ? 1 : 0);
    for (const id of ['course-long', 'course-short']) {
      if (map.getLayer(id)) map.setPaintProperty(id, 'line-opacity', next ? 0 : 1);
    }
  };

  /** Swap the photograph for the topographic quad, or back. */
  const toggleBasemap = () => {
    const map = mapRef.current as import('maplibre-gl').Map | null;
    if (!map) return;
    const next = basemap === 'satellite' ? 'topo' : 'satellite';
    setBasemap(next);
    const src = map.getSource('imagery') as import('maplibre-gl').RasterTileSource | undefined;
    // setTiles rather than a new style: reloading the style would drop every
    // GeoJSON source, the terrain and the route's draw state with it.
    src?.setTiles([next === 'topo' ? USGS_TOPO : USGS_IMAGERY]);
  };

  const toggleTerrain = () => {
    const map = mapRef.current as import('maplibre-gl').Map | null;
    if (!map) return;
    const next = !terrainOn;
    setTerrainOn(next);
    terrainRef.current = next;
    map.setTerrain(next ? { source: 'terrain', exaggeration: EXAGGERATION } : null);
    map.easeTo({ pitch: next ? REST_PITCH : 0, duration: 600 });
  };

  return (
    <div className="cmapwrap">
      <div className="cmap__frame">
        <div className="cmap__canvas" ref={hostRef} aria-hidden="true" />
        {/* The ridge that cuts the top and bottom edges. Two elements rather
            than a mask on the frame, because masking a live WebGL canvas costs
            a compositing layer and this only has to cover it. */}
        <span className="cmap__ridge is-top" aria-hidden="true" />
        <span className="cmap__ridge is-bottom" aria-hidden="true" />
        {/* ON THE MAP, NOT UNDER IT. A row of rectangles beneath a rectangle is
          three boxes; a single translucent bar sitting on the terrain is one
          object, and it is what every mapping product does with its controls.
          Placed bottom-left, clear of MapLibre's own zoom and compass stack in
          the top right and of the attribution bottom right. */}
        <div className="cmapbar">
          <button
            type="button"
            className="cmapbar__btn is-primary"
            onClick={() => (playing ? stopFly() : startFly(cursorMile ?? pinnedMile ?? 0))}
            disabled={status !== 'ready'}
          >
            {playing
              ? 'Stop'
              : (cursorMile ?? pinnedMile) != null
                ? 'Fly from here'
                : 'Fly the course'}
          </button>
          <button type="button" className="cmapbar__btn" onClick={toggleTerrain}>
            {terrainOn ? 'Flatten' : '3D'}
          </button>
          <button
            type="button"
            className="cmapbar__btn"
            onClick={toggleBasemap}
            aria-pressed={basemap === 'topo'}
          >
            {basemap === 'topo' ? 'Satellite' : 'Topo'}
          </button>
          <button
            type="button"
            className="cmapbar__btn"
            onClick={toggleGrade}
            aria-pressed={gradeOn}
            disabled={status !== 'ready'}
          >
            {gradeOn ? 'Loops' : 'Gradient'}
          </button>
        </div>
      </div>
      {status === 'loading' && <p className="cmap__status">Loading the map...</p>}
      {status === 'failed' && (
        <p className="cmap__status" role="status">
          The map could not load. The elevation profile below still shows the whole course.
        </p>
      )}

      {status === 'ready' && profile.length > 0 && (
        <CourseProfileStrip
          points={profile}
          // The live hover wins while there is one; the placed marker is what
          // the strip falls back to, so its readout and playhead stay put for
          // the same reason the map marker does.
          cursorMile={cursorMile ?? pinnedMile}
          pinnedMile={pinnedMile}
          onScrub={onScrub}
          onSeek={onSeek}
          onPin={onPin}
          activeLoop={activeLoop}
        />
      )}

      {/* LOOP CHIPS. Seven buttons is the fastest way to answer "which bit is
          the short loop", and each one is a real button so the whole feature
          works from the keyboard. */}
      <div className="cmaploops" role="group" aria-label="Isolate one loop">
        <button
          type="button"
          className={['cmaploops__chip', activeLoop == null ? 'is-on' : '']
            .filter(Boolean)
            .join(' ')}
          onClick={() => focusLoop(null)}
          aria-pressed={activeLoop == null}
        >
          All seven
        </button>
        {meta.loops.map((l) => (
          <button
            key={l.index}
            type="button"
            className={['cmaploops__chip', `is-${l.kind}`, activeLoop === l.index ? 'is-on' : '']
              .filter(Boolean)
              .join(' ')}
            onClick={() => focusLoop(l.index)}
            aria-pressed={activeLoop === l.index}
          >
            {l.index}
            {/* THE PUBLISHED LENGTH, NOT THE WATCH'S. The track reads 5.04,
                5.00 and 4.96 for the same ground across three laps, which is
                GPS under a canopy rather than three different loops. Every
                distance a reader sees is the race's own. */}
            <span className="cmaploops__miles">{l.publishedMiles} mi</span>
          </button>
        ))}
      </div>

      <div className="cmap__cap">
        {gradeOn ? (
          <span className="cmap__key">
            <span className="cmapgrade" aria-hidden="true" /> Downhill to uphill, clamped at
            &plusmn;20%
          </span>
        ) : (
          <>
            <span className="cmap__key">
              <span className="cmap__swatch is-long" /> Long loop
            </span>
            <span className="cmap__key">
              <span className="cmap__swatch is-short" /> Short loop
            </span>
          </>
        )}
        <span className="cmap__key">
          <span className="cmap__swatch is-oval" /> The Oval
        </span>
        {/* The numbers repeat, so the legend has to say what they count. Mile 3
            on the long loop and mile 3 on the short loop are different places,
            and the dot takes its loop's colour to tell them apart. */}
        <span className="cmap__key">
          <span className="cmap__swatch is-mile" /> Miles, counted round each loop
        </span>
        {/* SAYING SO IS NOT OPTIONAL, for the same reason the elevation profile
            captions itself: a 3D picture of terrain is read as a measurement
            unless it admits otherwise. */}
        <span className="cmap3d__hint">
          Vertical scale exaggerated {EXAGGERATION}x. Light set to 8am on race day.
        </span>
      </div>
    </div>
  );
}
