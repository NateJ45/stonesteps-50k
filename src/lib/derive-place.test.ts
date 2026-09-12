// Gate on the year page and the runner page disagreeing about a place.
// See derive-place.ts.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { derivePlaces, derivedPlaceReport, type PlaceableRow } from './derive-place.ts';

// Annotated, not inferred: without it the literal has no `place` key and the
// generic narrows to a type that does not carry one, so every assertion below
// fails to compile while passing at runtime.
const r = (timeSeconds: number | null, extra: Partial<PlaceableRow> = {}): PlaceableRow => ({
  year: 2014,
  distance: '50k',
  timeSeconds,
  ...extra,
});

describe('derivePlaces', () => {
  it('ranks an unplaced field by time', () => {
    const out = derivePlaces([r(300), r(100), r(200)]);
    assert.deepEqual(
      out.map((x) => x.place),
      [3, 1, 2],
    );
  });

  it('leaves a field the race placed itself completely alone', () => {
    // Even the rows in it that have no place: a partial field means the race
    // published placings and someone is missing one, which is not ours to fill.
    const out = derivePlaces([r(300, { place: 1 }), r(100), r(200, { place: 2 })]);
    assert.deepEqual(
      out.map((x) => x.place),
      [1, undefined, 2],
    );
  });

  it('shares a place on a tie and skips the next, as the race does', () => {
    // 2004 lists Justin Bakken and Molly Moilanen both 10th on 6:56:54.
    const out = derivePlaces([r(100), r(200), r(200), r(300)]);
    assert.deepEqual(
      out.map((x) => x.place),
      [1, 2, 2, 4],
    );
  });

  it('gives a trekker no place but leaves everyone else ranked', () => {
    const out = derivePlaces([r(100), r(150, { trekker: true }), r(200)]);
    assert.deepEqual(
      out.map((x) => x.place),
      [1, undefined, 2],
    );
  });

  it('keeps years and distances separate', () => {
    const out = derivePlaces([r(100), r(200), r(500, { distance: '27k' }), r(900, { year: 2003 })]);
    assert.deepEqual(
      out.map((x) => x.place),
      [1, 2, 1, 1],
    );
  });

  it('ignores a row with no usable time', () => {
    const out = derivePlaces([r(100), r(0), r(null)]);
    assert.deepEqual(
      out.map((x) => x.place),
      [1, undefined, undefined],
    );
  });

  it('does not mutate the rows it was given', () => {
    const input = [r(100), r(200)];
    derivePlaces(input);
    assert.equal(input[0].place, undefined);
  });

  it('reports what it placed, by year', () => {
    const before = [r(100), r(200), r(900, { year: 2003 })];
    assert.deepEqual(derivedPlaceReport(before, derivePlaces(before)), { 2014: 2, 2003: 1 });
  });
});
