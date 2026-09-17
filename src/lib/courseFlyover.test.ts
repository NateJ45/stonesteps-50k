// Tests for the flyover maths.
//
// These guard bugs that are invisible in code review and obvious on screen: a
// camera that races the straights and crawls the switchbacks, a flyover that
// takes the climbs at road pace, and a colour ramp whose scale is set by one
// staircase.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  indexAtMile,
  sampleAt,
  mileAtElapsed,
  gradeSpeedFactor,
  buildPacing,
  pacedMileAtElapsed,
  GRADE_STOPS,
  gradeExpressionStops,
  MILE,
  ELE,
  LOOP,
  type ProfilePoint,
} from './courseFlyover.ts';

/** A straight eastward run of 4 points, one mile apart, climbing 100 ft each. */
const straight: ProfilePoint[] = [
  [-84.6, 39.17, 500, 0, 0, 1],
  [-84.58, 39.17, 600, 1, 5, 1],
  [-84.56, 39.17, 700, 2, 5, 2],
  [-84.54, 39.17, 800, 3, 5, 2],
];

describe('indexAtMile', () => {
  it('finds exact vertices', () => {
    assert.equal(indexAtMile(straight, 0), 0);
    assert.equal(indexAtMile(straight, 2), 2);
    assert.equal(indexAtMile(straight, 3), 3);
  });

  it('returns a FRACTIONAL index so the camera can move between vertices', () => {
    assert.equal(indexAtMile(straight, 1.5), 1.5);
    assert.equal(indexAtMile(straight, 0.25), 0.25);
  });

  it('clamps outside the route instead of running off the end', () => {
    assert.equal(indexAtMile(straight, -10), 0);
    assert.equal(indexAtMile(straight, 999), 3);
  });

  it('survives an empty route', () => {
    assert.equal(indexAtMile([], 5), 0);
  });
});

describe('sampleAt', () => {
  it('interpolates elevation and mile', () => {
    const p = sampleAt(straight, 1.5);
    assert.equal(p[ELE], 650);
    assert.equal(p[MILE], 1.5);
  });

  it('treats the loop number as a LABEL, not a quantity', () => {
    // Halfway between a loop-1 vertex and a loop-2 vertex you are still on
    // loop 1. Averaging would produce "loop 1.5", which is not a thing.
    assert.equal(sampleAt(straight, 1.5)[LOOP], 1);
    assert.equal(sampleAt(straight, 2)[LOOP], 2);
  });

  it('clamps rather than reading off the end of the array', () => {
    assert.deepEqual(sampleAt(straight, 99), straight[3]);
    assert.deepEqual(sampleAt(straight, -5), straight[0]);
  });
});

describe('mileAtElapsed', () => {
  it('advances at a constant ground speed', () => {
    assert.equal(mileAtElapsed(30, 0, 60), 0);
    assert.equal(mileAtElapsed(30, 30, 60), 15);
    assert.equal(mileAtElapsed(30, 60, 60), 30);
  });

  it('clamps at both ends rather than overshooting the finish', () => {
    assert.equal(mileAtElapsed(30, -5, 60), 0);
    assert.equal(mileAtElapsed(30, 120, 60), 30);
  });

  it('does not divide by zero on a zero-length flyover', () => {
    assert.equal(mileAtElapsed(30, 5, 0), 30);
  });
});

