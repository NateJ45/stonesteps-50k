// scripts/weather-sync.mjs
//
// Keeps the race-day weather strip current without anyone touching the repo.
//
// THE PROBLEM IT SOLVES. The strip is baked from a committed list of race
// dates (scripts/data/race-days.json) and a committed weather file
// (src/data/raceDayWeather.json). Every other yearly thing on this site is
// automatic: results arrive from RunSignUp, the records derive from them, the
// edition sentence counts itself. The weather was the one yearly touch, and a
// yearly touch is the kind that gets forgotten (Nathan, 2026-09-18).
//
// THE SHAPE OF THE FIX. The race date is on The Race document months ahead.
// So:
//
//   --record   (needs SANITY_API_WRITE_TOKEN) Reads The Race's date. If that
//              day has happened, is old enough for the weather archive to hold
//              it, and is not on file yet, it writes a `raceDay` document for
//              it. That document is the durable memory: when Dave moves the
//              race date on to next year, this year's day is not lost.
//
//   (default)  Merges the committed race-days.json with every `raceDay`
//              document, fetches the weather for any year the baked file does
//              not have, and rewrites src/data/raceDayWeather.json. Read-only
//              against Sanity, so it runs in the deploy too.
//
// It FAILS SOFT on the network. A weather archive that is down must not stop a
// deploy: the strip simply keeps the years it has. It prints changed=true or
// false, and appends the same to $GITHUB_OUTPUT when run in Actions, so the
// import workflow can decide whether a rebuild is worth it.
//
// Flags for testing: --as-of YYYY-MM-DD pretends today is that date, --dry-run
// decides and reports but writes nothing.
//
// Run: node scripts/weather-sync.mjs [--record] [--dry-run] [--as-of DATE]

import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@sanity/client';
import 'dotenv/config';
import { raceDayDue, fetchRaceDayWeather, describe, localDate } from './lib/weather.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => (args.indexOf(name) !== -1 ? args[args.indexOf(name) + 1] : undefined);
const RECORD = flag('--record');
const DRY = flag('--dry-run');
const AS_OF = opt('--as-of') ?? localDate(new Date().toISOString());

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.PUBLIC_SANITY_DATASET || 'production';
const token = process.env.SANITY_API_WRITE_TOKEN;
const unconfigured = !projectId || projectId === 'your-project-id';

const DAYS_FILE = resolve(root, 'scripts/data/race-days.json');
const WEATHER_FILE = resolve(root, 'src/data/raceDayWeather.json');

const committedDays = JSON.parse(readFileSync(DAYS_FILE, 'utf8')).filter(
  (d) => d && d.year && d.date,
);
const baked = JSON.parse(readFileSync(WEATHER_FILE, 'utf8'));

function output(changed) {
  console.log(`changed=${changed}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
}

if (unconfigured) {
  console.log('No Sanity project configured; the committed race days are all there is.');
  output(false);
  process.exit(0);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-10-01',
  token: RECORD ? token : undefined,
  useCdn: false,
});

// Every race day known anywhere: the committed list first, then the documents.
const recorded = await client.fetch(
  `*[_type == "raceDay" && defined(year) && defined(date)]{year, date, source}`,
);
const byYear = new Map();
for (const d of [...committedDays, ...recorded]) if (!byYear.has(d.year)) byYear.set(d.year, d);
const knownYears = [...byYear.keys()].sort((a, b) => a - b);

if (RECORD) {
  if (!token) {
    console.error('--record needs SANITY_API_WRITE_TOKEN');
    process.exit(1);
  }
  const race = await client.fetch(`*[_type == "race"][0]{raceDate}`);
  const { due, reason } = raceDayDue({ raceDate: race?.raceDate, asOf: AS_OF, knownYears });
  console.log(`as of ${AS_OF}: ${reason}`);
  if (due) {
    const doc = {
      _id: `raceDay-${due.year}`,
      _type: 'raceDay',
      year: due.year,
      date: due.date,
      source: `The Race document's race date, recorded automatically on ${AS_OF}`,
    };
    if (DRY) console.log('would create', JSON.stringify(doc));
    else {
      await client.createIfNotExists(doc);
      byYear.set(due.year, doc);
      knownYears.push(due.year);
      console.log(`recorded raceDay-${due.year} (${due.date})`);
    }
  }
}

// Bake whatever is known and not yet on file.
const have = new Set(baked.map((w) => w.year));
const missing = knownYears.filter((y) => !have.has(y)).map((y) => byYear.get(y));
if (missing.length === 0) {
  console.log(`weather on file for all ${knownYears.length} race days`);
  output(false);
  process.exit(0);
}

const added = [];
for (const day of missing) {
  try {
    const w = await fetchRaceDayWeather(day);
    added.push(w);
    console.log(describe(w));
  } catch (err) {
    // Soft: the archive lags or is down. Say so and move on; the strip keeps
    // the years it has and the next run tries again.
    console.warn(`::warning::weather for ${day.year} not baked: ${err.message}`);
  }
}

if (added.length === 0) {
  output(false);
  process.exit(0);
}
const next = [...baked, ...added].sort((a, b) => a.year - b.year);
if (DRY) console.log(`would write ${added.length} new race day(s) to src/data/raceDayWeather.json`);
else {
  writeFileSync(WEATHER_FILE, JSON.stringify(next, null, 2) + '\n');
  console.log(
    `${added.length} race day(s) added to src/data/raceDayWeather.json (${next.length} total)`,
  );
}
output(!DRY);
