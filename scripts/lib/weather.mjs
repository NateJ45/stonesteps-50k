// scripts/lib/weather.mjs
//
// The two things both weather scripts share: how a race day's weather is
// fetched, and how the site decides that a race day has happened and is old
// enough to look up. build-weather.mjs re-bakes every year; weather-sync.mjs
// adds the one that is missing. Neither should carry its own copy of either.
//
// The decision is here rather than in the workflow so it can be unit tested
// (src/lib/race-day-due.test.ts): a rule that only runs once a year, on a
// GitHub runner, in November, is exactly the rule nobody notices is wrong.

// The Oval. Dave's pin (2026-09-18). ERA5 is a ~9 km grid, so the fourth
// decimal place is decoration; it is here so every script agrees on one spot.
export const LAT = 39.172758;
export const LNG = -84.568807;
export const TZ = 'America/New_York';

/**
 * ERA5 reanalysis is published with a lag of about five days. Ask for a day
 * sooner than that and the archive answers with nulls, which would bake a
 * blank bar into the strip. Six days is the margin.
 */
export const ARCHIVE_LAG_DAYS = 6;

/**
 * Whether The Race's date has happened, is old enough for the archive to hold
 * it, and is not already on file.
 *
 * `raceDate` is the datetime on The Race document (ISO, in any zone). The
 * race day is taken in New York time, because "which day" is a local question
 * and an 8 am start in Cincinnati is 12:00 UTC. `asOf` is today's date as
 * YYYY-MM-DD; injectable so the rule can be tested and dry-run.
 *
 * Returns { year, date } to record, or null with the reason.
 */
export function raceDayDue({ raceDate, asOf, knownYears, lagDays = ARCHIVE_LAG_DAYS }) {
  if (!raceDate) return { due: null, reason: 'no race date on The Race' };
  const date = localDate(raceDate);
  if (!date) return { due: null, reason: `unreadable race date: ${raceDate}` };
  const year = Number(date.slice(0, 4));
  if (knownYears.includes(year)) return { due: null, reason: `${year} is already on file` };
  const readyOn = addDays(date, lagDays);
  if (asOf < readyOn) {
    return {
      due: null,
      reason:
        asOf < date
          ? `${date} has not happened yet`
          : `${date} happened, archive ready from ${readyOn}`,
    };
  }
  return { due: { year, date }, reason: `${date} is ${lagDays}+ days past and not on file` };
}

/** The calendar date, in New York, of an ISO datetime. */
export function localDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  // en-CA gives YYYY-MM-DD; the time zone is what makes it the race's own day.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** One race day's weather from Open-Meteo's ERA5 archive. Throws on a bad answer. */
export async function fetchRaceDayWeather({ year, date }) {
  const start = addDays(date, -1);
  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${LAT}&longitude=${LNG}` +
    `&start_date=${start}&end_date=${date}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code` +
    `&hourly=temperature_2m&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=${encodeURIComponent(TZ)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${year}: ${res.status} ${await res.text()}`);
  const j = await res.json();
  const i = j.daily.time.indexOf(date);
  if (i < 0) throw new Error(`${year}: no daily row for ${date}`);
  if (j.daily.temperature_2m_max[i] == null)
    throw new Error(`${year}: archive has no data for ${date} yet`);
  const h8 = j.hourly.time.indexOf(`${date}T08:00`);
  return {
    year,
    date,
    high: Math.round(j.daily.temperature_2m_max[i]),
    low: Math.round(j.daily.temperature_2m_min[i]),
    startTemp:
      h8 >= 0 && j.hourly.temperature_2m[h8] != null
        ? Math.round(j.hourly.temperature_2m[h8])
        : null,
    rainIn: +j.daily.precipitation_sum[i].toFixed(2),
    prevRainIn: +j.daily.precipitation_sum[i - 1 >= 0 ? i - 1 : i].toFixed(2),
    code: j.daily.weather_code[i],
  };
}

export function describe(w) {
  return `${w.year} ${w.date}: ${w.low}-${w.high}F, start ${w.startTemp}F, rain ${w.rainIn}in (eve ${w.prevRainIn}in), code ${w.code}`;
}
