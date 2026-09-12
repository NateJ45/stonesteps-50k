// Gate on the 2004 missing women's winner. See resolve-gender.ts.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveUnknownGenders, resolvedGenderReport } from './resolve-gender.ts';

const row = (slug: string, year: number, gender?: string | null) => ({ slug, year, gender });

describe('resolveUnknownGenders', () => {
  it('fills an unknown from the same runner recorded elsewhere', () => {
    // Linda Barhorst: X in 2004, F in six other years.
    const out = resolveUnknownGenders([
      row('linda-barhorst', 2004, 'X'),
      row('linda-barhorst', 2006, 'F'),
      row('linda-barhorst', 2007, 'F'),
    ]);
    assert.deepEqual(
      out.map((r) => r.gender),
      ['F', 'F', 'F'],
    );
  });

  it('leaves a runner who appears only once', () => {
    // Molly Moilanen ran 2004 and no other year on file. Nothing to resolve
    // her from, and her name is not evidence.
    const out = resolveUnknownGenders([row('molly-moilanen', 2004, 'X')]);
    assert.equal(out[0].gender, 'X');
  });

  it('leaves a row whose evidence conflicts', () => {
    const out = resolveUnknownGenders([
      row('two-people-one-slug', 2004, 'X'),
      row('two-people-one-slug', 2006, 'F'),
      row('two-people-one-slug', 2007, 'M'),
    ]);
    assert.equal(out[0].gender, 'X');
  });

  it('never overwrites a gender the source already recorded', () => {
    const out = resolveUnknownGenders([
      row('wesley-fenton', 2005, 'M'),
      row('wesley-fenton', 2006, 'M'),
    ]);
    assert.deepEqual(
      out.map((r) => r.gender),
      ['M', 'M'],
    );
  });

  it('treats a missing or empty gender the same as X', () => {
    for (const unknown of [undefined, null, '']) {
      const out = resolveUnknownGenders([row('x', 2004, unknown), row('x', 2006, 'F')]);
      assert.equal(out[0].gender, 'F');
    }
  });

  it('does not mutate the rows it was given', () => {
    const input = [row('a', 2004, 'X'), row('a', 2006, 'F')];
    resolveUnknownGenders(input);
    assert.equal(input[0].gender, 'X');
  });

  it('reports exactly what it changed', () => {
    const before = [row('a', 2004, 'X'), row('a', 2006, 'F'), row('b', 2004, 'X')];
    const after = resolveUnknownGenders(before);
    assert.deepEqual(resolvedGenderReport(before, after), [{ slug: 'a', gender: 'F' }]);
  });
});
