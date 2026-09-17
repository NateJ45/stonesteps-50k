// scripts/import-results.mjs
//
// Imports the Stone Steps results archive from the RunSignUp public REST API
// into Sanity as athlete + raceResult documents.
//
// Prerequisites:
//   - PUBLIC_SANITY_PROJECT_ID in .env
//   - SANITY_API_WRITE_TOKEN in .env (an Editor token)
//   - The two `distance` documents must already exist (npm run seed:race)
//
// Usage:
//   node scripts/import-results.mjs             # import everything available
//   node scripts/import-results.mjs --dry-run   # fetch and report, write nothing
//   node scripts/import-results.mjs --year 2025 # one year only
//
// Idempotent: deterministic _id values with createOrReplace, so re-running
// updates in place and never duplicates. Safe to run after each year's race.
//
// ---------------------------------------------------------------------------
// WHAT THIS ARCHIVE ACTUALLY CONTAINS, which is less than it looks
//
// The API is public and needs no key, but it does not reach the whole history:
//
//   - Results exist for 2017 through 2025 only. 2020, 2016 and 2015 have no
//     result set at all, and neither does the 2021 27K.
//   - The years before 2017 come from scripts/import-archive.mjs instead (the
//     2003 to 2016 tables), which is what put a result behind every record on
//     the board. The `recordEntry` type that once bridged the gap is empty now;
//     recordEntry.ts says why, and what would justify creating one.
//   - chip_time is only populated from 2024. Every earlier year carries gun
//     time in clock_time. Each result records which it got in `timeSource`,
//     so the site never implies a precision it does not have.
//
// The site must not imply it holds a complete archive. It links out to
// RunSignUp for the full record.
// ---------------------------------------------------------------------------

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@sanity/client';
import { loadEnv } from './lib/loadEnv.mjs';
import { parseRaceTime, titleCaseName } from '../src/lib/race-time.ts';
import { canonicalSlug, canonicalName } from '../src/lib/athlete-aliases.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const env = loadEnv(root);
const projectId = env.PUBLIC_SANITY_PROJECT_ID;
const dataset = env.PUBLIC_SANITY_DATASET ?? 'production';
const token = env.SANITY_API_WRITE_TOKEN;

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const yearArg = args.indexOf('--year');
const ONLY_YEAR = yearArg !== -1 ? Number(args[yearArg + 1]) : null;

if (!projectId) {
  console.log('PUBLIC_SANITY_PROJECT_ID is not set. Configure your .env and re-run.');
  process.exit(0);
}
if (!token && !DRY_RUN) {
  console.log('SANITY_API_WRITE_TOKEN is not set. A write token is required to import.');
  process.exit(0);
}

const client = createClient({ projectId, dataset, token, apiVersion: '2026-05-01', useCdn: false });

const RACE_ID = 15282;
const API = 'https://runsignup.com/rest';

