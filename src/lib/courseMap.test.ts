// Tests for the geometry the build pipeline still uses.
//
// This file used to test a small cartography library (viewBox fitting, label
// angles, zoom tiers, a scale bar). That code drove a hand-drawn SVG basemap
// and went when the map became MapLibre. What remains is `simplify`, which is
// still what turns 22,412 recorded track points into 978 drawn ones, and still
// has the one property worth asserting: it must not blow the stack.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { simplify } from '../../scripts/lib/course.mjs';

type Pt = [number, number];

describe('simplify', () => {
  it('keeps the endpoints', () => {
    const pts: Pt[] = [
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
    const pts: Pt[] = [
      [0, 0],
      [50, 1],
      [100, 0],
    ];
    assert.equal(simplify(pts, 5).length, 2);
    assert.equal(simplify(pts, 0.5).length, 3);
  });

  it('keeps a real corner at any sane tolerance', () => {
    const pts: Pt[] = [
      [0, 0],
      [100, 500],
      [200, 0],
    ];
    assert.equal(simplify(pts, 15).length, 3);
  });

  it('does not blow the stack on a long track, which is the whole point of the iterative form', () => {
    // A recursive Douglas-Peucker overflows here; 22k points with a small
    // tolerance is exactly the real input.
    const pts: Pt[] = Array.from({ length: 30000 }, (_, i) => [i, Math.sin(i / 7) * 40]);
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
