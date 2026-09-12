// Tests for the records derivation.
//
// The two published inconsistencies on the live site are used here as fixtures,
// because the point of deriving records is that they become impossible. If
// these tests pass, the class of bug that put one 1:58:36 under two different
// years cannot recur.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AGE_BRACKETS,
  bracketForAge,
  bracketRecords,
  courseRecord,
  type ResultLike,
  type HistoricalLike,
  fastestOnFile,
} from './age-brackets.ts';

const r = (name: string, age: number, timeSeconds: number, year: number): ResultLike => ({
  athlete: { name },
  age,
  timeSeconds,
  year,
});

describe('bracketForAge', () => {
  it('places ages in the published brackets', () => {
    assert.equal(bracketForAge(18)?.id, 'u30');
    assert.equal(bracketForAge(29)?.id, 'u30');
    assert.equal(bracketForAge(30)?.id, '30s');
    assert.equal(bracketForAge(39)?.id, '30s');
    assert.equal(bracketForAge(40)?.id, '40s');
    assert.equal(bracketForAge(69)?.id, '60s');
    assert.equal(bracketForAge(70)?.id, '70plus');
    assert.equal(bracketForAge(94)?.id, '70plus');
  });

  it('returns null rather than guessing when the age is missing', () => {
    // A missing age must not land in "Under 30" and take a record off someone.
    assert.equal(bracketForAge(null), null);
    assert.equal(bracketForAge(undefined), null);
    assert.equal(bracketForAge(Number.NaN), null);
    assert.equal(bracketForAge(-3), null);
  });

  it('covers every age with exactly one bracket', () => {
    for (let age = 0; age <= 100; age += 1) {
      const hits = AGE_BRACKETS.filter((b) => age >= b.min && age <= b.max);
      assert.equal(hits.length, 1, `age ${age} matched ${hits.length} brackets`);
    }
  });
});

describe('bracketRecords', () => {
  it('keeps the fastest per bracket', () => {
    const rows = bracketRecords([
      r('Slower Thirty', 33, 15000, 2019),
      r('Faster Thirty', 35, 13256, 2021),
      r('A Forty', 44, 15377, 2018),
    ]);
    const thirties = rows.find((x) => x.bracket === '30s');
    assert.equal(thirties?.athlete, 'Faster Thirty');
    assert.equal(thirties?.timeSeconds, 13256);
  });

  it('returns every bracket, so an unclaimed one renders rather than vanishing', () => {
    const rows = bracketRecords([r('Only Runner', 35, 13256, 2021)]);
    assert.equal(rows.length, AGE_BRACKETS.length);
    const seventies = rows.find((x) => x.bracket === '70plus');
    assert.equal(seventies?.athlete, null);
    assert.equal(seventies?.timeSeconds, null);
  });

  it('ignores results with no usable age or time', () => {
    const rows = bracketRecords([
      { athlete: { name: 'No Age' }, timeSeconds: 1000, year: 2020 },
      { athlete: { name: 'No Time' }, age: 35, year: 2020 },
      { athlete: { name: 'Zero Time' }, age: 35, timeSeconds: 0, year: 2020 },
    ]);
    assert.ok(rows.every((x) => x.athlete === null));
  });

  it('lets a transcribed historical record hold a bracket no result can reach', () => {
    // Kim Martin's 2007 40-to-49 mark predates the results archive entirely.
    const historical: HistoricalLike[] = [
      { athlete: { name: 'Kim Martin' }, bracket: '40s', timeSeconds: 18768, year: 2007 },
    ];
    const rows = bracketRecords([], historical);
    const forties = rows.find((x) => x.bracket === '40s');
    assert.equal(forties?.athlete, 'Kim Martin');
    assert.equal(forties?.historical, true);
  });

  it('lets a real result beat a historical record, and drops the historical flag', () => {
    const historical: HistoricalLike[] = [
      { athlete: { name: 'Old Mark' }, bracket: '40s', timeSeconds: 18768, year: 2007 },
    ];
    const rows = bracketRecords([r('New Mark', 44, 17000, 2025)], historical);
    const forties = rows.find((x) => x.bracket === '40s');
    assert.equal(forties?.athlete, 'New Mark');
    assert.equal(forties?.year, 2025);
    assert.equal(forties?.historical, undefined);
  });

  it('keeps the historical record when it is still faster', () => {
    const historical: HistoricalLike[] = [
      { athlete: { name: 'Old Mark' }, bracket: '40s', timeSeconds: 15377, year: 2009 },
    ];
    const rows = bracketRecords([r('Slower Recent', 44, 17000, 2025)], historical);
    assert.equal(rows.find((x) => x.bracket === '40s')?.athlete, 'Old Mark');
  });

  it('excludes trekkers, who are ineligible for awards', () => {
    // The race states that the optional early start forfeits age group and
    // overall awards. The time stays real and is shown in the results; it just
    // cannot take a record off someone who started with the field.
    const rows = bracketRecords([
      { athlete: { name: 'Trekker' }, age: 35, timeSeconds: 10000, year: 2006, trekker: true },
      { athlete: { name: 'Racer' }, age: 35, timeSeconds: 15000, year: 2006 },
    ]);
    const thirties = rows.find((x) => x.bracket === '30s');
    assert.equal(thirties?.athlete, 'Racer');
    assert.equal(thirties?.timeSeconds, 15000);
  });

  it('carries a sourceNote through', () => {
    const rows = bracketRecords(
      [],
      [
        {
          athlete: { name: 'Brian List' },
          bracket: 'u30',
          timeSeconds: 7116,
          year: 2010,
          sourceNote: 'Published as 2010 here and 2011 in the course row, at the same time.',
        },
      ],
    );
    assert.match(rows.find((x) => x.bracket === 'u30')?.sourceNote ?? '', /2011/);
  });
});

