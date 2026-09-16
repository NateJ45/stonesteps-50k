// Safe to edit by hand
// =============================================================================
// CourseProfileStrip - the elevation profile, and the flyover's timeline
// =============================================================================
// ONE CONTROL DOING TWO JOBS, on purpose. This is the elevation profile of the
// course AND the scrubber for the flyover: hovering it moves a marker on the
// map, clicking it flies the camera there, and while the flyover plays the
// playhead tracks it. Every mapping product that does this well (Strava,
// Komoot, AllTrails) uses the same pattern, because "where am I on the climb"
// and "where am I in the route" are the same question.
//
// NOT THE SAME COMPONENT as ElevationProfile.astro further down the page. That
// one is the race's published figure, drawn once, server-rendered and printable.
// This one is a live control bound to a map. They answer different questions and
// merging them would make both worse.
// =============================================================================

import { useCallback, useMemo, useRef } from 'react';
import { MILE, ELE, GRADE, LOOP, type ProfilePoint } from '@/lib/courseFlyover';

interface Props {
  points: ProfilePoint[];
  /**
   * Mile the playhead sits at, or null when nothing is selected.
   *
   * This is the EFFECTIVE mile: the parent hands us the live hover when there
   * is one and the pinned mile when there is not, so everything drawn from it
   * (the playhead, the readout, the slider value) survives the pointer leaving.
   */
  cursorMile: number | null;
  /**
   * The placed marker's mile, or null when nothing is placed.
   *
   * THE MILE, NOT A BOOLEAN. A boolean cannot answer "did they just click the
   * marker they already placed", because the pointer is over the chart at that
   * moment and the component is therefore showing a hover, not the pin. The
   * first version took `pinned: boolean` and the click-to-clear gesture could
   * never fire.
   */
  pinnedMile: number | null;
  onScrub: (mile: number | null) => void;
  onSeek: (mile: number) => void;
  /** Place the marker at a mile, or null to clear it. */
  onPin: (mile: number | null) => void;
  /** When set, only this loop is drawn solid and the rest is dimmed. */
  activeLoop: number | null;
}

const W = 1000;
const H = 120;
const PAD_TOP = 10;
const PAD_BOTTOM = 18;

