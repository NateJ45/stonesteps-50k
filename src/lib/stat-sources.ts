// Safe to edit by hand
// =============================================================================
// stat-sources - where a number in the home page's stat band comes from
// =============================================================================
// THE SIXTH DRIFT. On 2026-09-16 the home page's numbers row said 6,500 ft of
// climbing and a 23rd edition directly under a hero saying about 4,700 feet and
// a 24th year, which was the sixth typed figure on this site found disagreeing
// with the data underneath it. Every previous one was fixed by retyping the
// number, and retyping is what produced the next one.
//
// So a stat item can now name a SOURCE instead of carrying a number. When it
// does, the typed number is ignored and the figure is derived at render time
// from the thing it is a figure ABOUT: the race document's measured elevation
// profile, or the course file the map is drawn from. The label stays the
// editor's, because a label is writing and a number is a measurement.
//
// This module is deliberately PURE: it takes the facts as an argument rather
// than importing them, so it can be unit tested with no Sanity and no JSON
// loader. StatsRow.astro is what actually gathers them (the race singleton
// through the section's projection, the course figures from
// scripts/data/course-map.json, which is derived from the GPS track).
//
// ADDING A SOURCE means three edits in one commit: the value here, the same
// value in `statItem`'s options list in src/sanity/schemaTypes/sections.ts, and
// a fact for it in StatsRow.astro. The first two are gated by
// stat-sources.test.ts, which parses the schema and fails when the two lists
// disagree. `source` is already in NON_STEGA_FIELDS (src/lib/cms-preview.ts),
// which is what stops the preview from comparing a dropdown value carrying a
// kilobyte of invisible markers against a plain string (CLAUDE.md rule 8b).
// =============================================================================

/** Every value `statItem.source` may hold. `manual` is the default. */
export const STAT_SOURCES = [
  { value: 'manual', title: 'Typed by hand' },
  { value: 'elevationGain', title: 'Elevation gain (from the measured profile)' },
  { value: 'courseDistance', title: '50K course distance (from the course file)' },
  { value: 'loops', title: 'Number of loops (from the course file)' },
  { value: 'edition', title: 'Edition number (from The Race)' },
] as const;

export type StatSource = (typeof STAT_SOURCES)[number]['value'];

/** The values only, in schema order, for the drift gate and for validation. */
export const STAT_SOURCE_VALUES: readonly string[] = STAT_SOURCES.map((s) => s.value);

/** The facts a derived stat can be computed from. Any of them may be missing. */
export interface StatFacts {
  /** race.elevationProfile.gainFt: one-way climb, measured off the track. */
  gainFt?: number | null;
  /** race.editionNumber: which running this year is. */
  editionNumber?: number | null;
  /** course-map.json publishedTotalMiles: the race's own published length. */
  courseMiles?: number | null;
  /** course-map.json loops.length: how many laps the course is run in. */
  loopCount?: number | null;
}

/** A stat item as the Studio stores it. */
export interface RawStat {
  number?: number | null;
  suffix?: string | null;
  label?: string | null;
  source?: string | null;
}

/** A stat item as StatsCounter takes it. */
export interface ResolvedStat {
  number: number;
  suffix?: string;
  label: string;
}

/**
 * 1 -> "st", 23 -> "rd". Two rules: the teens are all "th", then the last digit
 * decides. Lifted out of RaceHero.astro when the stat band needed the same
 * answer, because two copies of this is how a hero saying "24th year" ends up
 * over a band saying "24nd".
 */
export function ordinalSuffix(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const last = n % 10;
  if (teen) return 'th';
  return last === 1 ? 'st' : last === 2 ? 'nd' : last === 3 ? 'rd' : 'th';
}

/** 24 -> "24th". The hero's edition stamp reads off this. */
export function ordinal(n: number): string {
  return `${n}${ordinalSuffix(n)}`;
}

/**
 * THE ROUNDING IS THE HERO'S ROUNDING. The measured climb is 4,673 ft and the
 * hero's subhead says "about 4,700 feet", because a GPS track sampled against a
 * LiDAR surface is not accurate to the foot and printing 4,673 claims it is.
 * Nearest hundred, everywhere the figure appears.
 */
export function roundToHundred(ft: number): number {
  return Math.round(ft / 100) * 100;
}

/** What a derived source supplies. `suffix` overrides the item's own. */
interface Derived {
  number: number;
  suffix?: string;
}

/**
 * The figure for one source, or null when the fact behind it is missing.
 *
 * NULL MEANS DROP THE ITEM, not fall back to the typed number. The typed number
 * is precisely what could not be trusted; showing it again the moment the data
 * is unreachable would reintroduce the drift at the worst possible time, in a
 * build where nobody is looking at that figure.
 */
export function deriveStat(source: StatSource, facts: StatFacts): Derived | null {
  switch (source) {
    case 'elevationGain':
      return typeof facts.gainFt === 'number' && Number.isFinite(facts.gainFt)
        ? { number: roundToHundred(facts.gainFt) }
        : null;
    case 'courseDistance':
      return typeof facts.courseMiles === 'number' && Number.isFinite(facts.courseMiles)
        ? { number: facts.courseMiles }
        : null;
    case 'loops':
      return typeof facts.loopCount === 'number' && facts.loopCount > 0
        ? { number: facts.loopCount }
        : null;
    case 'edition':
      // THE SUFFIX IS PART OF THE NUMBER HERE, so it is derived too. A typed
      // "th" beside a derived 21 would read "21th", which is the same class of
      // bug this whole module exists to remove: a figure and its wording kept
      // in two places by hand.
      return typeof facts.editionNumber === 'number' && facts.editionNumber > 0
        ? { number: facts.editionNumber, suffix: ordinalSuffix(facts.editionNumber) }
        : null;
    case 'manual':
      return null;
  }
}

/** Anything that is not a known source is treated as a hand-typed number. */
export function readSource(value: unknown): StatSource {
  return STAT_SOURCE_VALUES.includes(value as string) ? (value as StatSource) : 'manual';
}

/**
 * Turn the stored items into the ones the counter renders.
 *
 * An item is dropped when it has no usable number at all: a hand-typed item
 * with no number (the old behaviour, which SectionRenderer used to do with a
 * filter), and a derived item whose fact is missing.
 */
export function resolveStats(stats: readonly RawStat[], facts: StatFacts): ResolvedStat[] {
  const out: ResolvedStat[] = [];
  for (const raw of stats ?? []) {
    const source = readSource(raw?.source);
    const derived = source === 'manual' ? null : deriveStat(source, facts);
    if (source !== 'manual' && !derived) continue;
    const number = derived ? derived.number : raw?.number;
    if (typeof number !== 'number' || !Number.isFinite(number)) continue;
    const suffix = derived?.suffix ?? raw?.suffix ?? undefined;
    out.push({
      number,
      ...(suffix ? { suffix } : {}),
      label: raw?.label ?? '',
    });
  }
  return out;
}
