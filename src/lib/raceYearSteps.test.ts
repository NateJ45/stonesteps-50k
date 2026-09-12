// The rollover checklist's rules.
//
// Every assertion here is a defect that shipped. The tool told the race
// director a job was done when it was not, which is the one failure mode a
// checklist must not have, so each rule gets the case that caught it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STEPS, ordinal, type Snapshot } from './raceYearSteps.ts';

const NOW = Date.parse('2026-09-12T12:00:00Z');

/** A dataset in good order: next year's date in, prices in the future. */
const base: Snapshot = {
  raceDate: '2026-10-25T12:00:00.000Z',
  editionNumber: 23,
  distances: [
    {
      name: '50K',
      entryCap: 120,
      runSignUpEventId: 1104726,
      feeTiers: [
        { label: 'Through January 31', endsOn: '2027-01-31', price: '$35' },
        { label: 'To race day', endsOn: '2026-10-25', price: '$60' },
      ],
    },
    { name: '27K', entryCap: 130, runSignUpEventId: 1104727, feeTiers: [] },
  ],
  unconfirmed: 0,
  raceConfirmed: true,
  sponsors: 4,
  latestResultYear: 2025,
  now: NOW,
};

const step = (id: string) => {
  const s = STEPS.find((x) => x.id === id);
  assert.ok(s, `no step "${id}"`);
  return s;
};
const snap = (over: Partial<Snapshot> = {}): Snapshot => ({ ...base, ...over });

test('ordinal never says "23th"', () => {
  assert.equal(ordinal(23), '23rd');
  assert.equal(ordinal(1), '1st');
  assert.equal(ordinal(2), '2nd');
  assert.equal(ordinal(11), '11th');
  assert.equal(ordinal(12), '12th');
  assert.equal(ordinal(13), '13th');
  assert.equal(ordinal(21), '21st');
});

test('the edition note uses the ordinal', () => {
  const note = step('edition').note?.(snap());
  assert.match(String(note), /23rd running/);
  assert.doesNotMatch(String(note), /23th/);
});

// ── The prices ───────────────────────────────────────────────────────────
// They live on each distance, not on the race document, and ONE stale tier
// is already a price on the page that nobody can buy.

test('a single stale fee tier is reported, not just an entirely stale ladder', () => {
  const s = snap({
    distances: [
      {
        name: '50K',
        feeTiers: [
          { endsOn: '2026-01-31' }, // past
          { endsOn: '2027-01-31' }, // future
        ],
      },
    ],
  });
  assert.equal(step('fees').state(s), 'todo');
  assert.match(String(step('fees').note?.(s)), /1 of 2/);
});

test('fee tiers all in the future are only worth checking', () => {
  const s = snap({ distances: [{ name: '50K', feeTiers: [{ endsOn: '2027-01-31' }] }] });
  assert.equal(step('fees').state(s), 'check');
});

test('no prices anywhere is a to-do', () => {
  assert.equal(step('fees').state(snap({ distances: [{ name: '50K', feeTiers: [] }] })), 'todo');
});

test('the fee step points at the distances, which is where the prices are', () => {
  assert.deepEqual(step('fees').target, { pane: 'this-years-race;orderable-distance' });
});

// ── The Register buttons ─────────────────────────────────────────────────

test('a distance with no RunSignUp event id is named', () => {
  const s = snap({
    distances: [
      { name: '50K', runSignUpEventId: 1104726 },
      { name: '27K' }, // none
    ],
  });
  assert.match(String(step('register-links').note?.(s)), /No event number on: 27K/);
});

// ── The results ──────────────────────────────────────────────────────────
// Measured against the last race that has actually run. Checking against the
// advertised year meant step one of the rollover silenced this step.

test('putting next year’s date in does not hide missing results from the race just gone', () => {
  const s = snap({ raceDate: '2027-10-24T12:00:00.000Z', latestResultYear: 2025 });
  assert.equal(step('results').state(s), 'todo');
});

