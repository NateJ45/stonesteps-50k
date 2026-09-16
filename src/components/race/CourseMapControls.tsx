// Foundation, edit with care
// =============================================================================
// CourseMapControls - pan and zoom for the course map
// =============================================================================
// THIS ISLAND DOES NOT RENDER THE MAP. CourseMap.astro server-renders the SVG,
// about 850 path points of it, and this component finds that SVG by id and
// drives ONE transform attribute on a single <g>. React never sees the
// geometry, so hydration costs a few buttons rather than a few thousand nodes,
// and the map is fully drawn and readable before any JavaScript arrives.
//
// WHY NO LIBRARY. The whole interaction is translate-and-scale on an element we
// own, with no tiles, no projection and no basemap provider. A pan/zoom library
// brings a coordinate system this map does not need. If cross-browser pinch
// ever gets ugly enough to warrant it, taking one is a decision to raise rather
// than to make quietly.
//
// THE ZOOM IS APPLIED TO THE GROUP, NOT THE VIEWBOX. Animating viewBox
// re-rasterises the whole drawing on the main thread every frame; a transform
// on one group is a composited operation the browser is built for.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { fitViewBox, type FeetPoint } from '@/lib/courseMap';

interface Props {
  svgId: string;
  /** The course's bounding box in the data file's frame: feet, y north. */
  bounds: [FeetPoint, FeetPoint];
  padFt: number;
}

const MIN_SCALE = 1;
const MAX_SCALE = 12;
/** Past this, trail labels fade in. Chosen so the default fit stays clean. */
const LABEL_SCALE = 2.2;

interface View {
  scale: number;
  x: number;
  y: number;
}

