import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { heightAt, heightRange, verticalExaggeration, type TerrainData } from './courseTerrain.ts';

/** A 3x3 field over a 200x200 box, rising 100 ft west to east. */
const ramp: TerrainData = {
  grid: 3,
  box: { minX: 0, maxX: 200, minY: 0, maxY: 200 },
  heights: [0, 50, 100, 0, 50, 100, 0, 50, 100],
};

describe('heightAt', () => {
  it('returns the sample exactly on a grid node', () => {
    assert.equal(heightAt(ramp, 0, 0), 0);
    assert.equal(heightAt(ramp, 100, 0), 50);
    assert.equal(heightAt(ramp, 200, 200), 100);
  });

  it('interpolates between nodes rather than stepping', () => {
    // Halfway between the 0 and 50 nodes. Nearest-neighbour would answer 0 or
    // 50 and the draped route would climb this hill as a staircase.
    assert.equal(heightAt(ramp, 50, 0), 25);
    assert.equal(heightAt(ramp, 150, 100), 75);
  });

  it('clamps outside the box instead of returning NaN', () => {
    for (const [x, y] of [
      [-1000, -1000],
      [9999, 9999],
      [-5, 100],
      [100, 9999],
    ]) {
      const h = heightAt(ramp, x, y);
      assert.ok(Number.isFinite(h), `height at ${x},${y} was ${h}`);
      assert.ok(h >= 0 && h <= 100, `height at ${x},${y} was ${h}`);
    }
  });

  it('interpolates on both axes', () => {
    const bowl: TerrainData = {
      grid: 2,
      box: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
      heights: [0, 10, 10, 20],
    };
    assert.equal(heightAt(bowl, 5, 5), 10);
    assert.equal(heightAt(bowl, 0, 10), 10);
  });
});

describe('heightRange', () => {
  it('finds the extremes', () => {
    assert.deepEqual(heightRange(ramp), { lo: 0, hi: 100 });
  });
});

describe('verticalExaggeration', () => {
  it('stretches gentle terrain, because true scale reads as a plate', () => {
    // Mt. Airy's real shape: about 370 ft of relief over a 7,700 ft box.
    const gentle: TerrainData = {
      grid: 2,
      box: { minX: 0, maxX: 7700, minY: 0, maxY: 7700 },
      heights: [530, 900, 530, 900],
    };
    const k = verticalExaggeration(gentle);
    assert.ok(k > 3 && k <= 6, `exaggeration was ${k}`);
  });

  it('does not flatten terrain that is already steep', () => {
    const steep: TerrainData = {
      grid: 2,
      box: { minX: 0, maxX: 1000, minY: 0, maxY: 1000 },
      heights: [0, 2000, 0, 2000],
    };
    // Would want 0.11; clamped to 1 so a mountain is never squashed.
    assert.equal(verticalExaggeration(steep), 1);
  });

  it('is capped, so a flat course is not turned into the Alps', () => {
    const flat: TerrainData = {
      grid: 2,
      box: { minX: 0, maxX: 7700, minY: 0, maxY: 7700 },
      heights: [100, 101, 100, 101],
    };
    assert.equal(verticalExaggeration(flat), 6);
  });

  it('survives dead-flat ground without dividing by zero', () => {
    const dead: TerrainData = {
      grid: 2,
      box: { minX: 0, maxX: 100, minY: 0, maxY: 100 },
      heights: [7, 7, 7, 7],
    };
    assert.ok(Number.isFinite(verticalExaggeration(dead)));
  });
});