export default function CourseProfileStrip({
  points,
  cursorMile,
  pinnedMile,
  onScrub,
  onSeek,
  onPin,
  activeLoop,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const geom = useMemo(() => {
    if (points.length < 2) return null;
    const totalMiles = points[points.length - 1][MILE];
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of points) {
      if (p[ELE] < lo) lo = p[ELE];
      if (p[ELE] > hi) hi = p[ELE];
    }
    // A little headroom so the ridge line never touches the top edge, which
    // reads as clipped rather than as a summit.
    const span = Math.max(1, hi - lo) * 1.08;
    const x = (mile: number) => (mile / totalMiles) * W;
    const y = (ele: number) => H - PAD_BOTTOM - ((ele - lo) / span) * (H - PAD_TOP - PAD_BOTTOM);

    const line = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p[MILE]).toFixed(1)} ${y(p[ELE]).toFixed(1)}`)
      .join(' ');
    const area = `${line} L${W} ${H - PAD_BOTTOM} L0 ${H - PAD_BOTTOM} Z`;

    // One band per loop, so the seven-loop structure is visible in the profile
    // and not only on the map. The alternation is what makes "four long, three
    // short" legible at a glance.
    const bands: { loop: number; x0: number; x1: number; kind: 'odd' | 'even' }[] = [];
    let start = 0;
    for (let i = 1; i <= points.length; i += 1) {
      const endOfLoop = i === points.length || points[i][LOOP] !== points[start][LOOP];
      if (endOfLoop) {
        const loop = points[start][LOOP];
        bands.push({
          loop,
          x0: x(points[start][MILE]),
          x1: x(points[Math.min(i, points.length - 1)][MILE]),
          kind: loop % 2 === 1 ? 'odd' : 'even',
        });
        start = i;
      }
    }

    return { totalMiles, lo, hi, x, y, line, area, bands };
  }, [points]);

  /** Pointer x to a mile, clamped to the route. */
  const mileFromEvent = useCallback(
    (clientX: number): number | null => {
      const svg = svgRef.current;
      if (!svg || !geom) return null;
      const r = svg.getBoundingClientRect();
      if (!r.width) return null;
      const frac = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
      return frac * geom.totalMiles;
    },
    [geom],
  );

  if (!geom) return null;

  // Drawn at the pinned mile, whether that is because the pointer left or
  // because the pointer is hovering the pin. Gating this on "not hovering"
  // instead would mean clicking your own marker changed nothing on screen.
  const PIN_EPS = 0.2;
  const showsPin =
    pinnedMile != null && cursorMile != null && Math.abs(cursorMile - pinnedMile) <= PIN_EPS;

  const cursor =
    cursorMile == null
      ? null
      : (() => {
          // Nearest sample, for the readout. Interpolating elevation for a
          // label would invent a foot that was never measured.
          let best = points[0];
          let bestDiff = Infinity;
          for (const p of points) {
            const d = Math.abs(p[MILE] - cursorMile);
            if (d < bestDiff) {
              bestDiff = d;
              best = p;
            }
          }
          return { x: geom.x(cursorMile), p: best };
        })();

  return (
    <div className="cprof">
      <svg
        ref={svgRef}
        className="cprof__svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Elevation profile of the course, ${Math.round(geom.lo)} to ${Math.round(geom.hi)} feet over ${geom.totalMiles.toFixed(1)} miles. Interactive: use the slider below to move along it.`}
        onPointerMove={(e) => onScrub(mileFromEvent(e.clientX))}
        onPointerLeave={() => onScrub(null)}
        // A CLICK LEAVES THE MARKER BEHIND. Hover alone is a mouse-only,
        // moment-only answer: move the pointer away to look at the map and the
        // thing you were looking at is gone. Clicking pins it, and clicking the
        // marker again takes it away, which is the same gesture used to place
        // and unplace a pin everywhere else.
        onPointerDown={(e) => {
          const m = mileFromEvent(e.clientX);
          if (m == null) return;
          // WITHIN SIX PIXELS, not within a fixed number of miles. The chart is
          // one route at any width, so a mile is a different distance on a
          // phone than on a desktop, and a tolerance in miles would be
          // unmissable on one and unhittable on the other.
          const rect = svgRef.current?.getBoundingClientRect();
          const perPixel = rect && rect.width > 0 ? geom.totalMiles / rect.width : 0;
          if (pinnedMile != null && Math.abs(m - pinnedMile) <= perPixel * 6) {
            // Unpin only. The hover is still live and still sits here, so the
            // marker stays under the pointer and goes when the pointer does,
            // which is what "no longer pinned" should look like.
            onPin(null);
            return;
          }
          onPin(m);
          onSeek(m);
        }}
      >
        {/* Loop bands first, under everything. */}
        {geom.bands.map((b) => (
          <rect
            key={`${b.loop}-${b.x0}`}
            // JOINED, NOT CONCATENATED. The string-template version lost its
            // leading space in an edit and rendered `is-oddis-dim`, a class that
            // matches nothing and fails silently.
            className={[
              'cprof__band',
              `is-${b.kind}`,
              activeLoop && activeLoop !== b.loop ? 'is-dim' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            x={b.x0}
            y={PAD_TOP}
            width={Math.max(0, b.x1 - b.x0)}
            height={H - PAD_TOP - PAD_BOTTOM}
          />
        ))}

        <path className="cprof__area" d={geom.area} />
        <path className="cprof__line" d={geom.line} />

        {/* Loop numbers along the foot, which is also the only place the
            seven-loop structure is spelled out in text. */}
        {geom.bands.map((b) => (
          <text
            key={`t${b.loop}-${b.x0}`}
            className="cprof__loopNum"
            x={(b.x0 + b.x1) / 2}
            y={H - 5}
            textAnchor="middle"
          >
            {b.loop}
          </text>
        ))}

        {cursor && (
          <g className={showsPin ? 'cprof__cursor is-pinned' : 'cprof__cursor'}>
            <line x1={cursor.x} y1={PAD_TOP} x2={cursor.x} y2={H - PAD_BOTTOM} />
            <circle cx={cursor.x} cy={geom.y(cursor.p[ELE])} r="5" />
          </g>
        )}
      </svg>

      <div className="cprof__readout" aria-hidden="true">
        {cursor ? (
          <>
            <b>Mile {cursor.p[MILE].toFixed(1)}</b>
            <span>{Math.round(cursor.p[ELE])} ft</span>
            <span>
              {cursor.p[GRADE] > 0 ? '+' : ''}
              {cursor.p[GRADE].toFixed(1)}% grade
            </span>
            <span>Loop {cursor.p[LOOP]}</span>
          </>
        ) : (
          <span className="cprof__hint">
            Hover the profile to place yourself on the map, click to leave a marker there, or drag
            the slider.
          </span>
        )}
      </div>

      {/* THE SLIDER IS THE KEYBOARD AND SCREEN-READER PATH to everything the
          profile does. A hover-only scrubber is a mouse-only feature; this is a
          real range input, so arrow keys step along the course and the value is
          announced in miles. The SVG above is decorative by comparison. */}
      <label className="cprof__sliderLabel">
        <span className="cprof__sliderText">Position along the course, in miles</span>
        <input
          className="cprof__slider"
          type="range"
          min={0}
          max={geom.totalMiles}
          step={0.1}
          value={cursorMile ?? 0}
          onChange={(e) => {
            const m = Number(e.target.value);
            onScrub(m);
            onSeek(m);
            // The keyboard path has no "leave", so without this the marker a
            // keyboard user places would be the only one that never persists.
            onPin(m);
          }}
          aria-valuetext={
            cursorMile == null
              ? 'Start'
              : `Mile ${cursorMile.toFixed(1)}, ${Math.round(cursor?.p[ELE] ?? 0)} feet`
          }
        />
      </label>
    </div>
  );
}