test('results from the last race that ran count as done', () => {
  const s = snap({ raceDate: '2027-10-24T12:00:00.000Z', latestResultYear: 2026 });
  assert.equal(step('results').state(s), 'done');
});

test('a race already run with no results is a to-do', () => {
  const s = snap({ raceDate: '2026-08-01T12:00:00.000Z', latestResultYear: 2025 });
  assert.equal(step('results').state(s), 'todo');
});

// ── The date ─────────────────────────────────────────────────────────────

test('a date in the past is a to-do, a date ahead is done', () => {
  assert.equal(step('date').state(snap({ raceDate: '2025-10-26T12:00:00.000Z' })), 'todo');
  assert.equal(step('date').state(snap()), 'done');
  assert.equal(step('date').state(snap({ raceDate: null })), 'todo');
});

// ── The confirmed markers ────────────────────────────────────────────────

test('nothing unconfirmed still warns that last year’s ticks carry over', () => {
  assert.equal(step('unconfirmed').state(snap({ unconfirmed: 0 })), 'done');
  assert.match(String(step('unconfirmed').note?.(snap({ unconfirmed: 0 }))), /still ticked/);
});

test('unconfirmed items are counted in the note', () => {
  assert.equal(step('unconfirmed').state(snap({ unconfirmed: 3 })), 'todo');
  assert.match(String(step('unconfirmed').note?.(snap({ unconfirmed: 3 }))), /3 items/);
});

// ── The links ────────────────────────────────────────────────────────────
// A pane target only resolves if the structure gives that list item an
// explicit id. These are the ids set in src/sanity/structure.ts; change one
// there and this test fails rather than the link silently going nowhere.

test('every pane target is one the structure actually defines', () => {
  const known = new Set([
    'checkup',
    'this-years-race;orderable-distance',
    'this-years-race;orderable-scheduleItem',
    'this-years-race;orderable-sponsor',
    'this-years-race;results',
  ]);
  for (const s of STEPS) {
    if (!('pane' in s.target)) continue;
    assert.ok(known.has(s.target.pane), `step "${s.id}" points at unknown pane "${s.target.pane}"`);
  }
});

test('every doc target names a real singleton', () => {
  for (const s of STEPS) {
    if (!('doc' in s.target)) continue;
    assert.ok(['race', 'siteSettings'].includes(s.target.doc), `step "${s.id}": ${s.target.doc}`);
  }
});

test('every step has a title, a blurb and a state function', () => {
  assert.ok(STEPS.length >= 8);
  for (const s of STEPS) {
    assert.ok(s.title.trim(), `${s.id} title`);
    assert.ok(s.blurb.trim(), `${s.id} blurb`);
    assert.equal(typeof s.state, 'function', `${s.id} state`);
    assert.ok(['done', 'todo', 'check'].includes(s.state(base)), `${s.id} returned a bad state`);
  }
});

test('step ids are unique', () => {
  const ids = STEPS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
});

// ── The drift gate ───────────────────────────────────────────────────────
// The test above hard-codes the pane ids because a checklist link that goes
// nowhere is invisible: the pane opens empty and reads like an empty list.
// This re-derives them from the structure file, so renaming a pane there
// fails here instead of quietly breaking every card that points at it.

test('the pane ids the steps use are still declared in structure.ts', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync('src/sanity/structure.ts', 'utf8');
  const declared = new Set([...src.matchAll(/\.id\('([^']+)'\)/g)].map((m) => m[1]));
  // Panes the orderable plugin names for us: `orderable-<type>`.
  for (const m of src.matchAll(/orderableDocumentListDeskItem\(\{\s*type:\s*'([^']+)'/g)) {
    declared.add(`orderable-${m[1]}`);
  }
  for (const s of STEPS) {
    if (!('pane' in s.target)) continue;
    for (const segment of s.target.pane.split(';')) {
      assert.ok(
        declared.has(segment),
        `step "${s.id}" links to pane segment "${segment}", which structure.ts does not declare`,
      );
    }
  }
});
