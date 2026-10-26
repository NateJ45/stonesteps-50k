import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pickResultRows, distanceFromEventName } from './result-sets.mjs';

const row = (bib, place, time, extra = {}) => ({
  bib,
  place,
  first_name: `R${bib}`,
  last_name: 'Runner',
  clock_time: time,
  chip_time: '',
  result_id: `${bib}-${place}`,
  ...extra,
});

describe('pickResultRows', () => {
  it('takes the largest set when there is no trekker set (2017 to 2025)', () => {
    const out = pickResultRows([
      { individual_result_set_name: 'Masters', results: [row(1, 1, '5:00:00')] },
      {
        individual_result_set_name: 'Overall 50K',
        results: [row(1, 1, '5:00:00'), row(2, 2, '5:10:00')],
      },
    ]);
    assert.equal(out.rows.length, 2);
    assert.equal(out.trekkers, 0);
  });

  it('2026 shape: trekker blank in Overall, timed in Including', () => {
    const out = pickResultRows([
      {
        individual_result_set_name: '27K Overall Results',
        results: [row(10, 1, '2:30:00'), row(11, 2, '2:40:00'), row(99, '', '')],
      },
      {
        individual_result_set_name: '27K Including Trekkers',
        results: [row(10, 1, '2:30:00'), row(99, 2, '2:35:00'), row(11, 3, '2:40:00')],
      },
    ]);
    assert.deepEqual(
      out.rows.map((r) => [r.bib, r.place, r.trekker ?? false]),
      [
        [10, 1, false],
        [11, 2, false],
        [99, 2, true],
      ],
    );
    assert.equal(out.trekkers, 1);
  });

  it('a trekker absent from Overall altogether is still flagged', () => {
    const out = pickResultRows([
      { individual_result_set_name: 'Overall 50K', results: [row(1, 1, '5:00:00')] },
      { individual_result_set_name: '50K Trekker Results', results: [row(7, 1, '6:00:00')] },
    ]);
    assert.equal(out.trekkers, 1);
    assert.equal(out.rows.find((r) => r.bib === 7).trekker, true);
  });

  it('a DNF in both sets is not a trekker', () => {
    const out = pickResultRows([
      { individual_result_set_name: 'Overall', results: [row(1, 1, '5:00:00'), row(2, '', 'DNF')] },
      {
        individual_result_set_name: 'Including Trekkers',
        results: [row(1, 1, '5:00:00'), row(2, '', 'DNF')],
      },
    ]);
    assert.equal(out.trekkers, 0);
    assert.equal(out.rows.length, 2);
  });

  it('matches on name when a row has no bib', () => {
    const out = pickResultRows([
      { individual_result_set_name: 'Overall', results: [row('', 1, '')] },
      { individual_result_set_name: 'Trekkers', results: [row('', 1, '6:00:00')] },
    ]);
    assert.equal(out.rows.length, 1);
    assert.equal(out.rows[0].trekker, true);
  });

  it('imports a lone combined set rather than dropping the year, with a note', () => {
    const out = pickResultRows([
      { individual_result_set_name: '50K Including Trekkers', results: [row(1, 1, '5:00:00')] },
    ]);
    assert.equal(out.rows.length, 1);
    assert.equal(out.rows[0].trekker, undefined);
    assert.ok(out.note);
  });

  it('returns nothing for an event with no published results', () => {
    assert.deepEqual(pickResultRows([]), { rows: [], trekkers: 0 });
    assert.deepEqual(pickResultRows(undefined), { rows: [], trekkers: 0 });
  });
});

describe('distanceFromEventName', () => {
  it('reads every spelling seen or likely', () => {
    for (const n of ['50K', '50k', ' 50 K ', 'Stone Steps 50K Trail Run', '50km'])
      assert.equal(distanceFromEventName(n), '50k', n);
    for (const n of ['27K', '27k', 'Stone Steps 27K'])
      assert.equal(distanceFromEventName(n), '27k', n);
  });
  it('refuses anything else', () => {
    for (const n of ['5K', '150K', 'Kids Run', 'Volunteer', '', undefined])
      assert.equal(distanceFromEventName(n), null, String(n));
  });
});
