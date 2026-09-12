// Gate for the preview-only wordmark explosion. See display-words.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { displayWords } from './display-words.ts';

/** The four characters @vercel/stega uses as base-4 digits. */
const DIGITS = [0x200b, 0x200c, 0x200d, 0xfeff].map((c) => String.fromCodePoint(c));

/** A run shaped like a real one: the 4-char prefix, then digit noise. */
function fakeRun(length = 120): string {
  let run = DIGITS[0].repeat(4);
  for (let i = 0; i < length; i++) run += DIGITS[(i * 7 + 1) % 4];
  return run;
}

test('plain text splits into its words', () => {
  assert.deepEqual(displayWords('Stone Steps 50k'), ['Stone', 'Steps', '50k']);
});

test('collapses runs of real whitespace', () => {
  assert.deepEqual(displayWords('  Stone   Steps\n50k  '), ['Stone', 'Steps', '50k']);
});

test('a stega-encoded headline still splits into its words', () => {
  // This is the whole point. Splitting the raw string here returns 100+ items
  // because U+FEFF inside the run matches \s.
  const encoded = `Stone Steps 50k${fakeRun()}`;
  assert.ok(/\s/.test(encoded.slice('Stone Steps 50k'.length)), 'run must contain a \s match');
  assert.deepEqual(displayWords(encoded), ['Stone', 'Steps', '50k']);
});

test('a run in the middle of the string is removed, not turned into a break', () => {
  assert.deepEqual(displayWords(`Stone${fakeRun(40)} Steps 50k`), ['Stone', 'Steps', '50k']);
});

test('an empty headline yields no words', () => {
  assert.deepEqual(displayWords(''), []);
  assert.deepEqual(displayWords(fakeRun()), []);
});
