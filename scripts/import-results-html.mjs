// scripts/import-results-html.mjs
//
// The fields the REST API cannot see: 2020, and the 2021 27K.
//
// WHY THIS EXISTS AND import-results.mjs DOES NOT COVER IT. Every other
// distance and year hangs off a RunSignUp EVENT, and the main importer reads
// it with `/Rest/race/15282/results/get-results?event_id=…`. These do not.
// The 2020 events (377813, 377814) and the 2021 27K (460808) all exist and all
// return `individual_results_sets: []`, because the race published those
// through RunSignUp's CUSTOM results pages, which no REST parameter can reach:
// asked by `individual_result_set_id` the API says "Invalid parameters",
// asked with the event id as well it answers with an empty set (verified
// 2026-09-12; the 2021 50K, event 460807, comes back as "Overall 50K", set
// 285063, so it is the 27K alone that is missing that year). The only
// representation RunSignUp serves is an HTML table, so that is what this reads.
//
// TWO TABLE SHAPES, one reader. 2020's pages split the name across two columns
// and carry city and state; the 2021 export is a single name column with four
// lap splits and the total under the distance's own name ("27k"). Columns are
// found BY HEADER, not by position, and the name is every column between
// "No." and "Age", so a third shape is a new entry in SOURCES rather than a
// new script. A row with no total time is not a finisher (the 2021 export
// lists its DNFs with laps but no total) and is skipped.
//
// Everything downstream is identical to the API path: the same name
// canonicalisation, the same time parser, the same athlete and raceResult
// document shapes, so a row from here is indistinguishable from an API row once
// it lands. `timeSource` is 'gun' for all of them: one Time column, and every
// one of these predates the chip times the archive carries from 2024.
//
// IDEMPOTENT, keyed by bib. API rows carry a `result_id`; these do not. The bib
// is the stable identity within a year and distance, so ids read
// `result-2020-50k-361`. Re-running updates in place and can never duplicate.
// The 2020 ids are unchanged from the script this replaces.
//
//   node scripts/import-results-html.mjs --dry-run
//   node scripts/import-results-html.mjs
//   node scripts/import-results-html.mjs --year=2021
//
// If RunSignUp ever migrates one of these onto a real event, remove its entry
// here and run the normal importer: the ids will differ, so unset the old ones
// first.

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
const ONLY_YEAR = Number(process.argv.find((a) => a.startsWith('--year='))?.split('=')[1]);

if (!projectId || !token) {
  console.log('PUBLIC_SANITY_PROJECT_ID and SANITY_API_WRITE_TOKEN must be set.');
  process.exit(0);
}

const RACE_ID = 15282;

/**
 * One HTML results table per year and distance. `url` is the page that holds
 * the table; `time` is the header of the column that carries the finishing
 * time, because it is "Time" on the 2020 pages and the distance's own name on
 * the 2021 export. Everything else is found by header.
 */
