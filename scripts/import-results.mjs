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
//   node scripts/import-results.mjs             # fetch and report, write nothing
//   NCS_PRODUCTION_WRITE=yes node scripts/import-results.mjs --apply  # import
//   (results-import.yml still runs it bare: in GitHub Actions a bare run
//    writes, the CI allowance in scripts/lib/write-gate.mjs, PORTS.md card 86)
//   node scripts/import-results.mjs --year 2025 # one year only
//
// Idempotent: deterministic _id values, so re-running updates in place and
// never duplicates. Safe to run after each year's race.
//
// IT NEVER UNDOES A HAND FIX (2026-10-18). Each document is created whole if it
// is new, and after that only the fields RunSignUp owns are set: a trekker tick,
// a source note, or a runner's name, city or state fixed in the Studio stay as
// they are. It used to createOrReplace, which wiped all of those on every
// nightly run. The field rule is scripts/lib/import-merge.mjs (tested).
//
// ---------------------------------------------------------------------------
// WHAT THIS ARCHIVE ACTUALLY CONTAINS, which is less than it looks
//
// The API is public and needs no key, but it does not reach the whole history:
//
//   - Results exist from 2017 on (2026 the latest checked). 2020, 2016 and 2015 have no
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

import { writeGate } from './lib/write-gate.mjs';
import { importMutations } from './lib/import-merge.mjs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@sanity/client';
import { loadEnv } from './lib/loadEnv.mjs';
import { parseRaceTime, titleCaseName } from '../src/lib/race-time.ts';
import { canonicalSlug, canonicalName } from '../src/lib/athlete-aliases.ts';
import { pickResultRows, distanceFromEventName } from './lib/result-sets.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const env = loadEnv(root);
const projectId = env.PUBLIC_SANITY_PROJECT_ID;
const dataset = env.PUBLIC_SANITY_DATASET ?? 'production';
const DRY_RUN = !writeGate({ dataset, ci: true, ciBare: true });
const token = env.SANITY_API_WRITE_TOKEN;

const args = process.argv.slice(2);
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

/**
 * A line GitHub Actions shows on the run's summary page (plain text locally).
 * For anything a person should look at that must not stop the import.
 */
function warn(message) {
  console.log(process.env.GITHUB_ACTIONS ? `::warning::${message}` : `  ! ${message}`);
}

/** Every event the race has ever listed, with its year, date and distance slug. */
async function listEvents() {
  const data = await getJson(`${API}/race/${RACE_ID}?format=json&future_events_only=F`);
  const events = [];
  for (const e of data.race?.events ?? []) {
    // start_time is "10/26/2025 08:00"; the year is the authoritative label,
    // because the event NAME is just "50K" on every one of them. Any 20xx in it
    // will do, in case RunSignUp changes the date format.
    const when = String(e.start_time ?? '');
    const year = Number(when.match(/\b(20\d{2})\b/)?.[1]);
    const [, mm, dd] = when.match(/^(\d{1,2})\/(\d{1,2})\//) ?? [];
    const date = mm && dd ? new Date(Date.UTC(year, Number(mm) - 1, Number(dd))) : null;
    // "50K", "Stone Steps 50K Trail Run" and the like: see distanceFromEventName.
    const distanceSlug = distanceFromEventName(e.name);
    if (!Number.isFinite(year)) {
      warn(`RunSignUp event ${e.event_id} "${e.name}" has no readable year in "${when}"; skipped.`);
      continue;
    }
    if (!distanceSlug) {
      warn(`RunSignUp event ${e.event_id} "${e.name}" (${year}) is not a 50K or 27K; skipped.`);
      continue;
    }
    events.push({ eventId: e.event_id, year, date, distanceSlug, name: e.name });
  }
  return events;
}

/** Every finisher in one event, or [] when the event has no published results. */
async function fetchResults(eventId) {
  const url =
    `${API}/race/${RACE_ID}/results/get-results` +
    `?format=json&event_id=${eventId}&results_per_page=2500`;
  const data = await getJson(url);
  // Which set is the archive, and who in it is a trekker: see
  // scripts/lib/result-sets.mjs (2026 split the trekkers into their own set).
  return pickResultRows(data.individual_results_sets);
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
      // A trekker gets no place, as in the 2004 to 2007 archive rows: their
      // place in the timer's combined set ranks them against the field.
      ...(row.trekker
        ? { trekker: true }
        : Number.isFinite(Number(row.place))
          ? { place: Number(row.place) }
          : {}),
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
    let trekkers = 0;
    let note;
    try {
      ({ rows, trekkers, note } = await fetchResults(ev.eventId));
    } catch (err) {
      warn(`${ev.year} ${ev.name}: RunSignUp did not answer (${err.message}); skipped this run.`);
      continue;
    }

    if (rows.length === 0) {
      console.log(`  - ${ev.year} ${ev.name.padEnd(4)} no published results`);
      // A race from the last two months with nothing on the API a week after it
      // ran: either the timer is late, or the results went up as a file the API
      // cannot reach (2021's 27K did; scripts/import-results-html.mjs reads those).
      const days = ev.date ? (Date.now() - ev.date.getTime()) / 86_400_000 : NaN;
      if (days > 7 && days < 60) {
        warn(
          `${ev.year} ${ev.name}: no results on the RunSignUp API ${Math.floor(days)} days ` +
            'after the race. If they are on the results page they may be an uploaded file; ' +
            'see scripts/import-results-html.mjs.',
        );
      }
      continue;
    }
    if (note) warn(`${ev.year} ${ev.name}: ${note}.`);

    let kept = 0;
    let unreadable = 0;
    for (const row of rows) {
      const mapped = mapResult(row, ev);
      if (!mapped) {
        // A row with something time-like in it that still did not map means
        // the format moved (a new time shape, renamed name columns). DNF and
        // blank rows have no digits and are skipped quietly, as before.
        const timeLike = `${row.chip_time ?? ''}${row.clock_time ?? ''}`;
        if (/\d/.test(timeLike)) unreadable += 1;
        skipped.push(`${ev.year} ${ev.name} ${row.first_name ?? ''} ${row.last_name ?? ''}`.trim());
        continue;
      }
      athletes.set(mapped.athlete._id, mapped.athlete);
      results.push(mapped.result);
      kept += 1;
    }
    // As many unreadable timed rows as readable ones is not a few bad rows, it
    // is a format change. Fail the run before anything is written, so GitHub
    // emails, rather than quietly import a year with half its finishers gone.
    if (unreadable > 0 && unreadable >= kept) {
      console.error(
        `  ! ${ev.year} ${ev.name}: ${unreadable} rows have a time that could not be read ` +
          `(${kept} could). RunSignUp's format has probably changed; nothing was written.`,
      );
      process.exit(1);
    }
    if (unreadable > 0) {
      warn(`${ev.year} ${ev.name}: ${unreadable} rows had a time that could not be read.`);
    }
    covered.push(`${ev.year} ${ev.name}`);
    console.log(
      `  + ${ev.year} ${ev.name.padEnd(4)} ${kept} finishers` +
        (trekkers ? ` (${trekkers} trekker rows flagged)` : ''),
    );
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
  // that does not exist yet is a broken document. Each document is two
  // mutations (create if new, then set the import's own fields), so a chunk of
  // 50 documents is one transaction of 100.
  const docs = [...athletes.values(), ...results];
  let done = 0;
  for (let i = 0; i < docs.length; i += 50) {
    const chunk = docs.slice(i, i + 50);
    await client.mutate(chunk.flatMap(importMutations), {
      visibility: 'async',
      returnDocuments: false,
    });
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
