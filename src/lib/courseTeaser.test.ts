// Tests for the home page course plate's geometry.
//
// The plate is drawn from the same recorded run as /course, so what is worth
// pinning is that it stays inside its own box, keeps seven laps in the race's
// order, and never states a number the race does not.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildCourseTeaser, sparkPath, type TeaserSource } from './courseTeaser.ts';

const read = (name: string) =>
  JSON.parse(readFileSync(new URL(`../../scripts/data/${name}.json`, import.meta.url), 'utf8'));

const source: TeaserSource = {
  profile: read('course-profile'),
  courseMap: read('course-map'),
  grade: read('course-grade'),
  miles: read('course-miles'),
};
const teaser = buildCourseTeaser(source);

describe('buildCourseTeaser', () => {
  it('keeps seven laps in race order, long and short alternating', () => {
    assert.deepEqual(
      teaser.laps.map((l) => l.kind),
      ['long', 'short', 'long', 'short', 'long', 'short', 'long'],
    );
    assert.deepEqual(
      teaser.laps.map((l) => l.index),
      [1, 2, 3, 4, 5, 6, 7],
    );
  });

  it('states the published distances, not the GPS ones', () => {
    for (const lap of teaser.laps) assert.equal(lap.miles, lap.kind === 'long' ? 5.3 : 3.2);
  });

  it('draws every route point inside the viewBox', () => {
    for (const d of [teaser.routes.long, teaser.routes.short]) {
      const nums = [...d.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)];
      assert.ok(nums.length > 50);
      for (const [, x, y] of nums) {
        assert.ok(Number(x) >= 0 && Number(x) <= teaser.width, `x ${x}`);
        assert.ok(Number(y) >= 0 && Number(y) <= teaser.height, `y ${y}`);
      }
    }
  });

  it('gives each lap an even, ordered profile that starts and ends at the Oval', () => {
    for (const lap of teaser.laps) {
      assert.equal(lap.samples[0][0], 0);
      assert.equal(lap.samples[lap.samples.length - 1][0], 1);
      assert.ok(Math.abs(lap.samples[0][1] - lap.samples[lap.samples.length - 1][1]) < 30);
    }
  });

  it('puts every label on the plate', () => {
    assert.deepEqual(
      teaser.labels.map((l) => l.key),
      ['oval', 'steps', 'low', 'high'],
    );
    for (const l of teaser.labels) {
      assert.ok(l.left >= 0 && l.left <= 100 && l.top >= 0 && l.top <= 100, l.key);
    }
  });

  it('finds steep pitches on the long loop', () => {
    assert.ok(teaser.steep.long.startsWith('M'));
  });
});

describe('sparkPath', () => {
  it('maps the lowest sample to the bottom edge and the highest to the top', () => {
    const d = sparkPath(
      [
        [0, 100],
        [1, 200],
      ],
      100,
      200,
      60,
      20,
    );
    assert.equal(d, 'M0.0,20.0L60.0,0.0');
  });
});
