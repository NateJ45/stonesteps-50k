// scripts/audit-studio.mjs
//
// The Studio audit, as a command: `npm run audit:studio`.
//
// WHY THIS EXISTS. The race director edits this site about twice a year, which
// is long enough that anything wrong in the Studio is discovered by him, alone,
// under time pressure, rather than by us. The faults below are all ones that
// shipped and none of them show up in a build, a type check or a test:
//
//   1. A field that is `hidden: true` AND `Rule.required()`. Sanity validates
//      the document, not the form, so the document is permanently invalid and
//      the error names a field that is nowhere on screen. Four of these were
//      live on 2026-09-12, on Home and on Site Settings.
//
//   2. A preview title selected from a number. Sanity lowercases the title to
//      index it, so the whole array field renders as a red Unhandled Runtime
//      Error. The home page's Numbers Row did this.
//
//   3. A stored key the schema does not declare. The Studio renders it as
//      "Unknown field found" with a REMOVE FIELD button beside it, and that
//      button deletes the value from every document of the type with no undo.
//      A stray key is not cosmetic; it is a loaded gun in an editor's form.
//      Two seeded buttons carried a `href` that ctaBlock has never had.
//
//   4. A page document whose address is on the reserved-route list, so it
//      fails validation with "already used by a built-in page" and cannot be
//      published. The Contact page did, for a list copied from the starter.
//
//   5. A collection type whose "Used on N pages" panel disagrees with the
//      pages that really render it. The 50K said "Used on one page" while its
//      ticket was on two.
//
//   6. A required field that is blank in the live document. Some of those are
//      real jobs for the editor and some mean the requirement is wrong, but
//      either way nobody can publish until it is settled.
//
// It reads the schema as TEXT rather than importing it, because importing the
// schema pulls in @sanity/ui and a React renderer. That means it has to know
// about the field HELPERS this repo uses (confirmedField, imageWithAlt,
// proseBody and friends): a helper call declares a field without ever writing
// `name: '...'`, and a parser that does not know them reports every one of them
// as unknown. Add a helper, add it to FIELD_HELPERS.
//
// Exit code 1 if anything is found, so it can gate a release if we ever want
// it to. It is read-only: it never writes to the dataset.

import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { client } from './lib/sanity-lib.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA_DIR = resolve(root, 'src/sanity/schemaTypes');

/**
 * Field helpers, and the argument that carries the field name.
 * `confirmedField(...)` names its own field, so it is listed with a literal.
 */
const FIELD_HELPERS = {
  imageWithAlt: 'first-arg',
  proseBody: 'first-arg',
  richTwin: 'first-arg',
  headingAccentField: 'first-arg',
  confirmedField: 'confirmed',
};

/** Sanity's own object types, whose keys we do not police. */
const BUILT_IN = new Set([
  'reference',
  'image',
  'file',
  'slug',
  'block',
  'span',
  'geopoint',
  'crop',
  'hotspot',
]);

const SYSTEM_KEYS = new Set([
  '_id',
  '_type',
  '_key',
  '_ref',
  '_rev',
  '_createdAt',
  '_updatedAt',
  '_weak',
  '_strengthenOnPublish',
  '_originalId',
  // Sanity's own document metadata, written by the platform rather than by
  // a schema or an editor. It began appearing on 2026-09-13 and is not drift.
  '_system',
  'orderRank',
]);

// ── Read the schema ────────────────────────────────────────────────────────

/** Every declared field name inside one block of schema source. */
function fieldNames(body) {
  const names = new Set([...body.matchAll(/name:\s*'([A-Za-z0-9_]+)'/g)].map((m) => m[1]));
  for (const [helper, arg] of Object.entries(FIELD_HELPERS)) {
    const re = new RegExp(`${helper}\\(\\s*'([A-Za-z0-9_]+)'`, 'g');
    if (arg === 'first-arg') {
      for (const m of body.matchAll(re)) names.add(m[1]);
    } else if (new RegExp(`${helper}\\(`).test(body)) {
      names.add(arg);
    }
  }
  return names;
}

