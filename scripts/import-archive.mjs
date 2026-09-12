// scripts/import-archive.mjs
//
// Imports the recovered 2003 to 2016 results from scripts/data/archive-results.json.
//
// Usage:
//   node scripts/import-archive.mjs --dry-run
//   node scripts/import-archive.mjs
//
// Idempotent: deterministic _id values with createOrReplace.
//
// ---------------------------------------------------------------------------
// WHERE THIS DATA CAME FROM, AND WHY IT IS A FILE RATHER THAN A SCRAPER
//
// The race used to publish per-year results at /results-2003/ through
// /results-2020/. They were deleted in a redesign: the live site is now three
// pages and its own history is gone from it. The pages survive in the Wayback
// Machine, and this is what was recovered from them.
//
// The recovery is a FILE, not a live scraper, for three reasons: it should not
// depend on archive.org staying up, the parse is auditable in a diff, and
// re-running the import must not re-scrape twenty years of someone else's
// bandwidth. The extraction script that produced it is a one-off and is
// described below rather than shipped, because it needed a spreadsheet parser
// this project should not carry forever.
//
// A TRANSCRIPTION BUG WORTH KNOWING ABOUT (found 2026-09-12). The archived
// pages carry a "Sex" column, and THEY DO NOT ALL SPELL IT THE SAME WAY: 2003
// uses M and F, 2004 uses M and W, and 2005 uses M, F and one stray W. The
// original extraction understood M and F only, so 2004's three women came
// through as X, unknown, and the site showed the 2004 row with a men's winner
// and a dash where the women's winner should be. The page itself is explicit:
// "5 | Linda Barhorst | 42 | W | 6:17:05 | 1st W". Fixed in the data.
//
// The one X left is Wesley Fenton in 2005, whom that page marks W while 2003,
// 2004, 2006, 2007 and 2008 all record him M. That is a typo on the race's own
// page, so the transcript keeps X (meaning "this source is not trustworthy
// here") and resolveUnknownGenders settles it from his other years.
//
// RE-VERIFIED AGAINST THE SOURCES, EVERY YEAR, 2026-09-12. After the W bug
// above was found in 2004, all fourteen years were fetched again from their
// archived pages and compared row by row on name and gender. Every year
// matches its page exactly:
//
//   2003 23   2004 19   2005 22   2006 48   2007 51   2008 57   2009 60
//   2010 68   2011 68   2012 73   2013 83   2014 94   2015 128  2016 135
//
// Two traps in that comparison, in case anyone repeats it. The 2007 to 2009
// pages list DNF and DNS rows alongside finishers, so a raw row count says a
// year is short when it is not: 2007's own prose reads "65 runners registered,
// 63 starters, and 51 finishers", and 51 is what we hold. And those same pages
// split the runner's name across two columns, so matching on the column headed
// "Name" compares first names to full names.
//
// A SECOND RECOVERY CAME OUT OF THAT PASS (2026-09-12). 2010 and 2011 had no
// finishing place on any of their 136 rows, which showed up as a blank Place
// on a runner's own page. Both pages do publish one; it was lost because the
// header cell carrying the label is merged with the page's prose blob ("2010
// Race Results ..."), so a header-driven parser sees no column called Place and
// the first data cell looks unlabelled. It is the place. Recovered by position:
// 2010 reads [place, name, age, sex, city, state, div, time] and 2011 inserts a
// bib after it. All 136 matched by name with no duplicate place in either year.
//
// STILL NO PLACE, CORRECTLY: 2003, 2004 and 2014. Their pages do not publish
// one. 2003 and 2004 lead with "Race Number", which is a bib and not a
// placing, and 2014 starts straight at Name. The rows are in finishing order,
// so the year table numbers them by position, but a runner's own page leaves
// the column blank rather than presenting a row index as a result. Deriving it
// would also be wrong in the years with trekkers, who start an hour early and
// whose finish order is not their placing.
//
// The comparison found exactly one further error, now fixed: 2006's Mary
// Wienholtz was transcribed "Mary Weinholts". The page spells it Wienholtz
// twice, in her results row and in the door-prize list under it. She ran only
// that year, so there was no second source to catch it.
//
// SOURCES, which differ by year:
//   2003-2005  HTML tables on the archived pages
//   2006-2009  the race's own .xls timing spreadsheets. The archived pages for
//              these years render EMPTY tables: TablePress kept the data in the
//              plugin database and only the shell was captured, so the
//              spreadsheets are the only surviving copy.
//   2010-2016  HTML tables, with the 50K and the 27K as separate tables from
//              2015 onward.
//
// VALIDATION, before any of it was imported:
//   - Eight of the race's ten published records reproduce EXACTLY, to the
//     second, across four different source formats. The two that do not are
//     both 27K records from 2013 and 2014, and the archived pages for those
//     years carry only the 50K: the 27K results lived on runningtime.net,
//     which is gone. That is a known gap, not a parse failure.
//   - 2017 exists in both this archive and the RunSignUp API. Every runner and
//     every time is identical: 61 of 61 in the 50K, 72 of 72 in the 27K. Two
//     entirely independent pipelines agreeing to the second is the strongest
//     check available, and it is why the rest is trusted.
//
// WHAT IS STILL MISSING:
//   - The 27K before 2015, which was timed on runningtime.net.
//
// 2020 was listed here as lost until 2026-09-12, on the evidence that RunSignUp
// had no result set and the one Wayback capture was an empty page shell. Both
// were true and the conclusion was wrong: the race published that year through
// RunSignUp's CUSTOM results pages, which the REST API cannot see at all.
// scripts/import-results-html.mjs reads them, and the 2021 27K with them.
//
// This file stops at 2016 on purpose. The API import owns 2017 onward, the two
// agree exactly where they overlap, and keeping them disjoint means neither can
// produce a duplicate of the other.
// ---------------------------------------------------------------------------

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { createClient } from '@sanity/client';
import { loadEnv } from './lib/loadEnv.mjs';
import { canonicalSlug, canonicalName } from '../src/lib/athlete-aliases.ts';
import { resolveUnknownGenders, resolvedGenderReport } from '../src/lib/resolve-gender.ts';
import { derivePlaces, derivedPlaceReport } from '../src/lib/derive-place.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const env = loadEnv(root);

