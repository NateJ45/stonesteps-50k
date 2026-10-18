// scripts/lib/import-merge.mjs
//
// How the nightly results import writes a document WITHOUT undoing what the
// race director fixed by hand in the Studio (2026-10-18).
//
// THE BUG THIS REPLACES. scripts/import-results.mjs wrote every athlete and
// result with createOrReplace. It re-imports every year from 2017 each night in
// October and November and every Monday after, so a replace threw away, every
// time:
//   - a result's "Ran as a trekker" tick, which RunSignUp never sends (the
//     Checkup asks for it, and the records leave trekkers out because of it);
//   - a result's "Note on the source";
//   - a runner's name, city or state corrected in "Runners (fix a name here)",
//     which the Site Guide tells him is the one place to fix a name.
//
// THE RULE. Each field belongs to one side:
//   - the IMPORT owns what RunSignUp says (the time, the place, the age, the
//     gender, the year, the distance, the link to the runner, the slug). Those
//     are set on every run, and unset when RunSignUp stops sending one, exactly
//     as the replace did.
//   - the STUDIO owns the hand fields above. The import fills them in when it
//     creates a document and never touches them again.
//
// Mutations are plain objects in Sanity's HTTP mutation shape, so this file
// has no dependencies and the test can read them directly.

/** Fields of a result that the race director owns. RunSignUp never sends them. */
export const RESULT_HAND_FIELDS = ['trekker', 'sourceNote'];

/** Fields of a result the import owns: set on every run, unset when missing. */
export const RESULT_IMPORT_FIELDS = [
  'athlete',
  'distance',
  'year',
  'timeSeconds',
  'gender',
  'age',
  'place',
  'timeSource',
];

/** Fields of a runner that the race director owns once the runner exists. */
export const ATHLETE_HAND_FIELDS = ['name', 'city', 'region'];

/** Fields of a runner the import owns. The slug is the runner's identity. */
export const ATHLETE_IMPORT_FIELDS = ['slug'];

/**
 * The mutations that bring one imported document into the dataset: create it
 * whole if it is new, then set (or unset) only the fields the import owns.
 * Hand-owned fields are left exactly as the Studio has them.
 */
export function importMutations(doc) {
  const owned =
    doc._type === 'raceResult'
      ? RESULT_IMPORT_FIELDS
      : doc._type === 'athlete'
        ? ATHLETE_IMPORT_FIELDS
        : null;
  if (!owned) throw new Error(`import-merge: no field rule for type "${doc._type}"`);
  const set = {};
  const unset = [];
  for (const field of owned) {
    if (doc[field] === undefined) unset.push(field);
    else set[field] = doc[field];
  }
  const patch = { id: doc._id, set };
  if (unset.length) patch.unset = unset;
  return [{ createIfNotExists: doc }, { patch }];
}
