// =============================================================================
// stat-sources - the derived figures in the home page's numbers row
// =============================================================================
// Two jobs. The first is ordinary: the arithmetic of each source, and the rule
// that a derived item with no fact behind it is dropped rather than falling
// back to the stale number it was meant to replace.
//
// The second is a DRIFT GATE, in the same spirit as section-fields.test.ts. The
// list of sources exists twice by necessity: once as data the site renders from
// (STAT_SOURCES here) and once as the dropdown an editor picks from (the
// `source` field's options in src/sanity/schemaTypes/sections.ts). A value in
// the Studio with no branch in the code renders nothing at all, and a branch
// with no value in the Studio is unreachable. So this test reads the schema
// source and fails when the two disagree.
// =============================================================================
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  STAT_SOURCES,
  STAT_SOURCE_VALUES,
  deriveStat,
  ordinal,
  ordinalSuffix,
  readSource,
  resolveStats,
  roundToHundred,
} from './stat-sources.ts';

/** The measured facts as of 2026-09-16, so the numbers below are the real ones. */
const FACTS = { gainFt: 4673, editionNumber: 24, courseMiles: 30.8, loopCount: 7 };

describe('ordinals', () => {
  it('follows the last digit', () => {
    assert.equal(ordinal(21), '21st');
    assert.equal(ordinal(22), '22nd');
    assert.equal(ordinal(23), '23rd');
    assert.equal(ordinal(24), '24th');
  });

  it('makes the teens all th, which is the rule a lookup table gets wrong', () => {
    assert.equal(ordinalSuffix(11), 'th');
    assert.equal(ordinalSuffix(12), 'th');
    assert.equal(ordinalSuffix(13), 'th');
    assert.equal(ordinalSuffix(111), 'th');
  });
});

describe('rounding', () => {
  // The hero says "about 4,700 feet" off a measured 4,673, because a GPS track
  // sampled against LiDAR is not accurate to the foot.
  it('rounds the climb the way the hero words it', () => {
    assert.equal(roundToHundred(4673), 4700);
  });

  it('rounds to the nearest hundred, both ways', () => {
    assert.equal(roundToHundred(4649), 4600);
    assert.equal(roundToHundred(4650), 4700);
    assert.equal(roundToHundred(4700), 4700);
  });
});

describe('deriveStat', () => {
  it('reads the climb off the measured profile', () => {
    assert.deepEqual(deriveStat('elevationGain', FACTS), { number: 4700 });
  });

  it('reads the distance off the course file, decimal intact', () => {
    // 31 would put this band in open disagreement with the distance tickets.
    assert.deepEqual(deriveStat('courseDistance', FACTS), { number: 30.8 });
  });

  it('counts the loops rather than trusting a typed seven', () => {
    assert.deepEqual(deriveStat('loops', FACTS), { number: 7 });
  });

  it('derives the edition AND its ordinal suffix together', () => {
    assert.deepEqual(deriveStat('edition', FACTS), { number: 24, suffix: 'th' });
    // The reason the suffix is derived: a hand-typed "th" beside a 21 reads
    // "21th", which is this module's own bug class.
    assert.deepEqual(deriveStat('edition', { ...FACTS, editionNumber: 21 }), {
      number: 21,
      suffix: 'st',
    });
  });

  it('returns null when the fact behind it is missing', () => {
    for (const source of ['elevationGain', 'courseDistance', 'loops', 'edition'] as const) {
      assert.equal(deriveStat(source, {}), null, source);
    }
  });

  it('never derives anything for a hand-typed item', () => {
    assert.equal(deriveStat('manual', FACTS), null);
  });

  it('treats a zero loop count and a zero edition as missing, not as a figure', () => {
    assert.equal(deriveStat('loops', { loopCount: 0 }), null);
    assert.equal(deriveStat('edition', { editionNumber: 0 }), null);
  });
});

describe('readSource', () => {
  it('accepts every declared value', () => {
    for (const { value } of STAT_SOURCES) assert.equal(readSource(value), value);
  });

  it('falls back to manual for anything else', () => {
    // Includes the shape a stega-encoded value would take if `source` ever fell
    // out of NON_STEGA_FIELDS: it would not equal a known source, and falling
    // back to the typed number is the safe half of that failure.
    assert.equal(readSource('edition​⁠'), 'manual');
    assert.equal(readSource(undefined), 'manual');
    assert.equal(readSource(null), 'manual');
    assert.equal(readSource(42), 'manual');
  });
});

