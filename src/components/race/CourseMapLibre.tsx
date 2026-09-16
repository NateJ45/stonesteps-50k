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
  bearingAt,
  easeBearing,
  mileAtElapsed,
  gradeExpressionStops,
  LON,
  LAT,
  MILE,
  type ProfilePoint,
} from '@/lib/courseFlyover';

type Status = 'loading' | 'ready' | 'failed';

/** Terrain exaggeration. 1.5 is what Strava's terrain mode used, and it reads. */
const EXAGGERATION = 1.5;

const USGS_IMAGERY =
  'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}';

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

/** Camera while flying. Pitched hard, because the point is the terrain. */
const FLY_PITCH = 68;
const FLY_ZOOM = 15.4;

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
  const [playing, setPlaying] = useState(false);
  const [cursorMile, setCursorMile] = useState<number | null>(null);
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
  const bearingRef = useRef(0);
  const playingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let map: import('maplibre-gl').Map | null = null;

    (async () => {
      try {
        // NAMESPACE IMPORT, not a default one: maplibre-gl v6 ships named
        // exports and no default, so `{ default: maplibregl }` is undefined at
        // runtime and only fails when you try to construct a Map.
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
                attribution:
                  'Imagery &copy; <a href="https://www.usgs.gov/">USGS</a> The National Map',
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
              grade: { type: 'geojson', data: gradeData },
              miles: { type: 'geojson', data: milesData },
              // The scrub marker. Starts empty and is fed a single point as the
              // reader moves along the profile.
              cursor: {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] },
              },
            },
            layers: [
              { id: 'imagery', type: 'raster', source: 'imagery' },
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
                // Every mile from zoom 14; every fifth below that, because at
                // the default fit 27 markers a third of an inch apart is a
                // dotted line, not information.
                filter: ['==', ['%', ['get', 'mile'], 5], 0],
                paint: {
                  'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 3, 16, 7],
                  'circle-color': '#1a1712',
                  'circle-stroke-color': '#ffffff',
                  'circle-stroke-width': 1.5,
                },
              },
              {
                id: 'mile-labels',
                type: 'symbol',
                source: 'miles',
                filter: ['==', ['%', ['get', 'mile'], 5], 0],
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
          pitch: 55,
          bearing: -18,
          maxZoom: 18,
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
          // READY FIRST, TERRAIN SECOND. Doing these the other way round meant a
          // throw from setTerrain aborted the whole handler: no terrain, and the
          // status stuck over a map that was plainly finished. The 3D is an
          // enhancement on top of a working map, so its failure must not be able
          // to claim the map never arrived.
          setStatus('ready');
          try {
            m.setTerrain({ source: 'terrain', exaggeration: EXAGGERATION });
          } catch (err) {
            console.error('Terrain failed; the map stays flat', err);
            setTerrainOn(false);
          }
        });

        // A tile service failing is not a broken page: the course is its own
        // source and still draws. Only a hard style error is worth reporting.
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
      // remove() releases the WebGL context. Without it, navigating away and
      // back leaks a context per visit until the browser starts dropping them.
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  const getMap = () => mapRef.current as import('maplibre-gl').Map | null;

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
      showCursorAt(mile);
    },
    [showCursorAt],
  );

  /** Fly the camera to a mile, as a one-off move rather than a playback. */
  const onSeek = useCallback(
    (mile: number) => {
      const map = getMap();
      const pts = profileRef.current;
      if (!map || !pts.length) return;
      stopFly();
      const i = indexAtMile(pts, mile);
      const p = sampleAt(pts, i);
      const bearing = bearingAt(pts, i);
      bearingRef.current = bearing;
      map.easeTo({
        center: [p[LON], p[LAT]],
        bearing,
        pitch: FLY_PITCH,
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
      bearingRef.current = bearingAt(pts, indexAtMile(pts, flyFromMileRef.current));
      playingRef.current = true;
      setPlaying(true);

      const step = () => {
        if (!playingRef.current) return;
        const m = getMap();
        if (!m) return;
        const elapsed = (performance.now() - flyStartRef.current) / 1000;
        const remaining = total - flyFromMileRef.current;
        const mile =
          flyFromMileRef.current +
          mileAtElapsed(remaining, elapsed, (remaining / total) * FLYOVER_SECONDS);
        const i = indexAtMile(pts, mile);
        const p = sampleAt(pts, i);

        // The bearing is eased towards the trail's heading rather than set to
        // it, and easeBearing takes the short way round the compass. Without
        // that, every time the route crosses north the camera spins 340 degrees.
        bearingRef.current = easeBearing(bearingRef.current, bearingAt(pts, i), 0.06);

        m.jumpTo({
          center: [p[LON], p[LAT]],
          bearing: bearingRef.current,
          pitch: FLY_PITCH,
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
    const next = !gradeOn;
    setGradeOn(next);
    if (!map) return;
    // Cross-fade rather than swap: both drawings are already there.
    map.setPaintProperty('course-grade', 'line-opacity', next ? 1 : 0);
    for (const id of ['course-long', 'course-short']) {
      if (map.getLayer(id)) map.setPaintProperty(id, 'line-opacity', next ? 0 : 1);
    }
  };

  const toggleTerrain = () => {
    const map = mapRef.current as import('maplibre-gl').Map | null;
    if (!map) return;
    const next = !terrainOn;
    setTerrainOn(next);
    map.setTerrain(next ? { source: 'terrain', exaggeration: EXAGGERATION } : null);
    map.easeTo({ pitch: next ? 55 : 0, duration: 600 });
  };

  return (
    <div className="cmapwrap">
      <div className="cmap__frame" ref={hostRef} aria-hidden="true" />
      {status === 'loading' && <p className="cmap__status">Loading the map...</p>}
      {status === 'failed' && (
        <p className="cmap__status" role="status">
          The map could not load. The trails the course uses are listed below.
        </p>
      )}

      {status === 'ready' && profile.length > 0 && (
        <CourseProfileStrip
          points={profile}
          cursorMile={cursorMile}
          onScrub={onScrub}
          onSeek={onSeek}
          activeLoop={activeLoop}
        />
      )}

      <div className="cmap__cap">
        <button
          type="button"
          className="cmap3d__btn is-primary"
          onClick={() => (playing ? stopFly() : startFly(cursorMile ?? 0))}
          disabled={status !== 'ready'}
        >
          {playing ? 'Stop' : cursorMile ? 'Fly from here' : 'Fly the course'}
        </button>
        <button type="button" className="cmap3d__btn" onClick={toggleTerrain}>
          {terrainOn ? 'Flatten' : '3D terrain'}
        </button>
        <button
          type="button"
          className="cmap3d__btn"
          onClick={toggleGrade}
          aria-pressed={gradeOn}
          disabled={status !== 'ready'}
        >
          {gradeOn ? 'Loop colours' : 'Colour by gradient'}
        </button>
      </div>

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
            <span className="cmaploops__miles">{l.miles} mi</span>
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