const DRY_RUN = process.argv.includes('--dry-run');
const projectId = env.PUBLIC_SANITY_PROJECT_ID;
const dataset = env.PUBLIC_SANITY_DATASET ?? 'production';
const token = env.SANITY_API_WRITE_TOKEN;

if (!projectId) {
  console.log('PUBLIC_SANITY_PROJECT_ID is not set. Configure your .env and re-run.');
  process.exit(0);
}
if (!token && !DRY_RUN) {
  console.log('SANITY_API_WRITE_TOKEN is not set. A write token is required to import.');
  process.exit(0);
}

const client = createClient({ projectId, dataset, token, apiVersion: '2026-05-01', useCdn: false });

const recovered = JSON.parse(
  readFileSync(resolve(root, 'scripts/data/archive-results.json'), 'utf8'),
);

// THE JSON STAYS A FAITHFUL TRANSCRIPT of what came back off the Wayback
// captures, including the four rows that came through with no gender. This
// fills those in from the SAME RUNNER'S other years, where the race itself
// recorded one, and leaves alone anybody there is no evidence for. The rule and
// the reason it refuses to guess from a name are in src/lib/resolve-gender.ts;
// it is tested, so the archive can be re-imported without the fix eroding.
const withGender = resolveUnknownGenders(recovered);
const genderFixes = resolvedGenderReport(recovered, withGender);

// 2003, 2004 and 2014 publish no finishing place, so the place is ranked from
// the times here. Doing it at import rather than at render is what stops the
// year page and a runner's own page giving two answers about the same row: the
// year table used to fall back to the row index and show Marc Teismann 3rd in
// 2014 while his runner page showed nothing. The rule, including how it treats
// ties and trekkers, is in src/lib/derive-place.ts and is tested.
const rows = derivePlaces(withGender);
const placeFixes = derivedPlaceReport(withGender, rows);

