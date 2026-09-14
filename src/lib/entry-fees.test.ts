// Safe to edit by hand
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { feeAnswer, type FeeDistance } from './entry-fees.ts';

// The real shape, as the distance documents hold it on 2026-09-13.
const REAL: FeeDistance[] = [
  {
    name: '50K',
    entryCap: 120,
    feeTiers: [
      { label: 'Through January 31', amount: 35 },
      { label: 'February 1 to September 30', amount: 45 },
      { label: 'October 1 to race day', amount: 55 },
    ],
  },
  {
    name: '27K',
    entryCap: 130,
    feeTiers: [
      { label: 'Through January 31', amount: 30 },
      { label: 'February 1 to September 30', amount: 40 },
      { label: 'October 1 to race day', amount: 45 },
    ],
  },
];

test('writes the answer the editor used to type, from the tiers', () => {
  assert.equal(
    feeAnswer(REAL),
    'The 50K is $35 through January 31, $45 from February 1 to September 30 and $55 from October 1 to race day. ' +
      'The 27K is $30, $40 and $45 on the same dates. ' +
      'Both plus a processing fee. ' +
      'The 50K is capped at 120 entries and the 27K at 130.',
  );
});

test('the price in the answer is the price on the ticket', () => {
  // The whole point of the module: every amount on a distance appears in the
  // sentence, and no amount appears that is not on a distance.
  const answer = feeAnswer(REAL) ?? '';
  const quoted = [...answer.matchAll(/\$(\d+)/g)].map((m) => Number(m[1])).sort((a, b) => a - b);
  const real = REAL.flatMap((d) => (d.feeTiers ?? []).map((t) => t.amount as number)).sort(
    (a, b) => a - b,
  );
  assert.deepEqual(quoted, real);
});

test('a label that already carries its preposition is not given a second one', () => {
  const out = feeAnswer([{ name: '50K', feeTiers: [{ label: 'Through January 31', amount: 35 }] }]);
  assert.match(out ?? '', /\$35 through January 31\./);
  assert.doesNotMatch(out ?? '', /from through/);
});

test('a label starting with a date gets a "from"', () => {
  const out = feeAnswer([
    { name: '50K', feeTiers: [{ label: 'October 1 to race day', amount: 55 }] },
  ]);
  assert.match(out ?? '', /\$55 from October 1 to race day\./);
});

test('a month is not lowercased when the connector is', () => {
  const out =
    feeAnswer([{ name: '50K', feeTiers: [{ label: 'Until March 4', amount: 20 }] }]) ?? '';
  assert.match(out, /until March 4/);
  assert.doesNotMatch(out, /march/);
});

test('a second distance on different dates spells its own out', () => {
  const out =
    feeAnswer([
      { name: '50K', feeTiers: [{ label: 'Through January 31', amount: 35 }] },
      { name: '27K', feeTiers: [{ label: 'Through March 1', amount: 30 }] },
    ]) ?? '';
  assert.match(out, /The 27K is \$30 through March 1\./);
  assert.doesNotMatch(out, /on the same dates/);
});

test('tiers with no amount are skipped rather than quoted as undefined', () => {
  const out =
    feeAnswer([
      {
        name: '50K',
        feeTiers: [{ label: 'Through January 31', amount: 35 }, { label: 'Later' }],
      },
    ]) ?? '';
  assert.match(out, /\$35 through January 31\./);
  assert.doesNotMatch(out, /undefined|NaN|\$\$/);
});

test('no caps means no capacity sentence', () => {
  const out = feeAnswer([{ name: '50K', feeTiers: [{ label: 'Flat', amount: 40 }] }]) ?? '';
  assert.doesNotMatch(out, /capped/);
});

test('returns null when there is nothing to quote, so the caller can fall back', () => {
  assert.equal(feeAnswer([]), null);
  assert.equal(feeAnswer(null), null);
  assert.equal(feeAnswer(undefined), null);
  assert.equal(feeAnswer([{ name: '50K', feeTiers: [] }]), null);
  assert.equal(feeAnswer([{ name: '50K' }]), null);
  // A distance with tiers but no name cannot be written into a sentence.
  assert.equal(feeAnswer([{ feeTiers: [{ label: 'Through January 31', amount: 35 }] }]), null);
});