describe('courseRecord', () => {
  it('is the fastest row across every bracket', () => {
    const rows = bracketRecords([
      r('Riddle', 31, 13256, 2011),
      r('A Forty', 44, 15377, 2009),
      r('A Fifty', 54, 17315, 2011),
    ]);
    const course = courseRecord(rows);
    assert.equal(course?.athlete, 'Riddle');
    assert.equal(course?.timeSeconds, 13256);
  });

  it('agrees with the age row it came from, by construction', () => {
    // THE POINT OF THE WHOLE MODEL. The live site stores the course record as a
    // hand-copied duplicate of an age row, and the two copies disagree about
    // the year in two separate places. Derived, they are the same object, so
    // they cannot disagree.
    const rows = bracketRecords([r('Brian List', 28, 7116, 2010)]);
    const course = courseRecord(rows);
    const under30 = rows.find((x) => x.bracket === 'u30');
    assert.equal(course?.year, under30?.year);
    assert.equal(course?.athlete, under30?.athlete);
    assert.equal(course?.timeSeconds, under30?.timeSeconds);
  });

  it('is null when nobody holds anything', () => {
    assert.equal(courseRecord(bracketRecords([])), null);
  });
});

// ── fastestOnFile ────────────────────────────────────────────────────────
// The gate on the contradiction Nathan found: a course record whose holder was
// missing from the list of the fastest, because the list read results only and
// that record predates the archive.
describe('fastestOnFile', () => {
  const res = (name: string, year: number, timeSeconds: number) => ({
    athlete: { name, slug: name.toLowerCase().replace(/\s+/g, '-') },
    year,
    timeSeconds,
  });

  it('ranks results by time', () => {
    const out = fastestOnFile([res('B', 2020, 200), res('A', 2019, 100)]);
    assert.deepEqual(
      out.map((r) => r.athlete?.name),
      ['A', 'B'],
    );
  });

  it('includes a transcribed record that has no result behind it', () => {
    // Brian List's 1:58:36, in a 27K archive that starts after his year.
    const out = fastestOnFile([res('Riddle', 2017, 7172)], [res('List', 2010, 7116)]);
    assert.deepEqual(
      out.map((r) => r.athlete?.name),
      ['List', 'Riddle'],
    );
    assert.equal(out[0].historical, true);
  });

  it('drops a transcribed record when a result already carries that time', () => {
    // Even when the two disagree about the YEAR, which the race's own tables do.
    const out = fastestOnFile([res('Ruhlman', 2021, 8920)], [res('Ruhlman', 2010, 8920)]);
    assert.equal(out.length, 1);
    assert.equal(out[0].year, 2021);
    assert.equal(out[0].historical, undefined);
  });

  it('ignores rows with no usable time', () => {
    const out = fastestOnFile(
      [res('A', 2019, 100), { athlete: { name: 'X' }, year: 2019, timeSeconds: null }],
      [{ athlete: { name: 'Y' }, year: 2009, timeSeconds: 0 }],
    );
    assert.deepEqual(
      out.map((r) => r.athlete?.name),
      ['A'],
    );
  });

  it('honours the limit', () => {
    const many = Array.from({ length: 20 }, (_, i) => res(`R${i}`, 2020, 100 + i));
    assert.equal(fastestOnFile(many, [], 10).length, 10);
  });
});
