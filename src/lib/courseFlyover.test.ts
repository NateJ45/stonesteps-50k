// Tests for the flyover maths.
//
// Three of these guard bugs that are invisible in code review and obvious on
// screen: a camera that spins the long way round the compass, a camera that
// races the straights and crawls the switchbacks, and a colour ramp whose scale
// is set by one staircase.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  indexAtMile,
  sampleAt,
  bearingBetween,
  bearingAt,
  angleDelta,
  easeBearing,
  mileAtElapsed,
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

describe('bearingBetween', () => {
  it('reads due east as 90 and due north as 0', () => {
    assert.ok(Math.abs(bearingBetween([-84.6, 39.17], [-84.5, 39.17]) - 90) < 0.5);
    assert.ok(Math.abs(bearingBetween([-84.6, 39.17], [-84.6, 39.27]) - 0) < 0.5);
    assert.ok(Math.abs(bearingBetween([-84.6, 39.17], [-84.7, 39.17]) - 270) < 0.5);
  });
});

describe('bearingAt', () => {
  it('points down the route', () => {
    assert.ok(Math.abs(bearingAt(straight, 0) - 90) < 2);
  });

  it('holds the last heading at the finish instead of returning nothing', () => {
    const b = bearingAt(straight, 3);
    assert.ok(Number.isFinite(b));
    assert.ok(Math.abs(b - 90) < 2);
  });
});

describe('angleDelta and easeBearing', () => {
  it('takes the SHORT way round the compass', () => {
    // 350 to 10 is +20, not -340. Getting this wrong makes the camera spin
    // most of a full turn every time the route crosses north, which on a loop
    // course is constantly.
    assert.equal(angleDelta(350, 10), 20);
    assert.equal(angleDelta(10, 350), -20);
    // Exactly half a turn is genuinely ambiguous: -180 and +180 describe the
    // same rotation and either is a correct answer. Assert the magnitude, not
    // a sign the implementation was never obliged to pick.
    assert.equal(Math.abs(angleDelta(0, 180)), 180);
  });

  it('eases across the 360 boundary without spinning', () => {
    const b = easeBearing(350, 10, 0.5);
    // Halfway from 350 to 10 the short way is 0, not 180.
    assert.ok(b > 359 || b < 1, `eased to ${b}`);
  });

  it('stays inside 0..360', () => {
    for (const [from, to] of [
      [350, 10],
      [10, 350],
      [0, 359],
      [180, 0],
    ]) {
      const b = easeBearing(from, to, 0.3);
      assert.ok(b >= 0 && b < 360, `${from}->${to} gave ${b}`);
    }
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
