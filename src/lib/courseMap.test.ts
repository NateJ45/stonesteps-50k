// Tests for the course map's pure geometry.
//
// Two of these guard mistakes that would LOOK FINE. A squashed viewBox renders
// a perfectly plausible map of a place that does not exist, and an upside-down
// label is only wrong if you read it. Both are cheap to assert and expensive to
// notice by eye.

import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  fitViewBox,
  toSvg,
  toPath,
  labelPlacement,
  labelWorthy,
  oneLabelPerName,
  type FeetPoint,
  type CourseTrail,
} from './courseMap.ts';
import { simplify } from '../../scripts/lib/course.mjs';

const trail = (name: string | null, points: FeetPoint[]): CourseTrail => ({
  name,
  kind: 'path',
  points,
});

describe('fitViewBox', () => {
  it('never distorts: the returned box matches the requested aspect', () => {
    const pts: FeetPoint[] = [
      [0, 0],
      [1000, 200],
    ];
    for (const aspect of [1, 16 / 9, 0.5, 2.5]) {
      const vb = fitViewBox(pts, aspect, 0);
      assert.ok(
        Math.abs(vb.width / vb.height - aspect) < 1e-9,
        `aspect ${aspect} came back as ${vb.width / vb.height}`,
      );
    }
  });

  it('grows the short axis rather than cropping the content', () => {
    const pts: FeetPoint[] = [
      [0, 0],
      [1000, 1000],
    ];
    const vb = fitViewBox(pts, 3, 0);
    // Wide canvas over a square course: width grows, height is the course's.
    assert.equal(vb.height, 1000);
    assert.equal(vb.width, 3000);
    // and the content still sits inside the box
    assert.ok(vb.minX <= 0 && vb.minX + vb.width >= 1000);
  });

  it('keeps the course inside the box on both axes, in SVG space', () => {
    const pts: FeetPoint[] = [
      [-500, -200],
      [700, 900],
    ];
    const vb = fitViewBox(pts, 1.5, 100);
    for (const p of pts) {
      const [x, y] = toSvg(p);
      assert.ok(x >= vb.minX && x <= vb.minX + vb.width, `x ${x} outside`);
      assert.ok(y >= vb.minY && y <= vb.minY + vb.height, `y ${y} outside`);
    }
  });

  it('survives an empty course without dividing by zero', () => {
    const vb = fitViewBox([], 2);
    assert.ok(Number.isFinite(vb.width) && vb.width > 0);
    assert.ok(Number.isFinite(vb.height) && vb.height > 0);
  });
});

describe('toSvg', () => {
  it('flips north to down exactly once', () => {
    assert.deepEqual(toSvg([10, 20]), [10, -20]);
  });
});

describe('toPath', () => {
  it('moves once then lines', () => {
    assert.equal(
      toPath([
        [0, 0],
        [10, 10],
        [20, 0],
      ]),
      'M0.0 0.0 L10.0 -10.0 L20.0 0.0',
    );
  });

  it('is empty for no points rather than emitting a broken d', () => {
    assert.equal(toPath([]), '');
  });
});

describe('labelPlacement', () => {
  it('sits at the midpoint BY LENGTH, not the middle vertex', () => {
    // Three points clustered at the start, one long run to the end. The middle
    // VERTEX is at x=10; the halfway point by length is at x=500.
    const p = labelPlacement([
      [0, 0],
      [5, 0],
      [10, 0],
      [1000, 0],
    ]);
    assert.ok(p);
    assert.ok(Math.abs(p.x - 500) < 1, `label landed at ${p.x}`);
  });

  it('never returns an upside-down angle', () => {
    for (const b of [
      [-100, 0],
      [-100, -100],
      [0, -100],
      [100, -100],
    ] as FeetPoint[]) {
      const p = labelPlacement([[0, 0], b]);
      assert.ok(p);
      assert.ok(p.angle >= -90 && p.angle <= 90, `angle ${p.angle} would read upside down`);
    }
  });

  it('declines a degenerate trail instead of returning NaN', () => {
    assert.equal(labelPlacement([[5, 5]]), null);
    assert.equal(
      labelPlacement([
        [5, 5],
        [5, 5],
      ]),
      null,
    );
  });
});

describe('labelWorthy', () => {
  it('drops unnamed ways and stubs shorter than the label would be', () => {
    const out = labelWorthy(
      [
        trail('Long Trail', [
          [0, 0],
          [2000, 0],
        ]),
        trail('Stub', [
          [0, 0],
          [100, 0],
        ]),
        trail(null, [
          [0, 0],
          [2000, 0],
        ]),
      ],
      600,
    );
    assert.deepEqual(
      out.map((t) => t.name),
      ['Long Trail'],
    );
  });
});

describe('oneLabelPerName', () => {
  it('keeps the longest run of a name, because OSM splits trails on tag changes', () => {
    const out = oneLabelPerName([
      trail('Ponderosa Trail (B)', [
        [0, 0],
        [100, 0],
      ]),
      trail('Ponderosa Trail (B)', [
        [0, 0],
        [900, 0],
      ]),
      trail('Furnas Trail (F)', [
        [0, 0],
        [400, 0],
      ]),
    ]);
    assert.equal(out.length, 2);
    const pond = out.find((t) => t.name === 'Ponderosa Trail (B)');
    assert.equal(pond?.points[1][0], 900);
  });
});

describe('simplify', () => {
  it('keeps the endpoints', () => {
    const pts: FeetPoint[] = [
      [0, 0],
      [10, 1],
      [20, 0],
      [30, 40],
    ];
    const out = simplify(pts, 5);
    assert.deepEqual(out[0], [0, 0]);
    assert.deepEqual(out[out.length - 1], [30, 40]);
  });

  it('drops points that sit within tolerance of the chord', () => {
    const pts: FeetPoint[] = [
      [0, 0],
      [50, 1],
      [100, 0],
    ];
    assert.equal(simplify(pts, 5).length, 2);
    assert.equal(simplify(pts, 0.5).length, 3);
  });

  it('keeps a real corner at any sane tolerance', () => {
    const pts: FeetPoint[] = [
      [0, 0],
      [100, 500],
      [200, 0],
    ];
    assert.equal(simplify(pts, 15).length, 3);
  });

  it('does not blow the stack on a long track, which is the whole point of the iterative form', () => {
    // A recursive Douglas-Peucker overflows here; 22k points with a small
    // tolerance is exactly the real input.
    const pts: FeetPoint[] = Array.from({ length: 30000 }, (_, i) => [i, Math.sin(i / 7) * 40]);
    const out = simplify(pts, 1);
    assert.ok(out.length > 2 && out.length < pts.length);
  });

  it('returns short inputs untouched', () => {
    assert.deepEqual(simplify([[1, 2]], 5), [[1, 2]]);
    assert.deepEqual(
      simplify(
        [
          [1, 2],
          [3, 4],
        ],
        5,
      ),
      [
        [1, 2],
        [3, 4],
      ],
    );
  });
});
