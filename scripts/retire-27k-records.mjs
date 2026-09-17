// scripts/retire-27k-records.mjs
//
// Retire the five transcribed 27K records that predate the 27K itself.
//
// WHY. Dave wrote on 2026-09-17 that "the 27k came about in 2015, so you won't
// find a history for that". The old site's records page nevertheless listed
// 27K marks from 2010 to 2014, and five of them were transcribed into
// `recordEntry` documents when this site was seeded (Brian List, Paul Odipo,
// Daniel Campbell, Daniel Heffernan, Charles Lowery). None of the five matches
// any result on file, by name or by time, in any year or either distance
// (docs/PENDING.md, item 1j). A record the race director says cannot exist,
// with nothing behind it, comes off the board.
//
// WHAT IT DOES, in order:
//   1. Reads the five documents and writes them, verbatim, to
//      scripts/data/retired-27k-records.json, so the drop is reversible with a
//      createOrReplace of that file's `docs` array.
//   2. Deletes the five `recordEntry` documents.
//   3. Deletes the athlete documents that existed ONLY to be referenced by
//      those records (no result, no other reference). Charles Lowery stays:
//      he has a 50K finish on file.
//
// Every delete is guarded: a record is only removed if it is a 27K entry dated
// before 2015, and an athlete only if nothing outside those records points at
// them. Run with --dry-run to see the plan without writing anything.
//
// Prerequisites: PUBLIC_SANITY_PROJECT_ID and SANITY_API_WRITE_TOKEN in .env.

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@sanity/client';
import 'dotenv/config';

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.PUBLIC_SANITY_DATASET || 'production';
const token = process.env.SANITY_API_WRITE_TOKEN;
if (!projectId || !token) {
  console.error('Need PUBLIC_SANITY_PROJECT_ID and SANITY_API_WRITE_TOKEN in .env');
  process.exit(1);
}

const dryRun = process.argv.includes('--dry-run');
const client = createClient({ projectId, dataset, apiVersion: '2024-10-01', token, useCdn: false });

const FIRST_27K_YEAR = 2015;
const BACKUP = resolve('scripts/data/retired-27k-records.json');

const records = await client.fetch(
  `*[_type == "recordEntry" && distance._ref == "distance-27k" && year < $first] | order(_id asc)`,
  { first: FIRST_27K_YEAR },
);

if (records.length === 0) {
  console.log('Nothing to retire: no 27K recordEntry dated before', FIRST_27K_YEAR);
  process.exit(0);
}

console.log(`Retiring ${records.length} transcribed 27K record(s):`);
for (const r of records) {
  console.log(`  ${r._id}  ${r.year}  ${r.timeSeconds}s  ${r.athlete?._ref ?? '(no athlete)'}`);
}

// Athletes that only these records point at.
const recordIds = records.map((r) => r._id);
const athleteIds = [...new Set(records.map((r) => r.athlete?._ref).filter(Boolean))];
const orphans = [];
for (const id of athleteIds) {
  const otherRefs = await client.fetch(`*[references($id) && !(_id in $recordIds)]._id`, {
    id,
    recordIds,
  });
  const results = await client.fetch(`count(*[_type == "raceResult" && references($id)])`, { id });
  if (otherRefs.length === 0 && results === 0) orphans.push(id);
  else console.log(`  keeping ${id}: ${results} result(s), ${otherRefs.length} other reference(s)`);
}
console.log(`Orphan athlete(s) to remove with them: ${orphans.join(', ') || '(none)'}`);

const backup = {
  retired: new Date().toISOString().slice(0, 10),
  why:
    'The 27K began in 2015 (Dave, 2026-09-17). These marks were transcribed from the old ' +
    'site records page and match no result on file. See docs/PENDING.md item 1j.',
  restore: 'client.createOrReplace(doc) for each entry in docs, then athletes.',
  docs: records,
  athletes: await client.fetch(`*[_id in $ids]`, { ids: orphans }),
};
writeFileSync(BACKUP, JSON.stringify(backup, null, 2) + '\n');
console.log(`Backup written to ${BACKUP}`);

if (dryRun) {
  console.log('Dry run: nothing deleted.');
  process.exit(0);
}

const tx = client.transaction();
for (const id of [...recordIds, ...orphans]) tx.delete(id);
const res = await tx.commit();
console.log(`Deleted ${res.results.length} document(s) in transaction ${res.transactionId}.`);
console.log('recordEntry documents left:', await client.fetch(`count(*[_type == "recordEntry"])`));
