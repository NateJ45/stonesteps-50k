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

import { useEffect, useRef, useState } from 'react';
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

type Status = 'loading' | 'ready' | 'failed';

/** Terrain exaggeration. 1.5 is what Strava's terrain mode used, and it reads. */
const EXAGGERATION = 1.5;

const USGS_IMAGERY =
  'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}';

/** Terrarium-encoded DEM. NOT mapbox encoding: the two are not interchangeable. */
const TERRAIN_DEM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

export default function CourseMapLibre() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [terrainOn, setTerrainOn] = useState(true);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    let map: import('maplibre-gl').Map | null = null;

    (async () => {
      try {
        // NAMESPACE IMPORT, not a default one: maplibre-gl v6 ships named
        // exports and no default, so `{ default: maplibregl }` is undefined at
        // runtime and only fails when you try to construct a Map.
        const [maplibregl, courseMod] = await Promise.all([
          import('maplibre-gl'),
          import('../../../scripts/data/course-geo.json'),
        ]);
        if (cancelled || !hostRef.current) return;
        maplibregl.setWorkerUrl(maplibreWorkerUrl);

        // Passed as an OBJECT, not a URL. It is 6KB gzipped inside this chunk,
        // which is cheaper than a second round trip and cannot 404.
        const course = (courseMod.default ??
          courseMod) as unknown as import('maplibre-gl').GeoJSONSourceSpecification['data'];
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
            ],
            sky: {
              'sky-color': '#8fb3d9',
              'horizon-color': '#dfe8f2',
              'fog-color': '#e8e0cc',
              'fog-ground-blend': 0.6,
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
      // remove() releases the WebGL context. Without it, navigating away and
      // back leaks a context per visit until the browser starts dropping them.
      map?.remove();
      mapRef.current = null;
    };
  }, []);

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
      <div className="cmap__cap">
        <button type="button" className="cmap3d__btn" onClick={toggleTerrain}>
          {terrainOn ? 'Flatten the map' : 'Show the terrain'}
        </button>
        <span className="cmap__key">
          <span className="cmap__swatch is-long" /> Long loop
        </span>
        <span className="cmap__key">
          <span className="cmap__swatch is-short" /> Short loop
        </span>
        <span className="cmap__key">
          <span className="cmap__swatch is-oval" /> The Oval
        </span>
        {/* SAYING SO IS NOT OPTIONAL, for the same reason the elevation profile
            captions itself: a 3D picture of terrain is read as a measurement
            unless it admits otherwise. */}
        <span className="cmap3d__hint">Vertical scale exaggerated {EXAGGERATION}x</span>
      </div>
    </div>
  );
}
