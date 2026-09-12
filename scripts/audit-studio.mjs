// scripts/audit-studio.mjs
//
// The Studio audit, as a command: `npm run audit:studio`.
//
// WHY THIS EXISTS. The race director edits this site about twice a year, which
// is long enough that anything wrong in the Studio is discovered by him, alone,
// under time pressure, rather than by us. The three faults below are all ones
// that shipped and none of them show up in a build, a type check or a test:
//
//   1. A field that is `hidden: true` AND `Rule.required()`. Sanity validates
//      the document, not the form, so the document is permanently invalid and
//      the error names a field that is nowhere on screen. Four of these were
//      live on 2026-09-12, on Home and on Site Settings.
//
//   2. A stored key the schema does not declare. The Studio renders it as
//      "Unknown field found" with a REMOVE FIELD button beside it, and that
//      button deletes the value from every document of the type with no undo.
//      A stray key is not cosmetic; it is a loaded gun in an editor's form.
//      Two seeded buttons carried a `href` that ctaBlock has never had.
//
//   3. A required field that is blank in the live document. Some of those are
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

section('2. Stored keys the schema does not declare ("Remove field" bait)');
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

section('3. Required fields left blank in the live data');
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

console.log(`\n${problems === 0 ? 'Studio is clean.' : `${problems} thing(s) to look at.`}`);
process.exit(problems === 0 ? 0 : 1);
