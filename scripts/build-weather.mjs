// scripts/build-weather.mjs
//
// Race-day weather since 2003, from Open-Meteo's historical archive, written to
// src/data/raceDayWeather.json so the site never calls a weather API at build
// time or in the browser.
//
// INPUT: scripts/data/race-days.json, one { year, date } per edition. The dates
// are the recovered ones (RunSignUp for 2015 on, the Wayback Machine before
// that); a year with no confirmed date is simply absent, and the widget starts
// wherever the data does rather than guessing.
//
// SOURCE: ERA5 reanalysis through archive-api.open-meteo.com, for The Oval's
// coordinates (the race's own RunSignUp lat/long). ERA5 is a ~9 km grid, which
// is right for a day's high, low and whether it rained, and wrong for a shower
// that only hit the ridge. The widget says as much.
//
// Per race day we keep: the high and low, the temperature at the 8 am start,
// rainfall on the day AND the day before (wet leaves on the steps is the thing
// people actually ask about), and the WMO weather code for a one-word label.
//
// Re-run when race-days.json changes: `node scripts/build-weather.mjs`. Commit
// the output. Idempotent for a given input.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const LAT = 39.17275;
const LNG = -84.568806;
const TZ = 'America/New_York';

const days = JSON.parse(readFileSync(resolve(root, 'scripts/data/race-days.json'), 'utf8'))
  .filter((d) => d && d.year && d.date)
  .sort((a, b) => a.year - b.year);

const prevDay = (iso) => {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

const out = [];
for (const { year, date } of days) {
  const start = prevDay(date);
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
  const h8 = j.hourly.time.indexOf(`${date}T08:00`);
  out.push({
    year,
    date,
    high: Math.round(j.daily.temperature_2m_max[i]),
    low: Math.round(j.daily.temperature_2m_min[i]),
    startTemp: h8 >= 0 ? Math.round(j.hourly.temperature_2m[h8]) : null,
    rainIn: +j.daily.precipitation_sum[i].toFixed(2),
    prevRainIn: +j.daily.precipitation_sum[i - 1 >= 0 ? i - 1 : i].toFixed(2),
    code: j.daily.weather_code[i],
  });
  console.log(
    `${year} ${date}: ${out.at(-1).low}-${out.at(-1).high}F, start ${out.at(-1).startTemp}F, rain ${out.at(-1).rainIn}in (eve ${out.at(-1).prevRainIn}in), code ${out.at(-1).code}`,
  );
  await new Promise((r) => setTimeout(r, 250));
}

const target = resolve(root, 'src/data/raceDayWeather.json');
writeFileSync(target, JSON.stringify(out, null, 2) + '\n');
console.log(`\n${out.length} race days written to src/data/raceDayWeather.json`);