describe('resolveStats', () => {
  it('leaves a hand-typed item exactly as it was', () => {
    const out = resolveStats([{ number: 2000, suffix: ' entrants', label: 'Finishers' }], FACTS);
    assert.deepEqual(out, [{ number: 2000, suffix: ' entrants', label: 'Finishers' }]);
  });

  it('ignores the typed number once a source is named', () => {
    const out = resolveStats(
      [{ number: 6500, suffix: ' ft', label: 'Total elevation gain', source: 'elevationGain' }],
      FACTS,
    );
    // 6,500 is the figure that was actually on the page under a hero saying
    // 4,700. This assertion is the bug.
    assert.deepEqual(out, [{ number: 4700, suffix: ' ft', label: 'Total elevation gain' }]);
  });

  it('keeps the editor label and the editor suffix', () => {
    const out = resolveStats(
      [{ number: 0, suffix: ' mi', label: 'How far you run', source: 'courseDistance' }],
      FACTS,
    );
    assert.deepEqual(out, [{ number: 30.8, suffix: ' mi', label: 'How far you run' }]);
  });

  it('overrides a typed suffix on the edition, because the suffix is the number', () => {
    const out = resolveStats(
      [{ number: 23, suffix: 'rd', label: 'Edition, in 2026', source: 'edition' }],
      { ...FACTS, editionNumber: 24 },
    );
    assert.deepEqual(out, [{ number: 24, suffix: 'th', label: 'Edition, in 2026' }]);
  });

  it('drops a derived item rather than printing its stale number', () => {
    const out = resolveStats(
      [
        { number: 6500, suffix: ' ft', label: 'Climb', source: 'elevationGain' },
        { number: 7, suffix: ' loops', label: 'Loops', source: 'loops' },
      ],
      { loopCount: 7 },
    );
    assert.deepEqual(out, [{ number: 7, suffix: ' loops', label: 'Loops' }]);
  });

  it('drops a hand-typed item with no number, which is what the renderer used to filter', () => {
    assert.deepEqual(resolveStats([{ label: 'Nothing yet' }], FACTS), []);
  });

  it('survives an empty list and a missing one', () => {
    assert.deepEqual(resolveStats([], FACTS), []);
    assert.deepEqual(resolveStats(undefined as never, FACTS), []);
  });

  it('resolves the home page’s four items to the site’s own figures', () => {
    const out = resolveStats(
      [
        { number: 4700, suffix: ' ft', label: 'Total elevation gain', source: 'elevationGain' },
        { number: 30.8, suffix: ' mi', label: '50K course distance', source: 'courseDistance' },
        { number: 7, suffix: ' loops', label: 'Alternating long and short', source: 'loops' },
        { number: 24, suffix: 'th', label: 'Edition, in 2026', source: 'edition' },
      ],
      FACTS,
    );
    assert.deepEqual(
      out.map((s) => `${s.number}${s.suffix ?? ''}`),
      ['4700 ft', '30.8 mi', '7 loops', '24th'],
    );
  });
});

// ---- the drift gate --------------------------------------------------------

describe('the schema dropdown and STAT_SOURCES agree', () => {
  const schema = readFileSync(
    new URL('../sanity/schemaTypes/sections.ts', import.meta.url),
    'utf8',
  );

  /** The `source` field's option values, read out of the schema source. */
  function schemaSourceValues(): string[] {
    const field = schema.slice(schema.indexOf("name: 'source',"));
    const list = field.slice(field.indexOf('list: ['), field.indexOf('],'));
    return [...list.matchAll(/value: '([^']+)'/g)].map((m) => m[1]);
  }

  it('offers exactly the values the code can render, in the same order', () => {
    assert.deepEqual(schemaSourceValues(), [...STAT_SOURCE_VALUES]);
  });

  it('still defaults to the hand-typed number', () => {
    assert.equal(STAT_SOURCE_VALUES[0], 'manual');
    assert.match(schema.slice(schema.indexOf("name: 'source',")), /initialValue: 'manual'/);
  });

  it('is excluded from stega, because it is a dropdown that picks a branch', () => {
    // CLAUDE.md rule 8b, gated rather than remembered: an encoded 'edition'
    // would fall back to the typed number in the preview only, which is the
    // hardest kind of bug to notice.
    const preview = readFileSync(new URL('./cms-preview.ts', import.meta.url), 'utf8');
    const set = preview.slice(preview.indexOf('NON_STEGA_FIELDS = new Set(['));
    assert.match(set.slice(0, set.indexOf(']')), /'source'/);
  });
});
