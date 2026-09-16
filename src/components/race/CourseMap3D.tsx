// Foundation, edit with care
// =============================================================================
// CourseMap3D - the "See it in 3D" control, and the viewer it opens
// =============================================================================
// WHAT SHIPS ON PAGE LOAD IS A BUTTON. three.js, the terrain heightfield and the
// route all arrive through dynamic imports inside the click handler, so /course
// never pays for any of it unless somebody asks. That is the whole reason the
// 2D map is the thing the page renders and this is an offer.
//
// If you ever need something from ./courseScene at the top of this file, stop:
// a static import pulls three.js into the page's own bundle and the only
// symptom is a performance score nobody checks that week.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SceneHandle } from './courseScene';
import type { CourseMapData } from '@/lib/courseMap';
import type { TerrainData } from '@/lib/courseTerrain';

type Status = 'idle' | 'loading' | 'open' | 'unsupported' | 'failed';

/**
 * Does this browser actually have WebGL?
 *
 * Asked by making a context and throwing it away, because the feature can be
 * absent for reasons no user-agent string reveals: a blocklisted driver, a
 * headless browser, or a privacy setting. Cheaper to ask than to render a black
 * rectangle and hope.
 */
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl'),
    );
  } catch {
    return false;
  }
}

export default function CourseMap3D() {
  const [status, setStatus] = useState<Status>('idle');
  const hostRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<SceneHandle | null>(null);

  // Tear the scene down on unmount as well as on close. Three holds GPU buffers
  // the garbage collector cannot see, so "the component went away" is not a
  // cleanup path unless it is written as one.
  useEffect(
    () => () => {
      sceneRef.current?.dispose();
      sceneRef.current = null;
    },
    [],
  );

  const open = useCallback(async () => {
    if (status === 'loading' || status === 'open') return;
    if (!hasWebGL()) {
      setStatus('unsupported');
      return;
    }
    setStatus('loading');
    try {
      // Three parallel dynamic imports, so the chunk and the data download at
      // once rather than in a chain.
      const [{ createCourseScene }, terrainMod, mapMod] = await Promise.all([
        import('./courseScene'),
        import('../../../scripts/data/course-terrain.json'),
        import('../../../scripts/data/course-map.json'),
      ]);
      setStatus('open');
      // The host div only exists once status is not idle, so wait a frame for
      // React to commit it before handing it to the renderer.
      requestAnimationFrame(() => {
        const host = hostRef.current;
        if (!host) return;
        sceneRef.current?.dispose();
        // Through `unknown`, because the generated JSON types widen `kind` to
        // string while CourseLoop narrows it to 'long' | 'short'. The data file
        // is written by build-course-map.mjs and only ever holds those two, so
        // this asserts what the generator guarantees rather than hiding a
        // mismatch the way `as never` would.
        const terrain = (terrainMod.default ?? terrainMod) as unknown as TerrainData;
        const map = (mapMod.default ?? mapMod) as unknown as CourseMapData;
        sceneRef.current = createCourseScene(host, terrain, map.loops);
      });
    } catch (err) {
      // A failed chunk is not a broken page: the 2D map above is still the map.
      console.error('Course 3D view failed to load', err);
      setStatus('failed');
    }
  }, [status]);

  const close = useCallback(() => {
    sceneRef.current?.dispose();
    sceneRef.current = null;
    setStatus('idle');
  }, []);

  if (status === 'unsupported' || status === 'failed') {
    return (
      <p className="cmap3d__note" role="status">
        {status === 'unsupported'
          ? 'This browser cannot show the 3D view. The map above has the same course.'
          : 'The 3D view could not load. The map above has the same course.'}
      </p>
    );
  }

  if (status !== 'open') {
    return (
      <div className="cmap3d__bar">
        <button
          type="button"
          className="cmap3d__btn"
          onClick={open}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Loading the terrain…' : 'See it in 3D'}
        </button>
        <span className="cmap3d__hint">Drag to orbit the hills, scroll to zoom.</span>
      </div>
    );
  }

  return (
    <div className="cmap3d">
      <div className="cmap3d__bar">
        <button type="button" className="cmap3d__btn" onClick={close}>
          Back to the flat map
        </button>
        {/* SAYING SO IS NOT OPTIONAL, for the same reason the elevation profile
            captions itself. Mt. Airy's relief is under 5% of the course's width,
            so at true proportions the model reads as a plate; the vertical axis
            is stretched to make the hills legible, and a 3D picture of terrain
            is taken for a measurement unless it admits otherwise. */}
        <span className="cmap3d__hint">Vertical scale exaggerated so the hills read</span>
      </div>
      <div className="cmap3d__stage" ref={hostRef} aria-hidden="true" />
    </div>
  );
}