export default function CourseMapControls({ svgId, bounds, padFt }: Props) {
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const groupRef = useRef<SVGGElement | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;

  /**
   * Clamp the pan so the map cannot be dragged off its own frame.
   *
   * At scale 1 there is nothing to pan to, so the offset is pinned at zero:
   * without this the map can be flicked away and the panel left empty, with no
   * hint that the content is still there just off-screen.
   */
  const clamp = useCallback((v: View, w: number, h: number): View => {
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale));
    const maxX = ((scale - 1) * w) / 2;
    const maxY = ((scale - 1) * h) / 2;
    return {
      scale,
      x: Math.min(maxX, Math.max(-maxX, v.x)),
      y: Math.min(maxY, Math.max(-maxY, v.y)),
    };
  }, []);

  /**
   * REFIT THE VIEWBOX TO THE CONTAINER'S REAL SHAPE.
   *
   * The server has to commit to one aspect ratio, and it picks a landscape one
   * because that is what a desktop column is. On a 375px phone that same box
   * renders the whole course 232px tall, which is a postage stamp of a map.
   *
   * The repo's other answer to this problem is ElevationProfile, which draws
   * itself twice on two canvases at two breakpoints. That is right for a chart
   * built from seven numbers and wrong here: the map is 392 trails and 850
   * route points, and a second copy would add about 18KB gzipped to /course to
   * say the same thing twice.
   *
   * So the geometry is rendered once and only the WINDOW onto it moves. This is
   * a progressive enhancement in the strict sense: with no JavaScript the
   * server's landscape box is perfectly usable, and this only ever improves the
   * fit. It also then tracks a rotated phone or a dragged desktop window, which
   * two fixed canvases never could.
   */
  const refit = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    // MEASURE THE FRAME, NOT THE SVG. The frame's shape is set in CSS
    // (aspect-ratio, portrait on phones); the SVG just fills it. Measuring the
    // SVG would read back the aspect this function had already written, and the
    // fit would never move off whatever the server guessed.
    const frame = svg.parentElement?.getBoundingClientRect();
    if (!frame?.width || !frame?.height) return;
    const aspect = frame.width / frame.height;
    const vb = fitViewBox(bounds, aspect, padFt);
    svg.setAttribute(
      'viewBox',
      `${vb.minX.toFixed(1)} ${vb.minY.toFixed(1)} ${vb.width.toFixed(1)} ${vb.height.toFixed(1)}`,
    );
  }, [bounds, padFt]);

  const apply = useCallback((v: View) => {
    const g = groupRef.current;
    const svg = svgRef.current;
    if (!g || !svg) return;
    const box = svg.viewBox.baseVal;
    // Scale about the CENTRE of the viewBox, not its origin, so zooming keeps
    // the middle of the map in the middle of the frame. Zooming about the
    // origin walks the content off to one corner, which reads as a bug.
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const tx = (v.x / 100) * box.width;
    const ty = (v.y / 100) * box.height;
    g.setAttribute(
      'transform',
      `translate(${cx + tx} ${cy + ty}) scale(${v.scale}) translate(${-cx} ${-cy})`,
    );
    svg.classList.toggle('is-zoomed', v.scale >= LABEL_SCALE);
  }, []);

  // Locate the server-rendered SVG once, and mark it ready so its CSS can show
  // a grab cursor only when something is actually listening.
  useEffect(() => {
    const svg = document.getElementById(svgId) as SVGSVGElement | null;
    if (!svg) return;
    svgRef.current = svg;
    groupRef.current = svg.querySelector('[data-pan-group]');
    svg.setAttribute('data-pan-ready', '');
    return () => svg.removeAttribute('data-pan-ready');
  }, [svgId]);

  // Fit once the SVG is found, and again whenever the box changes shape.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    refit();
    const frame = svg.parentElement;
    if (!frame || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => refit());
    ro.observe(frame);
    return () => ro.disconnect();
  }, [refit]);

  useEffect(() => {
    apply(view);
  }, [view, apply]);

  /* ---- pointer drag and pinch ------------------------------------------- */

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    // Tracked by pointerId so a second finger starts a pinch rather than
    // fighting the first finger's drag.
    const pointers = new Map<number, { x: number; y: number }>();
    let pinchStart: { dist: number; scale: number } | null = null;

    const rectSize = () => {
      const r = svg.getBoundingClientRect();
      return { w: r.width || 1, h: r.height || 1 };
    };

    const onDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      svg.setPointerCapture(e.pointerId);
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchStart = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale: viewRef.current.scale };
      }
      if (pointers.size === 1) svg.setAttribute('data-panning', '');
    };

    const onMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const next = { x: e.clientX, y: e.clientY };
      pointers.set(e.pointerId, next);
      const { w, h } = rectSize();

      if (pointers.size >= 2 && pinchStart) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchStart.dist > 0) {
          const scale = pinchStart.scale * (dist / pinchStart.dist);
          setView((v) => clamp({ ...v, scale }, w, h));
        }
        return;
      }

      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      setView((v) => clamp({ ...v, x: v.x + (dx / w) * 100, y: v.y + (dy / h) * 100 }, w, h));
    };

    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchStart = null;
      if (pointers.size === 0) svg.removeAttribute('data-panning');
    };

    const onWheel = (e: WheelEvent) => {
      // Only when the pointer is over the map, and only then do we take the
      // scroll. Hijacking the wheel on a page this long would trap the reader.
      e.preventDefault();
      const { w, h } = rectSize();
      const factor = Math.exp(-e.deltaY / 400);
      setView((v) => clamp({ ...v, scale: v.scale * factor }, w, h));
    };

    const onKey = (e: KeyboardEvent) => {
      const { w, h } = rectSize();
      const STEP = 6;
      const map: Record<string, () => void> = {
        ArrowLeft: () => setView((v) => clamp({ ...v, x: v.x + STEP }, w, h)),
        ArrowRight: () => setView((v) => clamp({ ...v, x: v.x - STEP }, w, h)),
        ArrowUp: () => setView((v) => clamp({ ...v, y: v.y + STEP }, w, h)),
        ArrowDown: () => setView((v) => clamp({ ...v, y: v.y - STEP }, w, h)),
        '+': () => setView((v) => clamp({ ...v, scale: v.scale * 1.3 }, w, h)),
        '=': () => setView((v) => clamp({ ...v, scale: v.scale * 1.3 }, w, h)),
        '-': () => setView((v) => clamp({ ...v, scale: v.scale / 1.3 }, w, h)),
        '0': () => setView({ scale: 1, x: 0, y: 0 }),
      };
      const fn = map[e.key];
      if (!fn) return;
      e.preventDefault();
      fn();
    };

    svg.addEventListener('pointerdown', onDown);
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerup', onUp);
    svg.addEventListener('pointercancel', onUp);
    // NOT PASSIVE: this listener calls preventDefault, and Chrome makes wheel
    // listeners passive by default, where preventDefault silently does nothing.
    svg.addEventListener('wheel', onWheel, { passive: false });
    svg.addEventListener('keydown', onKey);

    return () => {
      svg.removeEventListener('pointerdown', onDown);
      svg.removeEventListener('pointermove', onMove);
      svg.removeEventListener('pointerup', onUp);
      svg.removeEventListener('pointercancel', onUp);
      svg.removeEventListener('wheel', onWheel);
      svg.removeEventListener('keydown', onKey);
    };
  }, [clamp]);

  const nudge = (factor: number) => {
    const svg = svgRef.current;
    const r = svg?.getBoundingClientRect();
    setView((v) => clamp({ ...v, scale: v.scale * factor }, r?.width || 1, r?.height || 1));
  };

  const atMin = view.scale <= MIN_SCALE + 0.001;
  const atMax = view.scale >= MAX_SCALE - 0.001;

  return (
    <div className="cmapctl" role="group" aria-label="Map controls">
      <button type="button" onClick={() => nudge(1.4)} disabled={atMax} aria-label="Zoom in">
        <span aria-hidden="true">+</span>
      </button>
      <button type="button" onClick={() => nudge(1 / 1.4)} disabled={atMin} aria-label="Zoom out">
        <span aria-hidden="true">−</span>
      </button>
      <button
        type="button"
        onClick={() => setView({ scale: 1, x: 0, y: 0 })}
        disabled={atMin && Math.abs(view.x) < 0.01 && Math.abs(view.y) < 0.01}
        aria-label="Reset the map view"
      >
        <span aria-hidden="true">Reset</span>
      </button>
      {/* Announced once, for anyone arriving on the SVG by keyboard. */}
      <p className="cmapctl__hint" id="cmap-hint">
        Drag to pan, scroll to zoom. With the map focused, arrow keys pan and plus and minus zoom.
      </p>
    </div>
  );
}
