import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  conditionLabel,
  decadeWords,
  summarise,
  summarySentence,
  tempScale,
  wasWet,
  wasWetUnderfoot,
  type RaceDay,
} from './raceWeather.ts';
import data from '../data/raceDayWeather.json' with { type: 'json' };

const day = (over: Partial<RaceDay>): RaceDay => ({
  year: 2020,
  date: '2020-10-25',
  high: 60,
  low: 40,
  startTemp: 42,
  rainIn: 0,
  prevRainIn: 0,
  code: 1,
  ...over,
});

test('the committed data file is well formed and in year order', () => {
  const days = data as RaceDay[];
  assert.ok(days.length >= 10, 'at least ten race days on file');
  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    assert.ok(Number.isInteger(d.year) && d.year >= 2003, `${d.year} is a race year`);
    assert.match(d.date, /^\d{4}-10-\d{2}$/, `${d.year} is in October`);
    assert.equal(d.date.slice(0, 4), String(d.year), `${d.year} date matches its year`);
    assert.ok(d.high >= d.low, `${d.year} high >= low`);
    if (i > 0) assert.ok(d.year > days[i - 1].year, 'years ascend');
  }
});

test('wet thresholds ignore a trace and count the night before', () => {
  assert.equal(wasWet(day({ rainIn: 0.02 })), false);
  assert.equal(wasWet(day({ rainIn: 0.07 })), true);
  assert.equal(wasWetUnderfoot(day({ rainIn: 0, prevRainIn: 0.5 })), true);
  assert.equal(wasWetUnderfoot(day({ rainIn: 0, prevRainIn: 0.01 })), false);
});

test('condition labels cover the WMO ranges', () => {
  assert.equal(conditionLabel(0), 'Clear');
  assert.equal(conditionLabel(2), 'Mostly clear');
  assert.equal(conditionLabel(3), 'Overcast');
  assert.equal(conditionLabel(53), 'Drizzle');
  assert.equal(conditionLabel(65), 'Rain');
  assert.equal(conditionLabel(73), 'Snow');
  assert.equal(conditionLabel(81), 'Showers');
  assert.equal(conditionLabel(95), 'Storms');
});

test('decade words', () => {
  assert.equal(decadeWords(41), 'low 40s');
  assert.equal(decadeWords(55), 'mid-50s');
  assert.equal(decadeWords(68), 'high 60s');
});

test('summary uses medians and finds the extremes', () => {
  const s = summarise([
    day({ year: 2001, startTemp: 30, high: 50 }),
    day({ year: 2002, startTemp: 40, high: 60, rainIn: 0.5 }),
    day({ year: 2003, startTemp: 50, high: 70, prevRainIn: 0.5 }),
  ]);
  assert.ok(s);
  assert.equal(s.count, 3);
  assert.equal(s.typicalStart, 40);
  assert.equal(s.typicalHigh, 60);
  assert.equal(s.coldestStart.year, 2001);
  assert.equal(s.warmestHigh.year, 2003);
  assert.equal(s.wetDays, 1);
  assert.equal(s.wetUnderfootDays, 2);
  const sentence = summarySentence(s);
  assert.match(sentence, /about 40°F at the 8 am start, low 60s by the afternoon/);
  assert.match(
    sentence,
    /Rain on 1 of 3 race days, and wet ground from the night before on 1 more/,
  );
  assert.match(sentence, /Coldest start 30°F \(2001\), warmest afternoon 70°F \(2003\)/);
});

test('summary of nothing is null, and a dry record says so', () => {
  assert.equal(summarise([]), null);
  const s = summarise([day({ year: 2001 }), day({ year: 2002 })]);
  assert.ok(s);
  assert.match(summarySentence(s), /has not rained on race day in any of the 2 years/);
});

test('scale rounds out to tens with headroom', () => {
  assert.deepEqual(tempScale([day({ low: 41, high: 59 }), day({ low: 37, high: 77 })]), {
    min: 30,
    max: 80,
  });
});
