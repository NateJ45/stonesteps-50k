// scripts/repair-athletes.mjs
//
// Usage:
//   node scripts/repair-athletes.mjs --dry-run
//   node scripts/repair-athletes.mjs
//
// Three repairs, all idempotent and all safe to re-run.
//
// ---------------------------------------------------------------------------
// 1. THE "... Trek" ATHLETES. A real identity bug, and the exact one this whole
//    data model exists to prevent.
//
//    The 2004 and 2005 results pages marked the early starters by appending
//    "Trek" INSIDE the name cell, so the archive extractor read "Rob Apple
//    Trek" as somebody's name. Four runners ended up as two athlete documents
//    each: Wesley Fenton had four finishes under his own name and two more
//    stranded under a second document, so his runner page told half his story
//    while looking authoritative.
//
//    It surfaced only when /results started rendering full fields. Records and
//    top-tens never showed these names, because a trekker is excluded from
//    both, which is why a bug in the trekker rows survived every check the site
//    already had.
//
//    scripts/data/archive-results.json is fixed at source: the suffix is
//    stripped, `trekker` is set, and the slug is recomputed. That changes the
//    result _ids (they carry the slug), so the OLD documents have to be deleted
//    rather than replaced, which is what this script does before the archive
//    import is re-run.
//
// 2. ALIASED ATHLETES. src/lib/athlete-aliases.ts collapses the runners the
//    race spelled two ways onto one identity. The importers apply it going
//    forward, but the losing document is already in the dataset and the
//    results under it carry _ids built from the old slug, so they cannot be
//    replaced in place either. Same treatment as the trekker rows: delete,
//    then re-import.
//
// 3. NAME CASING. titleCaseName now capitalises the letter after "Mc" and
//    uppercases a trailing II/III/IV. Those names are already stored, and the
//    archive import uses createIfNotExists for athletes (so the API's richer
//    record is never clobbered), which means it will not rewrite them. This
//    re-normalises every athlete name in place.
//
//    Casing never moves a slug, so this rewrites the `name` field only and
//    cannot fork an athlete. race-time.test.ts asserts that property.
// ---------------------------------------------------------------------------

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@sanity/client';
import { loadEnv } from './lib/loadEnv.mjs';
import { titleCaseName } from '../src/lib/race-time.ts';
import { ATHLETE_ALIASES } from '../src/lib/athlete-aliases.ts';

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
  console.log('SANITY_API_WRITE_TOKEN is not set. A write token is required.');
  process.exit(0);
}

const client = createClient({ projectId, dataset, token, apiVersion: '2026-05-01', useCdn: false });

async function main() {
  // ---- 1. the mis-parsed trekker athletes, and every result pointing at them
  const stale = await client.fetch(
    `*[_type == "athlete" && name match "* Trek"]{
      _id, name,
      "results": *[_type == "raceResult" && references(^._id)]._id
    }`,
  );

  const staleResults = stale.flatMap((a) => a.results);
  console.log(
    `Mis-parsed trekker athletes: ${stale.length} (${staleResults.length} results attached)`,
  );
  for (const a of stale) console.log(`  ${a._id}  ${a.name}  ->  ${a.name.replace(/ Trek$/, '')}`);

  // ---- 2. athletes that an alias entry has since collapsed into another
  const variants = Object.keys(ATHLETE_ALIASES).map((slug) => `athlete-${slug}`);
  const aliased = variants.length
    ? await client.fetch(
        `*[_type == "athlete" && _id in $ids]{
          _id, name,
          "results": *[_type == "raceResult" && references(^._id)]._id
        }`,
        { ids: variants },
      )
    : [];
  const aliasedResults = aliased.flatMap((a) => a.results);
  console.log(
    `\nAliased athletes to fold in: ${aliased.length} (${aliasedResults.length} results)`,
  );
  for (const a of aliased) {
    const to = ATHLETE_ALIASES[a._id.replace(/^athlete-/, '')];
    console.log(`  ${a._id}  ${a.name}  ->  ${to.name}`);
  }

  // ---- 3. every athlete whose stored name is not what titleCaseName now makes
  const athletes = await client.fetch(`*[_type == "athlete"][0...5000]{ _id, name }`);
  const renames = athletes
    .filter((a) => !/ Trek$/.test(a.name ?? ''))
    .filter((a) => !variants.includes(a._id))
    .map((a) => ({ ...a, fixed: titleCaseName(a.name) }))
    .filter((a) => a.fixed && a.fixed !== a.name);

  console.log(`\nName casing to repair: ${renames.length}`);
  for (const a of renames.slice(0, 30)) console.log(`  ${a.name}  ->  ${a.fixed}`);
  if (renames.length > 30) console.log(`  ...and ${renames.length - 30} more`);

  if (DRY_RUN) {
    console.log('\nDry run: nothing written.');
    console.log('After the real run, re-run both importers to restore the deleted');
    console.log('results under their corrected athlete.');
    return;
  }

  // Results first: a result whose athlete is gone is a broken reference, so the
  // window where that is true should not exist at all.
  let tx = client.transaction();
  for (const id of [...staleResults, ...aliasedResults]) tx = tx.delete(id);
  for (const a of [...stale, ...aliased]) tx = tx.delete(a._id);
  if (staleResults.length + aliasedResults.length + stale.length + aliased.length) {
    await tx.commit({ visibility: 'async' });
    console.log(
      `\nDeleted ${staleResults.length + aliasedResults.length} results and ${stale.length + aliased.length} athletes.`,
    );
  }

  let done = 0;
  for (let i = 0; i < renames.length; i += 50) {
    let t = client.transaction();
    for (const a of renames.slice(i, i + 50)) t = t.patch(a._id, { set: { name: a.fixed } });
    await t.commit({ visibility: 'async' });
    done += Math.min(50, renames.length - i);
    process.stdout.write(`\r  renamed ${done}/${renames.length}`);
  }
  if (renames.length) process.stdout.write('\n');

  console.log('\nDone. Now re-run BOTH importers to restore what was deleted:');
  console.log('  node scripts/import-archive.mjs');
  console.log('  node scripts/import-results.mjs');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
