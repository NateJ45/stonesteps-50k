// The nightly import must not undo the Studio's hand fixes (scripts/lib/import-merge.mjs).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  importMutations,
  RESULT_HAND_FIELDS,
  RESULT_IMPORT_FIELDS,
  ATHLETE_HAND_FIELDS,
} from './import-merge.mjs';

const result = {
  _id: 'result-123',
  _type: 'raceResult',
  athlete: { _type: 'reference', _ref: 'athlete-jo-runner' },
  distance: { _type: 'reference', _ref: 'distance-50k' },
  year: 2025,
  timeSeconds: 13256,
  gender: 'F',
  age: 41,
  place: 3,
  timeSource: 'chip',
};

/** Apply the mutations to a stored document the way Sanity would. */
function apply(stored, mutations) {
  let doc = stored ? { ...stored } : null;
  for (const m of mutations) {
    if (m.createIfNotExists && !doc) doc = { ...m.createIfNotExists };
    if (m.patch) {
      doc = { ...doc, ...m.patch.set };
      for (const f of m.patch.unset ?? []) delete doc[f];
    }
  }
  return doc;
}

describe('results', () => {
  it('a new result is created whole', () => {
    assert.deepEqual(apply(null, importMutations(result)), result);
  });

  it('keeps a hand-ticked trekker and a source note on re-import', () => {
    const stored = { ...result, trekker: true, sourceNote: 'Timer listed twice' };
    const after = apply(stored, importMutations({ ...result, timeSeconds: 13250 }));
    assert.equal(after.trekker, true);
    assert.equal(after.sourceNote, 'Timer listed twice');
    assert.equal(after.timeSeconds, 13250, 'a corrected time from RunSignUp still lands');
  });

  it('unsets an import field RunSignUp stopped sending, as the old replace did', () => {
    const { age: _age, ...noAge } = result;
    const after = apply(result, importMutations(noAge));
    assert.equal('age' in after, false);
  });

  it('never sets or unsets a hand field', () => {
    const [, { patch }] = importMutations({ ...result, trekker: false });
    for (const f of RESULT_HAND_FIELDS) {
      assert.equal(f in patch.set, false, `${f} is set`);
      assert.equal((patch.unset ?? []).includes(f), false, `${f} is unset`);
    }
  });

  it('the two field lists do not overlap', () => {
    for (const f of RESULT_HAND_FIELDS) assert.equal(RESULT_IMPORT_FIELDS.includes(f), false);
  });
});

describe('runners', () => {
  const athlete = {
    _id: 'athlete-jo-runner',
    _type: 'athlete',
    name: 'Jo Runner',
    slug: { _type: 'slug', current: 'jo-runner' },
    city: 'Cincinnati',
    region: 'OH',
  };

  it('a new runner is created whole', () => {
    assert.deepEqual(apply(null, importMutations(athlete)), athlete);
  });

  it('keeps a name, city and state fixed in the Studio', () => {
    const stored = { ...athlete, name: 'Jo Runner-Smith', city: '', region: '' };
    const after = apply(stored, importMutations(athlete));
    for (const f of ATHLETE_HAND_FIELDS) assert.equal(after[f], stored[f], f);
  });
});

it('refuses a type it has no rule for', () => {
  assert.throws(() => importMutations({ _id: 'x', _type: 'sponsor' }), /no field rule/);
});
