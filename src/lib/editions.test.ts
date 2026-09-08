// Tests for the edition derivation behind /results.
//
// Three of these guard decisions that are easy to undo by accident: that a year
// the archive lost still appears in the list, that a trekker cannot be shown as
// the winner of a race they were not eligible to win, and that finishing order
// follows the timer's own placings rather than being recomputed from times.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { summariseEditions, editionFor, boardsFor, type ResultRow } from './editions.ts';

const D = [
  { slug: '50k', name: '50K' },
  { slug: '27k', name: '27K' },
];

const r = (o: Partial<ResultRow>): ResultRow => ({
  year: 2025,
  distanceSlug: '50k',
  gender: 'M',
  timeSeconds: 14000,
  name: 'Someone',
  ...o,
});

describe('summariseEditions', () => {
  it('lists editions newest first', () => {
    const out = summariseEditions([r({ year: 2011 }), r({ year: 2025 }), r({ year: 2017 })], D);
    assert.deepEqual(
      out.map((e) => e.year),
      [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011],
    );
  });

  it('keeps a year with no results on file, and marks it missing', () => {
    // 2020 is the real case: the race was run, and the results are gone. An
    // archive that silently skipped it would imply the race did not happen.
    const out = summariseEditions([r({ year: 2019 }), r({ year: 2021 })], D);
    const y2020 = out.find((e) => e.year === 2020);
    assert.equal(y2020?.missing, true);
    assert.equal(y2020?.total, 0);
    assert.deepEqual(y2020?.distances, []);
  });

  it('does not invent years outside the span', () => {
    const out = summariseEditions([r({ year: 2024 }), r({ year: 2025 })], D);
    assert.deepEqual(
      out.map((e) => e.year),
      [2025, 2024],
    );
  });

  it('ignores rows with no year rather than bucketing them', () => {
    const out = summariseEditions([r({ year: 2025 }), r({ year: null })], D);
    assert.equal(out.length, 1);
    assert.equal(out[0].total, 1);
  });

  it('returns nothing for an empty archive', () => {
    assert.deepEqual(summariseEditions([], D), []);
  });
});

describe('boardsFor', () => {
  it('orders distances the way the race lists them, and drops empty ones', () => {
    const boards = boardsFor([r({ distanceSlug: '27k' }), r({ distanceSlug: '50k' })], D);
    assert.deepEqual(
      boards.map((b) => b.slug),
      ['50k', '27k'],
    );
    assert.deepEqual(
      boardsFor([r({ distanceSlug: '27k' })], D).map((b) => b.slug),
      ['27k'],
    );
  });

  it('follows the timer placings, not the times', () => {
    // A timer that placed someone ahead knew something this code does not.
    const boards = boardsFor(
      [
        r({ name: 'Second', place: 2, timeSeconds: 100 }),
        r({ name: 'First', place: 1, timeSeconds: 200 }),
      ],
      D,
    );
    assert.deepEqual(
      boards[0].rows.map((x) => x.name),
      ['First', 'Second'],
    );
  });

  it('falls back to time when a year carries no placings', () => {
    const boards = boardsFor(
      [r({ name: 'Slow', timeSeconds: 200 }), r({ name: 'Fast', timeSeconds: 100 })],
      D,
    );
    assert.deepEqual(
      boards[0].rows.map((x) => x.name),
      ['Fast', 'Slow'],
    );
  });

  it('sorts an unplaced, untimed row last instead of first', () => {
    const boards = boardsFor(
      [r({ name: 'Blank', place: null, timeSeconds: null }), r({ name: 'Real', place: 1 })],
      D,
    );
    assert.deepEqual(
      boards[0].rows.map((x) => x.name),
      ['Real', 'Blank'],
    );
  });
});

describe('winners', () => {
  it('names the fastest man and the fastest woman', () => {
    const boards = boardsFor(
      [
        r({ name: 'Man A', gender: 'M', timeSeconds: 200 }),
        r({ name: 'Man B', gender: 'M', timeSeconds: 100 }),
        r({ name: 'Woman A', gender: 'F', timeSeconds: 150 }),
      ],
      D,
    );
    assert.deepEqual(boards[0].winners, [
      { gender: 'M', row: boards[0].rows.find((x) => x.name === 'Man B')! },
      { gender: 'F', row: boards[0].rows.find((x) => x.name === 'Woman A')! },
    ]);
  });

  it('never hands a trekker the win', () => {
    // Trekkers take the optional early start and are ineligible for awards.
    // Their times are real and are shown; they cannot win.
    const boards = boardsFor(
      [
        r({ name: 'Trekker', gender: 'M', timeSeconds: 100, trekker: true }),
        r({ name: 'Racer', gender: 'M', timeSeconds: 200 }),
      ],
      D,
    );
    assert.equal(boards[0].winners[0].row.name, 'Racer');
    // ...but is still in the field.
    assert.equal(boards[0].finishers, 2);
  });

  it('skips a gender with no valid time rather than showing a blank winner', () => {
    const boards = boardsFor(
      [r({ gender: 'M', timeSeconds: 100 }), r({ gender: 'F', timeSeconds: null })],
      D,
    );
    assert.deepEqual(
      boards[0].winners.map((w) => w.gender),
      ['M'],
    );
  });
});

describe('editionFor', () => {
  it('returns null for a year with nothing on file', () => {
    assert.equal(editionFor([r({ year: 2025 })], 2020, D), null);
  });

  it('counts only the year asked for', () => {
    const e = editionFor([r({ year: 2025 }), r({ year: 2025 }), r({ year: 2024 })], 2025, D);
    assert.equal(e?.total, 2);
  });
});