/** typeName -> Set of field names, across every schema file. */
function readSchema() {
  const types = new Map();
  const add = (name, names) => types.set(name, new Set([...(types.get(name) ?? []), ...names]));

  for (const file of readdirSync(SCHEMA_DIR).filter((f) => f.endsWith('.ts'))) {
    const src = readFileSync(resolve(SCHEMA_DIR, file), 'utf8');

    // Top-level document and object types.
    const starts = [...src.matchAll(/defineType\(\{\s*\n?\s*name:\s*'([A-Za-z0-9_]+)'/g)];
    starts.forEach((m, i) => {
      const end = i + 1 < starts.length ? starts[i + 1].index : src.length;
      add(m[1], fieldNames(src.slice(m.index, end)));
    });

    // Inline object members inside arrays, which are real types with real keys.
    for (const m of src.matchAll(
      /defineArrayMember\(\{[\s\S]{0,200}?type:\s*'object',[\s\S]{0,200}?name:\s*'([A-Za-z0-9_]+)'/g,
    )) {
      add(m[1], fieldNames(src.slice(m.index, m.index + 3000)));
    }
    for (const m of src.matchAll(
      /defineArrayMember\(\{[\s\S]{0,200}?name:\s*'([A-Za-z0-9_]+)',[\s\S]{0,200}?type:\s*'object'/g,
    )) {
      add(m[1], fieldNames(src.slice(m.index, m.index + 3000)));
    }
  }
  return types;
}

/**
 * Preview titles taken straight from a non-string field.
 *
 * Sanity lowercases a preview title when it indexes the item for search, so a
 * title selected from a `number` throws "toLowerCase is not a function" and the
 * whole array field renders as a red Unhandled Runtime Error. The Numbers Row
 * on the home page did exactly that until 2026-09-12. A `prepare` that returns
 * a string is the fix, so a select with one beside it is fine.
 */
/** The source of the `{...}` object starting at `open`, brace-balanced. */
function objectAt(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  return src.slice(open);
}

function numericPreviewTitles() {
  const out = [];
  const BAD = new Set(['number', 'boolean', 'date', 'datetime', 'array', 'reference', 'image']);
  for (const file of readdirSync(SCHEMA_DIR).filter((f) => f.endsWith('.ts'))) {
    const src = readFileSync(resolve(SCHEMA_DIR, file), 'utf8');

    // Every field name declared in this file, with its type. A name is reused
    // across objects rarely enough, and a field called `number` that is a
    // number somewhere in the file is worth flagging wherever it titles a
    // preview.
    const fieldTypes = new Map();
    for (const f of src.matchAll(
      // TEMPERED: the gap must not contain another `name:`. A plain
      // [\s\S]{0,240} scans left to right and swallows the next field, so
      // `name: 'statItem'` paired itself with the `type: 'number'` belonging to
      // the field INSIDE it and the real `number` field was never seen. That is
      // why two earlier versions of this check reported nothing on a file that
      // was crashing the Studio.
      /name:\s*'([A-Za-z0-9_]+)',(?:(?!name:)[\s\S]){0,240}?type:\s*'([a-zA-Z]+)'/g,
    )) {
      if (BAD.has(f[2])) fieldTypes.set(f[1], f[2]);
    }

    // BRACE-BALANCED, NOT A PROXIMITY GUESS. The first cut looked for the word
    // "prepare" within 600 characters of the select and found the PARENT
    // object's prepare, so it cleared the very bug it was written for. Reading
    // the preview object itself is the only way to know whether this preview
    // has one.
    for (const p of src.matchAll(/preview:\s*\{/g)) {
      const open = p.index + p[0].length - 1;
      const block = objectAt(src, open);
      if (/\bprepare\b/.test(block)) continue;
      const title = block.match(/title:\s*'([A-Za-z0-9_]+)'/);
      if (!title) continue;
      const declared = fieldTypes.get(title[1]);
      if (!declared) continue;
      const line = src.slice(0, p.index).split('\n').length;
      out.push(`${file}:${line}  preview title '${title[1]}' is a ${declared}, with no prepare()`);
    }
  }
  return out;
}

/** Fields that are hidden and required at once. */
function hiddenRequired() {
  const out = [];
  for (const file of readdirSync(SCHEMA_DIR).filter((f) => f.endsWith('.ts'))) {
    const src = readFileSync(resolve(SCHEMA_DIR, file), 'utf8');
    // INDENTATION IS THE ONLY DEPTH SIGNAL HERE, and it has to be used. A
    // field's own declarations sit at six spaces; anything deeper belongs to an
    // array member, whose required rules fire per row and so cannot block a
    // document whose array is empty. Matched loosely, every hidden array with
    // required members was reported as a blocker, which is the kind of false
    // alarm that teaches everyone to ignore the tool.
    for (const m of src.matchAll(/^ {4}defineField\(\{\n([\s\S]*?)\n {4}\}\),?$/gm)) {
      const body = m[1];
      if (!/^ {6}hidden:\s*true/m.test(body)) continue;
      if (!/^ {6}validation:[\s\S]{0,300}?Rule\.required\(\)/m.test(body)) continue;
      const name = body.match(/^ {6}name:\s*'([A-Za-z0-9_]+)'/m)?.[1] ?? '?';
      out.push(`${file}:${src.slice(0, m.index).split('\n').length}  ${name}`);
    }
  }
  return out;
}

/** Every field marked required, per document type. */
function requiredFields() {
  const out = new Map();
  for (const file of readdirSync(SCHEMA_DIR).filter((f) => f.endsWith('.ts'))) {
    const src = readFileSync(resolve(SCHEMA_DIR, file), 'utf8');
    const starts = [...src.matchAll(/defineType\(\{\s*\n?\s*name:\s*'([A-Za-z0-9_]+)'/g)];
    starts.forEach((m, i) => {
      const end = i + 1 < starts.length ? starts[i + 1].index : src.length;
      const body = src.slice(m.index, end);
      if (!/type:\s*'document'/.test(body.slice(0, 400))) return;
      // Top-level fields only, by indentation: see the note in hiddenRequired.
      // A `href` required inside a nav-link array member is not a field the
      // DOCUMENT has to carry, and reporting it blank on siteSettings was
      // nonsense.
      const names = [];
      for (const f of body.matchAll(/^ {4}defineField\(\{\n([\s\S]*?)\n {4}\}\),?$/gm)) {
        if (!/^ {6}validation:[\s\S]{0,300}?Rule\.required\(\)/m.test(f[1])) continue;
        if (/^ {6}hidden:\s*true/m.test(f[1])) continue;
        const n = f[1].match(/^ {6}name:\s*'([A-Za-z0-9_]+)'/m)?.[1];
        if (n) names.push(n);
      }
      if (names.length) out.set(m[1], names);
    });
  }
  return out;
}

// ── Walk the data ──────────────────────────────────────────────────────────

function unknownKeys(value, path, docId, schema, hits) {
  if (value == null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => unknownKeys(v, `${path}[${i}]`, docId, schema, hits));
    return;
  }
  const type = value._type;
  if (type && schema.has(type) && !BUILT_IN.has(type)) {
    for (const key of Object.keys(value)) {
      if (SYSTEM_KEYS.has(key)) continue;
      if (!schema.get(type).has(key)) {
        hits.push({
          docId,
          path,
          type,
          key,
          value: JSON.stringify(value[key]).slice(0, 70),
        });
      }
    }
  }
  for (const [k, v] of Object.entries(value)) {
    if (SYSTEM_KEYS.has(k)) continue;
    unknownKeys(v, `${path}.${k}`, docId, schema, hits);
  }
}

// ── Run ────────────────────────────────────────────────────────────────────

const schema = readSchema();
let problems = 0;
const section = (title) => console.log(`\n${title}\n${'─'.repeat(title.length)}`);

section('1. Hidden AND required (an error with no field on screen)');
const hr = hiddenRequired();
if (hr.length) {
  problems += hr.length;
  hr.forEach((l) => console.log(`  ${l}`));
} else {
  console.log('  none');
}

section('2. Preview titles that are not strings (crashes the field)');
const npt = numericPreviewTitles();
if (npt.length) {
  problems += npt.length;
  npt.forEach((l) => console.log(`  ${l}`));
} else {
  console.log('  none');
}

section('3. Stored keys the schema does not declare ("Remove field" bait)');
const docTypes = await client.fetch(
  `array::unique(*[!(_type match "sanity.*") && !(_type match "system.*")]._type)`,
);
const hits = [];
for (const type of docTypes) {
  const docs = await client.fetch(`*[_type==$type][0...80]`, { type });
  for (const doc of docs) {
    if (schema.has(doc._type)) {
      for (const key of Object.keys(doc)) {
        if (SYSTEM_KEYS.has(key)) continue;
        if (!schema.get(doc._type).has(key)) {
          hits.push({
            docId: doc._id,
            path: '',
            type: doc._type,
            key,
            value: JSON.stringify(doc[key]).slice(0, 70),
          });
        }
      }
    }
    for (const [k, v] of Object.entries(doc)) {
      if (SYSTEM_KEYS.has(k)) continue;
      unknownKeys(v, `.${k}`, doc._id, schema, hits);
    }
  }
}
if (hits.length) {
  problems += hits.length;
  for (const h of hits) {
    console.log(`  ${h.docId}${h.path}  [${h.type}] "${h.key}" = ${h.value}`);
  }
} else {
  console.log('  none');
}

section('4. Page addresses that collide with a reserved route');
{
  const src = readFileSync(resolve(root, 'src/lib/reservedSlugs.ts'), 'utf8');
  const literal = src.match(/new Set\(\[([\s\S]*?)\]\)/)?.[1] ?? '';
  const reserved = new Set([...literal.matchAll(/'([^']+)'/g)].map((m) => m[1]));
  const pages = await client.fetch(`*[_type == "page"]{_id, "slug": slug.current}`);
  let hits = 0;
  for (const pg of pages) {
    if (pg.slug && reserved.has(pg.slug)) {
      hits++;
      console.log(
        `  ${pg._id} uses "${pg.slug}", which reservedSlugs.ts reserves: it cannot be published`,
      );
    }
  }
  if (!hits) console.log('  none');
  problems += hits;
}

section('5. "Used on N pages" against what the pages really contain');
{
  // Which section type renders which collection. The left side is the document
  // type whose panel we are checking; the right is the section that reads it.
  const RENDERED_BY = {
    distance: ['distanceTicketsSection'],
    courseFeature: ['courseFeaturesSection'],
    recordEntry: ['recordsBoardSection', 'dynastiesSection'],
    scheduleItem: ['raceScheduleSection'],
    sponsor: ['sponsorPatchesSection'],
  };
  const src = readFileSync(resolve(root, 'src/sanity/resolve.ts'), 'utf8');
  // Split the exported map on its top-level entries. `\n};` would be a literal
  // newline if this were built by string interpolation, which is how the two
  // previous attempts shipped a broken regex.
  const block = src.match(/COLLECTION_LOCATIONS[^=]*=\s*\{([\s\S]*?)\};/)?.[1] ?? '';
  const declared = {};
  for (const m of block.matchAll(/^\s*(\w+):\s*\[([^\]]*)\]/gm)) {
    declared[m[1]] = m[2]
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  }
  const pages = await client.fetch(
    `*[_type in ["homePage", "page"] && !(_id in path("drafts.**"))]{_id, "slug": slug.current, "types": pageBuilder[]._type}`,
  );
  const nameFor = (p) =>
    p._id === 'homePage'
      ? 'HOME'
      : { course: 'COURSE', records: 'RECORDS', contact: 'CONTACT' }[p.slug];
  let hits = 0;
  for (const [type, sections] of Object.entries(RENDERED_BY)) {
    const real = new Set();
    for (const pg of pages) {
      if ((pg.types ?? []).some((t) => sections.includes(t))) {
        const n = nameFor(pg);
        if (n) real.add(n);
      }
    }
    const said = new Set(declared[type] ?? []);
    const missing = [...real].filter((x) => !said.has(x));
    const extra = [...said].filter((x) => !real.has(x));
    if (missing.length || extra.length) {
      hits++;
      console.log(
        `  ${type}: resolve.ts says [${[...said].join(', ') || 'nothing'}], the pages say [${[...real].join(', ') || 'nothing'}]`,
      );
    }
  }
  if (!hits) console.log('  none');
  problems += hits;
}

section('6. Required fields left blank in the live data');
let blanks = 0;
for (const [type, fields] of requiredFields()) {
  if (!docTypes.includes(type)) continue;
  const docs = await client.fetch(`*[_type==$type][0...200]{_id, ${fields.join(', ')}}`, { type });
  for (const field of fields) {
    const missing = docs.filter((d) => {
      const v = d[field];
      return v == null || v === '' || (Array.isArray(v) && v.length === 0);
    });
    if (!missing.length) continue;
    blanks += missing.length;
    console.log(
      `  ${type}.${field}: blank on ${missing.length}/${docs.length}  e.g. ${missing
        .slice(0, 3)
        .map((d) => d._id)
        .join(', ')}`,
    );
  }
}
if (!blanks) console.log('  none');
problems += blanks;

section('7. Transcribed records that duplicate a result (a hand copy that drifts)');
// WHY THIS CHECK EXISTS. A recordEntry is for a record the results archive
// CANNOT produce, which today means the 27K before 2015. Created for a record
// that does have a result behind it, it becomes a hand copy of that row: the
// board derives the record from the result anyway, so the copy adds nothing and
// can only drift away from what it was copied from. That is what happened to
// Katie Ruhlman's 27K 2:28:40, filed as 2010 against a result dated 2021, on a
// distance with no 2010 results at all. Thirteen such copies were removed on
// 2026-09-12, twelve agreeing and one already wrong; this stops them returning.
{
  const recs = await client.fetch(
    `*[_type=="recordEntry"]{_id, bracket, gender, year, timeSeconds, "d": distance->slug.current}`,
  );
  const results = await client.fetch(
    `*[_type=="raceResult"]{year, timeSeconds, "d": distance->slug.current}`,
  );
  let dupes = 0;
  for (const r of recs) {
    const hit = results.find((x) => x.d === r.d && x.timeSeconds === r.timeSeconds);
    if (!hit) continue;
    dupes++;
    console.log(
      `  ${r._id}: ${r.d} ${r.gender} ${r.bracket} is also a result` +
        (hit.year === r.year
          ? ' (same year, so it is simply redundant)'
          : ` and they DISAGREE about the year: record ${r.year}, result ${hit.year}`),
    );
  }
  if (!dupes) console.log('  none');
  problems += dupes;
}

// ---- 8. A price typed into prose --------------------------------------------
// The site holds its money in structured fields: fee tiers on each distance,
// parksDonation on The Race. Any OTHER document with a dollar amount in it is a
// figure somebody typed a second time, and a number that exists twice is a
// number that will eventually disagree with itself.
//
// This is not hypothetical. On 2026-09-13 the contact page's FAQ said the 50K
// was $50 from February and $60 from October while the distance documents said
// $45 and $55, and both were on the live site at the same time, so the price a
// runner saw depended on which page they happened to read. That card is written
// from the fee tiers now (src/lib/entry-fees.ts) and this is what stops the
// next one going unnoticed for as long.
section('8. Prices typed into prose');
{
  // The fields ALLOWED to hold money, because they are the source of it.
  const STRUCTURED = new Set(['parksDonation', 'feeTiers', 'amount']);
  const docs = await client.fetch(
    `*[!(_type in ["raceResult", "recordEntry", "athlete", "sanity.imageAsset", "sanity.fileAsset"])]`,
  );
  const MONEY = /\$[\d,]+/g;
  let typed = 0;
  const walk = (node, doc, path) => {
    if (Array.isArray(node)) return node.forEach((v, i) => walk(v, doc, `${path}[${i}]`));
    if (node && typeof node === 'object') {
      return Object.entries(node).forEach(([k, v]) => {
        if (k.startsWith('_') || STRUCTURED.has(k)) return;
        walk(v, doc, path ? `${path}.${k}` : k);
      });
    }
    if (typeof node !== 'string') return;
    const hits = node.match(MONEY);
    if (!hits) return;
    typed++;
    console.log(
      `  ${doc._type} ${doc.title || doc.name || doc._id}: ${hits.join(' ')} typed into ${path}`,
    );
  };
  for (const d of docs) walk(d, d, '');
  if (!typed) console.log('  none');
  problems += typed;
}

console.log(`\n${problems === 0 ? 'Studio is clean.' : `${problems} thing(s) to look at.`}`);
process.exit(problems === 0 ? 0 : 1);
