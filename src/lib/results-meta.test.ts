// Tests for the per-year results meta description.
//
// The audit flagged these as short and near-duplicate, so the two things that
// matter are pinned: every year lands inside 120 to 155 characters, and no two
// years share a description. Fixtures mirror the real archive's shape (long and
// short names, early single-distance years, a year with no winner name, a year
// with no weather row) without depending on the live dataset.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resultsDescription, MIN_LEN, MAX_LEN, type MetaEdition } from './results-meta.ts';
import { type RaceDay } from './raceWeather.ts';
import weather from '../data/raceDayWeather.json' with { type: 'json' };

const days = weather as RaceDay[];
const dayFor = (year: number) => days.find((d) => d.year === year) ?? null;

const NAMES = [
  'Tom Possert',
  'Jay Smithberger',
  'Jonathan Hastings',
  'Isaac Leighninger',
  'Steven McMillian',
  'Zachary Holtkamp',
  'Ted Bross',
  'Adam Mahler',
];

/** One edition per real race year: 2003-2014 are 50K only, 2015 on add the 27K. */
function editionFor(year: number): MetaEdition {
  const name = NAMES[year % NAMES.length];
  const two = year >= 2015;
  const fifty = {
    name: '50K',
    finishers: 60 + (year % 40),
    winner: { name, seconds: 13000 + year * 7 },
  };
  const twentySeven = {
    name: '27K',
    finishers: 100 + (year % 90),
    winner: { name: NAMES[(year + 3) % NAMES.length], seconds: 7000 + year * 5 },
  };
  const distances = two ? [fifty, twentySeven] : [fifty];
  return { year, total: distances.reduce((n, d) => n + d.finishers, 0), distances };
}

const YEARS = Array.from({ length: 23 }, (_, i) => 2003 + i);

describe('resultsDescription', () => {
  it('keeps every year between 120 and 155 characters', () => {
    for (const y of YEARS) {
      const text = resultsDescription(editionFor(y), dayFor(y));
      assert.ok(text.length >= MIN_LEN, `${y} too short (${text.length}): ${text}`);
      assert.ok(text.length <= MAX_LEN, `${y} too long (${text.length}): ${text}`);
    }
  });

  it('gives every year its own description', () => {
    const texts = YEARS.map((y) => resultsDescription(editionFor(y), dayFor(y)));
    assert.equal(new Set(texts).size, YEARS.length);
  });

  it('uses only facts the page holds and never an em-dash', () => {
    const text = resultsDescription(editionFor(2024), dayFor(2024));
    assert.match(text, /2024/);
    assert.match(text, /50K won by /);
    assert.match(text, /°F/);
    assert.ok(!text.includes('—') && !text.includes('–'));
  });

  it('still reads well with no weather row and no winner name', () => {
    const e = editionFor(2019);
    e.distances[0].winner = null;
    const text = resultsDescription(e, null);
    assert.match(text, /2019/);
    assert.ok(!text.includes('undefined') && !text.includes('null'));
    assert.ok(text.length <= MAX_LEN);
  });

  it('says "1 finisher" for a field of one', () => {
    const text = resultsDescription(
      { year: 2003, total: 1, distances: [{ name: '50K', finishers: 1 }] },
      null,
    );
    assert.match(text, /^1 finisher /);
  });
});