describe('GRADE_STOPS', () => {
  it('is symmetric about zero, so colour reads as steepness not direction', () => {
    // Sorted on both sides: the stops ascend from -20 to +20, so negating the
    // downhill half yields it in descending order.
    const ups = GRADE_STOPS.filter(([g]) => g > 0)
      .map(([g]) => g)
      .sort((a, b) => a - b);
    const downs = GRADE_STOPS.filter(([g]) => g < 0)
      .map(([g]) => -g)
      .sort((a, b) => a - b);
    assert.deepEqual(ups, downs);
  });

  it('is clamped well below the steepest pitch on the course', () => {
    // The steps themselves touch +38%. Letting one staircase set the scale
    // would wash out the whole rest of the course.
    const max = Math.max(...GRADE_STOPS.map(([g]) => g));
    assert.ok(max <= 20, `ramp tops out at ${max}%`);
  });

  it('is strictly ascending, which MapLibre requires of interpolate stops', () => {
    const gs = GRADE_STOPS.map(([g]) => g);
    for (let i = 1; i < gs.length; i += 1) {
      assert.ok(gs[i] > gs[i - 1], `stop ${gs[i]} does not exceed ${gs[i - 1]}`);
    }
  });

  it('flattens to alternating number, colour pairs', () => {
    const flat = gradeExpressionStops();
    assert.equal(flat.length, GRADE_STOPS.length * 2);
    for (let i = 0; i < flat.length; i += 2) {
      assert.equal(typeof flat[i], 'number');
      assert.equal(typeof flat[i + 1], 'string');
    }
  });
});

describe('gradeSpeedFactor', () => {
  it('is 1 on the flat', () => {
    assert.equal(gradeSpeedFactor(0), 1);
  });

  it('slows going up and never speeds up going up', () => {
    assert.ok(gradeSpeedFactor(5) < 1);
    assert.ok(gradeSpeedFactor(15) < gradeSpeedFactor(5));
    assert.ok(gradeSpeedFactor(30) < gradeSpeedFactor(15));
  });

  it('buys speed on a runnable descent', () => {
    assert.ok(gradeSpeedFactor(-8) > 1);
  });

  // The one people get wrong: a -35% descent is not four times a -8% one. Past
  // about 12% braking costs more than gravity gives back, and this course
  // touches -38%.
  it('gives the speed back on a descent too steep to run', () => {
    assert.ok(gradeSpeedFactor(-35) < gradeSpeedFactor(-10));
  });

  it('stays inside a watchable range at the extremes', () => {
    for (const g of [-60, -38, 0, 38, 60]) {
      const f = gradeSpeedFactor(g);
      assert.ok(f > 0.3 && f < 2, `factor out of range at ${g}%: ${f}`);
    }
  });
});

describe('buildPacing and pacedMileAtElapsed', () => {
  /** Half a mile of flat, then half a mile at a punishing 20%. */
  const pts: ProfilePoint[] = [];
  for (let i = 0; i <= 20; i += 1) {
    const mile = i / 20;
    const grade = mile <= 0.5 ? 0 : 20;
    pts.push([-84.6 + mile * 0.01, 39.17, 800, mile, grade, 1] as ProfilePoint);
  }
  const cum = buildPacing(pts);

  it('is monotonic, because time does not run backwards', () => {
    for (let i = 1; i < cum.length; i += 1) assert.ok(cum[i] >= cum[i - 1]);
  });

  it('starts at the start and ends at the end', () => {
    assert.equal(pacedMileAtElapsed(pts, cum, 0, 0, 60), 0);
    assert.equal(pacedMileAtElapsed(pts, cum, 0, 60, 60), pts[pts.length - 1][MILE]);
  });

  // THE WHOLE POINT. At the halfway mark in TIME the camera must still be on
  // the flat half, because the climbing half costs more per mile.
  it('spends longer on the climb than on the flat', () => {
    const half = pacedMileAtElapsed(pts, cum, 0, 30, 60);
    assert.ok(half > 0.5, `expected to be past the flat at halfway, got ${half}`);
  });

  it('never goes backwards as time advances', () => {
    let last = -1;
    for (let t = 0; t <= 60; t += 1) {
      const m = pacedMileAtElapsed(pts, cum, 0, t, 60);
      assert.ok(m >= last, `went backwards at ${t}s`);
      last = m;
    }
  });

  it('honours a start part way along', () => {
    const m = pacedMileAtElapsed(pts, cum, 0.75, 0, 60);
    assert.ok(Math.abs(m - 0.75) < 0.01, `expected to start at 0.75, got ${m}`);
  });

  it('survives a degenerate duration rather than dividing by zero', () => {
    assert.equal(pacedMileAtElapsed(pts, cum, 0, 5, 0), pts[pts.length - 1][MILE]);
  });
});
