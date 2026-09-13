import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fastestByBracket, type LeaderRow } from './bracket-leaders.ts';

const r = (
  name: string,
  age: number | null,
  timeSeconds: number,
  extra: Partial<LeaderRow> = {},
): LeaderRow => ({
  name,
  slug: name.toLowerCase(),
  age,
  gender: 'M',
  timeSeconds,
  ...extra,
});

describe('fastestByBracket', () => {
  it('takes the fastest in each bracket, in bracket order', () => {
    const out = fastestByBracket(
      [r('slow40', 45, 300), r('fast40', 44, 100), r('a20', 25, 200)],
      'M',
    );
    assert.deepEqual(
      out.map((x) => [x.bracket, x.row.name]),
      [
        ['u30', 'a20'],
        ['40s', 'fast40'],
      ],
    );
  });

  it('returns only brackets that have somebody', () => {
    const out = fastestByBracket([r('one', 35, 100)], 'M');
    assert.deepEqual(
      out.map((x) => x.bracket),
      ['30s'],
    );
  });

  it('keeps the genders apart', () => {
    const rows = [r('man', 35, 200), r('woman', 35, 100, { gender: 'F' })];
    assert.deepEqual(
      fastestByBracket(rows, 'M').map((x) => x.row.name),
      ['man'],
    );
    assert.deepEqual(
      fastestByBracket(rows, 'F').map((x) => x.row.name),
      ['woman'],
    );
  });

  it('excludes trekkers, who are ineligible by the race rule', () => {
    const out = fastestByBracket([r('trek', 35, 100, { trekker: true }), r('real', 35, 200)], 'M');
    assert.deepEqual(
      out.map((x) => x.row.name),
      ['real'],
    );
  });

  it('skips a row with no age rather than guessing a bracket', () => {
    // 2006 has no ages on file at all, so that year renders nothing.
    assert.deepEqual(fastestByBracket([r('ageless', null, 100)], 'M'), []);
  });

  it('ignores a row with no usable time', () => {
    const out = fastestByBracket([r('notime', 35, 0), r('real', 35, 200)], 'M');
    assert.deepEqual(
      out.map((x) => x.row.name),
      ['real'],
    );
  });

  it('returns nothing for a gender nobody ran', () => {
    assert.deepEqual(fastestByBracket([r('man', 35, 100)], 'F'), []);
  });
});
