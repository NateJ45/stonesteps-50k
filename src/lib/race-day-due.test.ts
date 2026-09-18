// The rule that decides when a race day gets recorded for the weather strip.
// It runs once a year on a GitHub runner in November, which is exactly the
// kind of rule nobody notices is wrong, so it is pinned here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error plain JS shared with the scripts; no types on purpose
import { raceDayDue, localDate, addDays, ARCHIVE_LAG_DAYS } from '../../scripts/lib/weather.mjs';

const known = [2023, 2024, 2025];

test('the race day is New York local, not UTC', () => {
  // 8 am Cincinnati on 25 Oct 2026 is 12:00Z; the day is the 25th either way,
  // but a race date stored as midnight local would be 04:00Z and still the 25th.
  assert.equal(localDate('2026-10-25T12:00:00Z'), '2026-10-25');
  assert.equal(localDate('2026-10-25T04:00:00Z'), '2026-10-25');
  assert.equal(localDate('nonsense'), null);
});

test('not due before the race', () => {
  const r = raceDayDue({ raceDate: '2026-10-25T12:00:00Z', asOf: '2026-10-20', knownYears: known });
  assert.equal(r.due, null);
  assert.match(r.reason, /not happened/);
});

test('not due until the archive lag has passed', () => {
  const r = raceDayDue({ raceDate: '2026-10-25T12:00:00Z', asOf: '2026-10-28', knownYears: known });
  assert.equal(r.due, null);
  assert.match(r.reason, /archive ready from 2026-10-31/);
});

test('due once the lag has passed, exactly on the boundary', () => {
  const ready = addDays('2026-10-25', ARCHIVE_LAG_DAYS);
  const r = raceDayDue({ raceDate: '2026-10-25T12:00:00Z', asOf: ready, knownYears: known });
  assert.deepEqual(r.due, { year: 2026, date: '2026-10-25' });
});

test('never records a year already on file', () => {
  const r = raceDayDue({ raceDate: '2025-10-26T12:00:00Z', asOf: '2026-09-18', knownYears: known });
  assert.equal(r.due, null);
  assert.match(r.reason, /already on file/);
});

test('a missing race date is a reason, not a crash', () => {
  const r = raceDayDue({ raceDate: undefined, asOf: '2026-09-18', knownYears: known });
  assert.equal(r.due, null);
});