/** Slug used as the identity key for an athlete. See titleCaseName. */
function slugify(name) {
  return titleCaseName(name)
    .toLocaleLowerCase()
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function getJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

/** Every event the race has ever listed, with its year and distance slug. */
async function listEvents() {
  const data = await getJson(`${API}/race/${RACE_ID}?format=json&future_events_only=F`);
  return (data.race?.events ?? [])
    .map((e) => {
      // start_time is "10/26/2025 08:00"; the year is the authoritative label,
      // because the event NAME is just "50K" on every one of them.
      const year = Number(String(e.start_time ?? '').match(/\/(\d{4})\s/)?.[1]);
      const slug = String(e.name ?? '')
        .trim()
        .toLowerCase();
      return { eventId: e.event_id, year, distanceSlug: slug, name: e.name };
    })
    .filter(
      (e) => Number.isFinite(e.year) && (e.distanceSlug === '50k' || e.distanceSlug === '27k'),
    );
}

/** Every finisher in one event, or [] when the event has no published results. */
async function fetchResults(eventId) {
  const url =
    `${API}/race/${RACE_ID}/results/get-results` +
    `?format=json&event_id=${eventId}&results_per_page=2500`;
  const data = await getJson(url);
  const sets = data.individual_results_sets ?? [];
  if (sets.length === 0) return [];
  // Take the largest set. Some years publish an "Overall" set alongside
  // narrower age-group or "Trek" sets, and the overall one is the archive.
  const set = sets.reduce((a, b) => ((b.results?.length ?? 0) > (a.results?.length ?? 0) ? b : a));
  return set.results ?? [];
}

/**
 * Map one API row to an athlete + result pair.
 *
 * Returns null when the row cannot be trusted: no name, or no usable time in
 * either the chip or the gun column. A finisher with no time is not a finisher
 * we can rank, and inventing one would corrupt every record derived from it.
 */
function mapResult(row, { year, distanceSlug }) {
  const first = titleCaseName(row.first_name);
  const last = titleCaseName(row.last_name);
  const name = `${first} ${last}`.trim();
  if (!name) return null;

  // chip time where the timer recorded one, gun time otherwise. The archive
  // only carries chip times from 2024.
  const chip = parseRaceTime(row.chip_time);
  const gun = parseRaceTime(row.clock_time);
  const timeSeconds = chip ?? gun;
  if (!timeSeconds) return null;

  const rawSlug = slugify(name);
  if (!rawSlug) return null;

  // Collapse the handful of runners the race spelled two ways onto one
  // identity, so their history does not arrive split in half. See
  // src/lib/athlete-aliases.ts for the evidence behind each entry.
  const slug = canonicalSlug(rawSlug);
  const displayName = canonicalName(rawSlug, name);

  const gender = row.gender === 'M' || row.gender === 'F' ? row.gender : 'X';
  const age = Number.isFinite(Number(row.age)) && Number(row.age) > 0 ? Number(row.age) : undefined;

  return {
    athlete: {
      _id: `athlete-${slug}`,
      _type: 'athlete',
      name: displayName,
      slug: { _type: 'slug', current: slug },
      ...(row.city ? { city: String(row.city) } : {}),
      ...(row.state ? { region: String(row.state) } : {}),
    },
    result: {
      // Keyed by the timer's own result id, so a re-import updates in place
      // even if a row's place or time is later corrected.
      _id: `result-${row.result_id}`,
      _type: 'raceResult',
      athlete: { _type: 'reference', _ref: `athlete-${slug}` },
      distance: { _type: 'reference', _ref: `distance-${distanceSlug}` },
      year,
      timeSeconds,
      gender,
      ...(age ? { age } : {}),
      ...(Number.isFinite(Number(row.place)) ? { place: Number(row.place) } : {}),
      timeSource: chip ? 'chip' : 'gun',
    },
  };
}

async function main() {
  console.log(
    `Importing Stone Steps results into ${projectId}/${dataset}${DRY_RUN ? ' (DRY RUN)' : ''}\n`,
  );

  const events = await listEvents();
  const wanted = ONLY_YEAR ? events.filter((e) => e.year === ONLY_YEAR) : events;
  wanted.sort((a, b) => a.year - b.year || a.distanceSlug.localeCompare(b.distanceSlug));

  // Athletes are deduplicated ACROSS every year before anything is written.
  // The same runner appears in many years and must collapse to one document,
  // or they split their own record between two spellings of themselves.
  const athletes = new Map();
  const results = [];
  const skipped = [];
  const covered = [];

  for (const ev of wanted) {
    let rows = [];
    try {
      rows = await fetchResults(ev.eventId);
    } catch (err) {
      console.error(`  ! ${ev.year} ${ev.name}: ${err.message}`);
      continue;
    }

    if (rows.length === 0) {
      console.log(`  - ${ev.year} ${ev.name.padEnd(4)} no published results`);
      continue;
    }

    let kept = 0;
    for (const row of rows) {
      const mapped = mapResult(row, ev);
      if (!mapped) {
        skipped.push(`${ev.year} ${ev.name} ${row.first_name ?? ''} ${row.last_name ?? ''}`.trim());
        continue;
      }
      athletes.set(mapped.athlete._id, mapped.athlete);
      results.push(mapped.result);
      kept += 1;
    }
    covered.push(`${ev.year} ${ev.name}`);
    console.log(`  + ${ev.year} ${ev.name.padEnd(4)} ${kept} finishers`);
    // Be a polite guest on someone else's public API.
    await new Promise((r) => setTimeout(r, 350));
  }

  console.log(
    `\n${athletes.size} unique athletes across ${results.length} results, ` +
      `${covered.length} events.`,
  );
  if (skipped.length) {
    console.log(`${skipped.length} rows skipped for no name or no usable time:`);
    for (const s of skipped.slice(0, 10)) console.log(`   ${s}`);
    if (skipped.length > 10) console.log(`   ...and ${skipped.length - 10} more`);
  }

  if (DRY_RUN) {
    console.log('\nDry run: nothing written.');
    return;
  }

  // Athletes first: a result references one, and a reference to a document
  // that does not exist yet is a broken document.
  const docs = [...athletes.values(), ...results];
  let done = 0;
  for (let i = 0; i < docs.length; i += 50) {
    const chunk = docs.slice(i, i + 50);
    let tx = client.transaction();
    for (const doc of chunk) tx = tx.createOrReplace(doc);
    await tx.commit({ visibility: 'async' });
    done += chunk.length;
    process.stdout.write(`\r  written ${done}/${docs.length}`);
  }
  console.log('\nDone.');
  console.log(
    'Reminder: this archive starts at 2017. The records that predate it live as\n' +
      'recordEntry documents, and the site links out to RunSignUp for the rest.',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