const athletes = new Map();
const results = [];

for (const r of rows) {
  // One runner, one document, even where the race spelled them two ways.
  // src/lib/athlete-aliases.ts carries the evidence for each merge.
  const slug = canonicalSlug(r.slug);
  const name = canonicalName(r.slug, r.name);
  const athleteId = `athlete-${slug}`;

  // An athlete may already exist from the API import. Only fill in what the
  // archive knows and the API did not, rather than overwriting a recent city
  // with a twenty-year-old one: patch semantics are handled below by writing
  // the athlete only if it is new to this run, and using createIfNotExists.
  if (!athletes.has(athleteId)) {
    athletes.set(athleteId, {
      _id: athleteId,
      _type: 'athlete',
      name,
      slug: { _type: 'slug', current: slug },
      ...(r.city ? { city: r.city } : {}),
      ...(r.region ? { region: r.region } : {}),
    });
  }

  results.push({
    _id: `archive-${r.year}-${r.distance}-${slug}`,
    _type: 'raceResult',
    athlete: { _type: 'reference', _ref: athleteId },
    distance: { _type: 'reference', _ref: `distance-${r.distance}` },
    year: r.year,
    timeSeconds: r.timeSeconds,
    gender: r.gender ?? 'X',
    ...(r.age ? { age: r.age } : {}),
    ...(r.place ? { place: r.place } : {}),
    // Every one of these predates chip timing at this race.
    timeSource: 'gun',
    ...(r.trekker ? { trekker: true } : {}),
  });
}

async function main() {
  const years = [...new Set(rows.map((r) => r.year))].sort();
  console.log(
    `Archive: ${results.length} results, ${athletes.size} athletes, ${years[0]} to ${years.at(-1)}`,
  );
  if (genderFixes.length > 0) {
    console.log(
      `  gender filled from the same runner's other years: ` +
        genderFixes.map((f) => `${f.slug}=${f.gender}`).join(', '),
    );
  }
  if (Object.keys(placeFixes).length > 0) {
    console.log(
      `  place ranked from the times where the race published none: ` +
        Object.entries(placeFixes)
          .map(([y, n]) => `${y}=${n}`)
          .join(', '),
    );
  }
  const stillUnknown = rows.filter((r) => r.gender !== 'M' && r.gender !== 'F');
  if (stillUnknown.length > 0) {
    console.log(
      `  still unknown (no other running on file, and a name is not evidence): ` +
        stillUnknown.map((r) => `${r.year} ${r.slug}`).join(', '),
    );
  }

  if (DRY_RUN) {
    const byYear = {};
    for (const r of rows) {
      const k = `${r.year} ${r.distance}`;
      byYear[k] = (byYear[k] ?? 0) + 1;
    }
    for (const k of Object.keys(byYear).sort()) console.log(`  ${k}: ${byYear[k]}`);
    console.log('\nDry run: nothing written.');
    return;
  }

  // Athletes first, with createIfNotExists so the API import's richer record
  // (it carries city and state from the timer) is never clobbered by an older
  // one. A result referencing a document that does not exist is broken, so
  // these have to land first either way.
  let done = 0;
  const athleteDocs = [...athletes.values()];
  for (let i = 0; i < athleteDocs.length; i += 50) {
    let tx = client.transaction();
    for (const doc of athleteDocs.slice(i, i + 50)) tx = tx.createIfNotExists(doc);
    await tx.commit({ visibility: 'async' });
    done += Math.min(50, athleteDocs.length - i);
    process.stdout.write(`\r  athletes ${done}/${athleteDocs.length}`);
  }
  process.stdout.write('\n');

  done = 0;
  for (let i = 0; i < results.length; i += 50) {
    let tx = client.transaction();
    for (const doc of results.slice(i, i + 50)) tx = tx.createOrReplace(doc);
    await tx.commit({ visibility: 'async' });
    done += Math.min(50, results.length - i);
    process.stdout.write(`\r  results ${done}/${results.length}`);
  }
  process.stdout.write('\nDone.\n');
  console.log('Still missing: the 27K before 2015. See this file’s header.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
