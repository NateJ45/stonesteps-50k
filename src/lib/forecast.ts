// Safe to edit by hand
//
// Race-week forecast: pure functions that turn an Open-Meteo forecast answer
// into the few numbers and two sentences the site shows. The network call is in
// src/pages/api/forecast.ts; keeping this part pure is what lets it be tested
// against a fixture and keeps the route thin. Unit-tested in forecast.test.ts.
//
// WHAT WE PROMISE: nothing. Every sentence is a forecast, the page says when it
// was fetched, and a missing number is a missing sentence, never a guess.

import { iconKind, type IconKind } from './raceWeather.ts';

export interface Forecast {
  date: string;
  /** Temperature at the 8 am start, °F. Null when the hourly row is missing. */
  start: number | null;
  high: number;
  low: number;
  /** Chance of rain on the day, 0 to 100. Null when the model has none yet. */
  rainChance: number | null;
  rainIn: number;
  /** WMO code for the day. */
  code: number;
}

/** The slice of Open-Meteo's /v1/forecast answer this reads. */
export interface OpenMeteoForecast {
  daily?: {
    time: string[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
    precipitation_sum: (number | null)[];
    precipitation_probability_max?: (number | null)[];
    weather_code: (number | null)[];
  };
  hourly?: { time: string[]; temperature_2m: (number | null)[] };
}

/** Null when the answer does not hold the date or has no high and low for it. */
export function parseForecast(j: OpenMeteoForecast, date: string): Forecast | null {
  const d = j.daily;
  if (!d) return null;
  const i = d.time.indexOf(date);
  if (i < 0) return null;
  const hi = d.temperature_2m_max[i];
  const lo = d.temperature_2m_min[i];
  if (hi == null || lo == null) return null;
  const h8 = j.hourly ? j.hourly.time.indexOf(`${date}T08:00`) : -1;
  const t8 = h8 >= 0 ? (j.hourly?.temperature_2m[h8] ?? null) : null;
  return {
    date,
    start: t8 == null ? null : Math.round(t8),
    high: Math.round(hi),
    low: Math.round(lo),
    rainChance: d.precipitation_probability_max?.[i] ?? null,
    rainIn: +(d.precipitation_sum[i] ?? 0).toFixed(2),
    code: d.weather_code[i] ?? 3,
  };
}

const weekday = (iso: string) =>
  new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });

/** "Forecast for Sunday: 41°F at the 8 am start, high 58°F, 60% chance of rain." */
export function forecastSentence(f: Forecast): string {
  const parts = [
    f.start != null ? `${f.start}°F at the 8 am start` : `low ${f.low}°F`,
    `high ${f.high}°F`,
    f.rainChance != null ? `${f.rainChance}% chance of rain` : null,
  ].filter(Boolean);
  return `Forecast for ${weekday(f.date)}: ${parts.join(', ')}.`;
}

/** What to pack for THIS forecast. Short, plain, and conditional on the numbers. */
export function forecastAdvice(f: Forecast): string {
  const t = f.start ?? f.low;
  const cold =
    t < 40
      ? 'Gloves, a hat and a long-sleeve layer for the start.'
      : t < 50
        ? 'Gloves and a light layer for the start; it will come off by mid-morning.'
        : 'A mild start: a singlet and arm sleeves you can pull off.';
  const wet =
    (f.rainChance ?? 0) >= 50 || f.rainIn >= 0.1
      ? 'Rain is likely: a light shell, and shoes with real lugs for the wet steps.'
      : (f.rainChance ?? 0) >= 25
        ? 'A shower is possible: a light shell in the pack is enough.'
        : 'It looks dry. Fallen leaves can still hide the roots on the steps.';
  const warm = f.high - t >= 12 ? ' It will warm up a lot by the afternoon.' : '';
  return `${cold} ${wet}${warm}`;
}

/**
 * The glyph for the forecast day. Same rule as the history strip (the icon must
 * agree with the rain words beside it): a drizzle or rain code only draws drops
 * when the forecast itself calls rain likely, so "20% chance" never wears a
 * rain cloud.
 */
export function forecastIcon(f: Forecast): IconKind {
  const wet = (f.rainChance ?? 0) >= 40 || f.rainIn >= 0.05;
  return iconKind(f.code, wet);
}
