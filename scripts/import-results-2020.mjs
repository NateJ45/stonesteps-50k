// scripts/import-results-2020.mjs
//
// The 2020 field, which the REST API cannot see.
//
// WHY THIS EXISTS AND import-results.mjs DOES NOT COVER IT. Every other year's
// results hang off a RunSignUp EVENT, and the importer reads them with
// `/Rest/race/15282/results/get-results?event_id=…`. 2020 does not: its 2020
// events (377813, 377814) exist and return `individual_results_sets: []`,
// because the race published that year through RunSignUp's CUSTOM results
// pages instead. There is no REST parameter for a custom set. Asked for one by
// `custom_result_set_id` or `result_set_id` the API replies "Invalid
// parameters"; asked with the event id as well it replies with an empty set.
// The only representation RunSignUp serves is the HTML page, so that is what
// this reads (verified 2026-09-12).
//
// That is the whole difference. Everything downstream is identical: the same
// name canonicalisation, the same time parser, the same athlete and raceResult
// document shapes, so a 2020 row is indistinguishable from a 2019 one once it
// lands. `timeSource` is 'gun' for every row, because the page publishes one
// Time column and 2020 predates the chip times the archive carries from 2024.
//
// IDEMPOTENT, like the main importer, but keyed differently. The API rows carry
// a `result_id`; these do not. The bib number is the stable identity within a
// year and distance, so ids read `result-2020-50k-361`. Re-running updates in
// place and can never duplicate.
//
//   node scripts/import-results-2020.mjs --dry-run
//   node scripts/import-results-2020.mjs
//
// If RunSignUp ever migrates 2020 onto a real event, delete this script and run
// the normal importer: the ids will differ, so unset the old ones first.

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
const DRY_RUN = process.argv.includes('--dry-run');

if (!projectId || !token) {
  console.log('PUBLIC_SANITY_PROJECT_ID and SANITY_API_WRITE_TOKEN must be set.');
  process.exit(0);
}

const YEAR = 2020;
const RACE_ID = 15282;
/** One custom results page per distance. Both verified to hold 2020 overall. */
const SETS = [
  { page: 36536, distanceSlug: '50k' },
  { page: 36539, distanceSlug: '27k' },
];

const client = createClient({ projectId, dataset, apiVersion: '2026-05-01', token, useCdn: false });

const strip = (html) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

/** The slug rule the main importer uses. Kept identical on purpose. */
function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * One results page as an array of cell arrays.
 *
 * The table's header is: Place, No., Name, (surname), Age, Sex, City, State,
 * Div, Time, Pace, … The name is split across two columns, which is why this
 * indexes by position rather than by header text.
 */
async function fetchRows({ page }) {
  const url = `https://runsignup.com/Race/Results/${RACE_ID}?customResultsPageId=${page}&num=2500`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  const html = await res.text();
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
    .map((m) => [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => strip(c[1])))
    .filter((cells) => cells.length > 10);
  const header = rows.shift();
  if (!header || header[0] !== 'Place' || header[9] !== 'Time') {
    throw new Error(`Unexpected table shape on page ${page}: ${JSON.stringify(header)}`);
  }
  return rows;
}

/** One HTML row to the same athlete + result pair the API path produces. */
function mapRow(cells, distanceSlug) {
  const [place, bib, first, last, age, sex, city, state] = cells;
  const time = cells[9];
  const name = `${titleCaseName(first)} ${titleCaseName(last)}`.trim();
  if (!name) return null;
  const timeSeconds = parseRaceTime(time);
  if (!timeSeconds) return null;
  const rawSlug = slugify(name);
  if (!rawSlug) return null;
  if (!bib) return null;

  const slug = canonicalSlug(rawSlug);
  const displayName = canonicalName(rawSlug, name);
  const gender = sex === 'M' || sex === 'F' ? sex : 'X';
  const ageNum = Number(age);

  return {
    athlete: {
      _id: `athlete-${slug}`,
      _type: 'athlete',
      name: displayName,
      slug: { _type: 'slug', current: slug },
      ...(city ? { city } : {}),
      ...(state ? { region: state } : {}),
    },
    result: {
      _id: `result-${YEAR}-${distanceSlug}-${bib}`,
      _type: 'raceResult',
      athlete: { _type: 'reference', _ref: `athlete-${slug}` },
      distance: { _type: 'reference', _ref: `distance-${distanceSlug}` },
      year: YEAR,
      timeSeconds,
      gender,
      ...(Number.isFinite(ageNum) && ageNum > 0 ? { age: ageNum } : {}),
      ...(Number.isFinite(Number(place)) ? { place: Number(place) } : {}),
      // The page publishes one Time column, and 2020 predates chip timing here.
      timeSource: 'gun',
    },
  };
}

async function main() {
  console.log(`Importing ${YEAR} into ${projectId}/${dataset}${DRY_RUN ? ' (DRY RUN)' : ''}\n`);
  const athletes = new Map();
  const results = [];

  for (const set of SETS) {
    const rows = await fetchRows(set);
    let kept = 0;
    for (const cells of rows) {
      const mapped = mapRow(cells, set.distanceSlug);
      if (!mapped) continue;
      athletes.set(mapped.athlete._id, mapped.athlete);
      results.push(mapped.result);
      kept++;
    }
    console.log(`  ${set.distanceSlug}: ${kept} finishers of ${rows.length} rows`);
  }

  const fastest = [...results].sort((a, b) => a.timeSeconds - b.timeSeconds)[0];
  console.log(
    `\n${results.length} results, ${athletes.size} athletes. Fastest: ${fastest?.timeSeconds}s`,
  );

  if (DRY_RUN) {
    console.log('\nDry run: nothing written.');
    return;
  }

  let tx = client.transaction();
  for (const a of athletes.values()) {
    // createIfNotExists: a runner who also ran another year already has a
    // document, and their city or name spelling there is not ours to overwrite.
    tx = tx.createIfNotExists(a);
  }
  for (const r of results) tx = tx.createOrReplace(r);
  await tx.commit();
  console.log(`Wrote ${results.length} results and up to ${athletes.size} athletes.`);
}

await main();
