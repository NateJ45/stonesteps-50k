import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  forecastAdvice,
  forecastIcon,
  forecastSentence,
  parseForecast,
  type OpenMeteoForecast,
} from './forecast.ts';

const answer: OpenMeteoForecast = {
  daily: {
    time: ['2026-10-24', '2026-10-25'],
    temperature_2m_max: [60, 57.6],
    temperature_2m_min: [40, 38.2],
    precipitation_sum: [0, 0.31],
    precipitation_probability_max: [10, 60],
    weather_code: [3, 63],
  },
  hourly: { time: ['2026-10-25T07:00', '2026-10-25T08:00'], temperature_2m: [39, 41.4] },
};

test('parseForecast picks the race date, rounds, and finds the 8 am hour', () => {
  assert.deepEqual(parseForecast(answer, '2026-10-25'), {
    date: '2026-10-25',
    start: 41,
    high: 58,
    low: 38,
    rainChance: 60,
    rainIn: 0.31,
    code: 63,
  });
});

test('parseForecast returns null for a date the answer lacks or has no numbers for', () => {
  assert.equal(parseForecast(answer, '2026-11-01'), null);
  assert.equal(parseForecast({}, '2026-10-25'), null);
  const blank = structuredClone(answer);
  blank.daily!.temperature_2m_max[1] = null;
  assert.equal(parseForecast(blank, '2026-10-25'), null);
});

test('the sentence names the weekday and degrades without hourly or rain data', () => {
  const f = parseForecast(answer, '2026-10-25')!;
  assert.equal(
    forecastSentence(f),
    'Forecast for Sunday: 41°F at the 8 am start, high 58°F, 60% chance of rain.',
  );
  assert.equal(
    forecastSentence({ ...f, start: null, rainChance: null }),
    'Forecast for Sunday: low 38°F, high 58°F.',
  );
});

test('advice follows the numbers and never uses an em-dash', () => {
  const f = parseForecast(answer, '2026-10-25')!;
  assert.match(forecastAdvice(f), /Gloves and a light layer/);
  assert.match(forecastAdvice(f), /Rain is likely/);
  assert.match(forecastAdvice({ ...f, rainChance: 5, rainIn: 0 }), /looks dry/);
  assert.match(forecastAdvice({ ...f, start: 35 }), /Gloves, a hat/);
  assert.ok(!forecastAdvice(f).includes('—'));
});

test('forecastIcon only draws rain when the forecast calls it likely', () => {
  const f = parseForecast(answer, '2026-10-25')!; // code 63, 60%, 0.31 in
  assert.equal(forecastIcon(f), 'rain');
  assert.equal(forecastIcon({ ...f, rainChance: 15, rainIn: 0.01 }), 'cloud');
  assert.equal(forecastIcon({ ...f, code: 0 }), 'sun');
});
