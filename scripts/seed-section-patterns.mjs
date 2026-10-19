// Seeds the race-year saved sections (registration, the price step, the waitlist, volunteers,
// race week, the weather, a course change, results, records, photos, sponsors, next year's date)
// so the race director can add them to any page with "Insert a saved section" (2026-10-18).
//
// The words live in src/sanity/sectionPatterns.ts, which src/lib/authoring.test.ts checks (block
// types, keys, example markers). This script only copies them into the dataset, because the page
// builder's insert menu reads saved sections from there.
//
// What it writes: one DRAFT `sectionPreset` per pattern, id `drafts.pattern-<id>`. Drafts on
// purpose: "Add a copy" works from a draft, but "Add synced" needs a published saved section, so
// the Example text in these can never go live through a synced section.
//
// What it never does: overwrite or delete. A pattern whose draft OR published id already exists is
// skipped, so re-running it after the race director has edited (or published, or renamed) one is
// safe. Nothing is replaced, so there is nothing to back up first (rule 16 covers retiring data).
//
// Dry by default. Production needs --apply AND NCS_PRODUCTION_WRITE=yes (PORTS.md card 86).
// It imports a .ts file, so Node 22 needs the strip-types flag:
//   node --experimental-strip-types scripts/seed-section-patterns.mjs
//   NCS_PRODUCTION_WRITE=yes node --experimental-strip-types scripts/seed-section-patterns.mjs --apply
// Verify afterwards: Content, Pages, Saved sections lists the twelve, each marked as a draft.

import { client, apply, done } from './lib/sanity-lib.mjs';
import { SECTION_PATTERNS } from '../src/sanity/sectionPatterns.ts';

const ids = SECTION_PATTERNS.map((p) => `pattern-${p.id}`);
// perspective 'raw': newer API versions read the published view by default, which hides the
// drafts this script writes, so a rerun would report them as missing.
const found = await client.withConfig({ perspective: 'raw' }).fetch('*[_id in $ids]._id', {
  ids: [...ids, ...ids.map((id) => `drafts.${id}`)],
});
const existing = new Set(found.map((id) => id.replace(/^drafts\./, '')));

let changes = 0;
for (const pattern of SECTION_PATTERNS) {
  const id = `pattern-${pattern.id}`;
  if (existing.has(id)) {
    console.log(`SKIP "${pattern.title}": already in the dataset, never overwritten.`);
    continue;
  }
  const section = pattern.sections();
  const doc = {
    _id: `drafts.${id}`,
    _type: 'sectionPreset',
    title: pattern.title,
    note: pattern.note,
    sectionType: section[0]?._type,
    section,
  };
  await apply(
    `create draft saved section "${pattern.title}" (${section.map((s) => s._type).join(', ')})`,
    () => client.createIfNotExists(doc),
  );
  changes++;
}
done(changes);
