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
//
// THIS IS THE FULL RE-BAKE. The yearly addition is automatic and lives in
// scripts/weather-sync.mjs, which fetches only the year that is missing and
// runs in the deploy and the results import; see that file and the raceDay
// document type. The fetch itself is shared in scripts/lib/weather.mjs.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchRaceDayWeather, describe } from './lib/weather.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const days = JSON.parse(readFileSync(resolve(root, 'scripts/data/race-days.json'), 'utf8'))
  .filter((d) => d && d.year && d.date)
  .sort((a, b) => a.year - b.year);

const out = [];
for (const day of days) {
  const w = await fetchRaceDayWeather(day);
  out.push(w);
  console.log(describe(w));
  await new Promise((r) => setTimeout(r, 250));
}

const target = resolve(root, 'src/data/raceDayWeather.json');
writeFileSync(target, JSON.stringify(out, null, 2) + '\n');
console.log(`\n${out.length} race days written to src/data/raceDayWeather.json`);
