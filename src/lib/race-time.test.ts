// Round-trip tests for race times.
//
// These matter more than they look. Every record on the site is an ordering on
// timeSeconds, so a parse bug does not show up as a crash: it shows up as the
// wrong person holding a course record, on a page that renders perfectly.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseRaceTime, formatRaceTime, titleCaseName } from './race-time.ts';

describe('parseRaceTime', () => {
  it('parses h:mm:ss', () => {
    assert.equal(parseRaceTime('3:40:56'), 3 * 3600 + 40 * 60 + 56);
    assert.equal(parseRaceTime('4:58:05'), 17885);
  });

  it('truncates fractional seconds rather than rounding', () => {
    // 2024 and 2025 carry hundredths. Rounding would let a runner 0.5s behind
    // tie the runner ahead and reorder the results.
    assert.equal(parseRaceTime('4:35:39.37'), 4 * 3600 + 35 * 60 + 39);
    assert.equal(parseRaceTime('4:35:39.99'), 4 * 3600 + 35 * 60 + 39);
  });

  it('parses mm:ss', () => {
    assert.equal(parseRaceTime('58:05'), 3485);
  });

  it('returns null for the empty chip_time every pre-2024 year carries', () => {
    assert.equal(parseRaceTime(''), null);
    assert.equal(parseRaceTime('   '), null);
    assert.equal(parseRaceTime(null), null);
    assert.equal(parseRaceTime(undefined), null);
  });

  it('returns null rather than guessing at malformed input', () => {
    assert.equal(parseRaceTime('DNF'), null);
    assert.equal(parseRaceTime('4'), null);
    assert.equal(parseRaceTime('1:2:3:4'), null);
    assert.equal(parseRaceTime('4:75:00'), null); // 75 minutes is malformed
    assert.equal(parseRaceTime('4:30:99'), null);
    assert.equal(parseRaceTime('-1:00:00'), null);
  });

  it('treats a zero time as absent', () => {
    // A zero would sort to the front and take every record.
    assert.equal(parseRaceTime('0:00:00'), null);
  });
});

describe('formatRaceTime', () => {
  it('always pads to h:mm:ss so a column stays aligned', () => {
    assert.equal(formatRaceTime(13256), '3:40:56');
    assert.equal(formatRaceTime(3485), '0:58:05');
    assert.equal(formatRaceTime(7116), '1:58:36');
  });

  it('renders nothing for an absent or nonsense time', () => {
    assert.equal(formatRaceTime(null), '');
    assert.equal(formatRaceTime(undefined), '');
    assert.equal(formatRaceTime(0), '');
    assert.equal(formatRaceTime(-5), '');
    assert.equal(formatRaceTime(Number.NaN), '');
  });

  it('round-trips with parseRaceTime', () => {
    for (const t of ['3:40:56', '1:58:36', '7:52:30', '0:58:05']) {
      assert.equal(formatRaceTime(parseRaceTime(t)), t);
    }
  });
});

describe('titleCaseName', () => {
  it('collapses the shouting older years into the same identity as recent ones', () => {
    // This is the whole reason the function exists: 2017 records "TED BROSS"
    // and a later year records "Ted Bross". Two athlete documents would split
    // one runner's record between them.
    assert.equal(titleCaseName('TED BROSS'), 'Ted Bross');
    assert.equal(titleCaseName('Ted Bross'), 'Ted Bross');
    assert.equal(titleCaseName('  ted   bross '), 'Ted   Bross');
  });

  it('keeps the shape of hyphenated and apostrophe names', () => {
    assert.equal(titleCaseName("KATIE O'BRIEN"), "Katie O'Brien");
    assert.equal(titleCaseName('jean-luc picard'), 'Jean-Luc Picard');
    assert.equal(titleCaseName('KATIE O’BRIEN'), 'Katie O’Brien');
  });

  it('handles absent input', () => {
    assert.equal(titleCaseName(null), '');
    assert.equal(titleCaseName(undefined), '');
    assert.equal(titleCaseName(''), '');
  });
});