const SOURCES = [
  {
    year: 2020,
    distanceSlug: '50k',
    url: `https://runsignup.com/Race/Results/${RACE_ID}?customResultsPageId=36536&num=2500`,
    time: 'Time',
  },
  {
    year: 2020,
    distanceSlug: '27k',
    url: `https://runsignup.com/Race/Results/${RACE_ID}?customResultsPageId=36539&num=2500`,
    time: 'Time',
  },
  {
    // "2021 27K Results with Lap Times", the timer's own export, which RunSignUp
    // links from the race's results page and hosts on its CDN. Place, No.,
    // Name, Age, Sex, four laps, the total under "27k", Pace.
    year: 2021,
    distanceSlug: '27k',
    url: 'https://d368g9lw5ileu7.cloudfront.net/races/results_wpy8q8ns5ob8omib6wpc62el3eg.html',
    time: '27k',
  },
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

/** The first table on the page as rows of cells, header first. */
async function fetchTable(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  const html = await res.text();
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((m) => [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => strip(c[1])))
    .filter((cells) => cells.length > 5);
  const header = rows.shift();
  if (!header) throw new Error(`No table found at ${url}`);
  return { header, rows };
}

/**
 * Column positions from the header. Name is a RANGE: the 2020 pages split it
 * into two columns, the second with an empty header, so it is every column
 * between "No." and "Age".
 */
function columnsOf(header, timeHeader) {
  const find = (want) =>
    header.findIndex((h) => h.replace(/\s+/g, ' ').trim().toLowerCase() === want.toLowerCase());
  const place = find('Place');
  const bib = find('No.');
  const age = find('Age');
  const sex = find('Sex');
  const city = find('City');
  const state = find('State');
  const time = find(timeHeader);
  if (place < 0 || bib < 0 || age < 0 || time < 0) {
    throw new Error(`Unexpected table shape: ${JSON.stringify(header)}`);
  }
  return { place, bib, nameFrom: bib + 1, nameTo: age, age, sex, city, state, time };
}

/** One HTML row to the same athlete + result pair the API path produces. */
function mapRow(cells, col, source) {
  const name = cells
    .slice(col.nameFrom, col.nameTo)
    .map((c) => titleCaseName(c))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!name) return null;
  const bib = cells[col.bib];
  if (!bib) return null;
  // No total time is not a finisher. The 2021 export lists DNFs with their laps.
  const timeSeconds = parseRaceTime(cells[col.time]);
  if (!timeSeconds) return null;
  const rawSlug = slugify(name);
  if (!rawSlug) return null;

  const slug = canonicalSlug(rawSlug);
  const displayName = canonicalName(rawSlug, name);
  const sexRaw = col.sex >= 0 ? cells[col.sex] : '';
  const gender = sexRaw === 'M' || sexRaw === 'F' ? sexRaw : 'X';
  const ageNum = Number(cells[col.age]);
  const place = Number(cells[col.place]);
  const city = col.city >= 0 ? cells[col.city] : '';
  const state = col.state >= 0 ? cells[col.state] : '';

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
      _id: `result-${source.year}-${source.distanceSlug}-${bib}`,
      _type: 'raceResult',
      athlete: { _type: 'reference', _ref: `athlete-${slug}` },
      distance: { _type: 'reference', _ref: `distance-${source.distanceSlug}` },
      year: source.year,
      timeSeconds,
      gender,
      ...(Number.isFinite(ageNum) && ageNum > 0 ? { age: ageNum } : {}),
      ...(Number.isFinite(place) && place > 0 ? { place } : {}),
      timeSource: 'gun',
    },
  };
}

async function main() {
  const wanted = ONLY_YEAR ? SOURCES.filter((s) => s.year === ONLY_YEAR) : SOURCES;
  console.log(
    `Importing ${wanted.map((s) => `${s.year} ${s.distanceSlug}`).join(', ')} into ` +
      `${projectId}/${dataset}${DRY_RUN ? ' (DRY RUN)' : ''}\n`,
  );
  const athletes = new Map();
  const results = [];

  for (const source of wanted) {
    const { header, rows } = await fetchTable(source.url);
    const col = columnsOf(header, source.time);
    let kept = 0;
    let skipped = 0;
    for (const cells of rows) {
      const mapped = mapRow(cells, col, source);
      if (!mapped) {
        skipped++;
        continue;
      }
      athletes.set(mapped.athlete._id, mapped.athlete);
      results.push(mapped.result);
      kept++;
    }
    const fastest = results
      .filter((r) => r.year === source.year && r.distance._ref.endsWith(source.distanceSlug))
      .sort((a, b) => a.timeSeconds - b.timeSeconds)[0];
    console.log(
      `  ${source.year} ${source.distanceSlug}: ${kept} finishers of ${rows.length} rows ` +
        `(${skipped} without a time or a bib), fastest ${fastest?.timeSeconds}s`,
    );
  }

  console.log(`\n${results.length} results, ${athletes.size} athletes.`);
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
