// Turning the results archive into editions.
//
// The archive is 1,961 rows across 22 runnings, and the site had no route that
// showed a single one of them: the records board only ever draws the fastest,
// so a year in which nobody set a record left no trace on the site at all.
// These functions are what /results and /results/[year] are built on.
//
// DERIVED, LIKE EVERYTHING ELSE HERE. Nothing about an edition is typed into
// Sanity: the entrant counts, the winners, the span of years and the gaps in it
// all fall out of the results themselves. That is the same argument raceResult.ts
// makes about records, applied one level up. An editor cannot make this page
// disagree with the results it summarises, because there is nothing to disagree
// with.
//
// THE GAPS ARE THE POINT. `missing` marks a year inside the span that has no
// results on file. It is not an error state: 2020 was run and its results are
// gone, and the pre-2015 27K was timed on a service that no longer exists.
// Rendering those years as blank rows rather than skipping them is the
// difference between an archive that admits what it lost and one that quietly
// pretends the race skipped a year.

/** One finisher, as the results queries project them. */
export interface ResultRow {
  year?: number | null;
  place?: number | null;
  age?: number | null;
  gender?: string | null;
  timeSeconds?: number | null;
  timeSource?: string | null;
  trekker?: boolean | null;
  sourceNote?: string | null;
  name?: string | null;
  slug?: string | null;
  city?: string | null;
  region?: string | null;
  distance?: string | null;
  distanceSlug?: string | null;
}

/** A distance, in the order the race lists them. */
export interface DistanceRef {
  slug: string;
  name: string;
}

export interface DistanceBoard {
  slug: string;
  name: string;
  finishers: number;
  /** Every finisher, in finishing order. */
  rows: ResultRow[];
  /** Fastest man and fastest woman, for the index summary. */
  winners: { gender: string; row: ResultRow }[];
}

export interface Edition {
  year: number;
  total: number;
  /** True when the year falls inside the archive's span but has no results. */
  missing: boolean;
  distances: DistanceBoard[];
}

/**
 * Finishing order.
 *
 * `place` is authoritative where the timer recorded it, because it already
 * accounts for whatever the timer knew and this code does not. Times are the
 * fallback, and a row with neither sorts last rather than jumping the field.
 */
function byFinish(a: ResultRow, b: ResultRow): number {
  const pa = typeof a.place === 'number' ? a.place : Infinity;
  const pb = typeof b.place === 'number' ? b.place : Infinity;
  if (pa !== pb) return pa - pb;
  const ta = typeof a.timeSeconds === 'number' ? a.timeSeconds : Infinity;
  const tb = typeof b.timeSeconds === 'number' ? b.timeSeconds : Infinity;
  return ta - tb;
}

/**
 * The fastest finisher of each gender, by TIME rather than by place.
 *
 * Not the same question as "who placed first". Trekkers take the optional early
 * start and are ineligible for awards, so the race does not place them, but
 * their times are real and are shown everywhere else on the site. Picking the
 * winner by time would hand a trekker a win the race did not award, so they are
 * excluded here exactly as they are from records. See src/lib/age-brackets.ts.
 */
function winnersOf(rows: ResultRow[]): { gender: string; row: ResultRow }[] {
  const best = new Map<string, ResultRow>();
  for (const r of rows) {
    if (r.trekker) continue;
    if (typeof r.timeSeconds !== 'number' || r.timeSeconds <= 0) continue;
    const g = r.gender ?? 'X';
    const cur = best.get(g);
    if (!cur || (cur.timeSeconds ?? Infinity) > r.timeSeconds) best.set(g, r);
  }
  return (['M', 'F'] as const)
    .filter((g) => best.has(g))
    .map((g) => ({ gender: g as string, row: best.get(g)! }));
}

/** Split one year's rows by distance, in the race's own distance order. */
export function boardsFor(rows: ResultRow[], distances: DistanceRef[]): DistanceBoard[] {
  const boards: DistanceBoard[] = [];
  for (const d of distances) {
    const mine = rows.filter((r) => r.distanceSlug === d.slug).sort(byFinish);
    if (mine.length === 0) continue;
    boards.push({
      slug: d.slug,
      name: d.name,
      finishers: mine.length,
      rows: mine,
      winners: winnersOf(mine),
    });
  }
  return boards;
}

/**
 * Every edition, newest first, including the years with nothing on file.
 *
 * The span is taken from the data rather than hardcoded, so importing a
 * recovered year extends the list without anyone editing this file.
 */
export function summariseEditions(rows: ResultRow[], distances: DistanceRef[]): Edition[] {
  const byYear = new Map<number, ResultRow[]>();
  for (const r of rows) {
    if (typeof r.year !== 'number') continue;
    const list = byYear.get(r.year);
    if (list) list.push(r);
    else byYear.set(r.year, [r]);
  }
  if (byYear.size === 0) return [];

  const years = [...byYear.keys()];
  const lo = Math.min(...years);
  const hi = Math.max(...years);

  const out: Edition[] = [];
  for (let y = hi; y >= lo; y--) {
    const mine = byYear.get(y) ?? [];
    out.push({
      year: y,
      total: mine.length,
      missing: mine.length === 0,
      distances: boardsFor(mine, distances),
    });
  }
  return out;
}

/** One edition, or null when that year has nothing on file. */
export function editionFor(
  rows: ResultRow[],
  year: number,
  distances: DistanceRef[],
): Edition | null {
  const mine = rows.filter((r) => r.year === year);
  if (mine.length === 0) return null;
  return { year, total: mine.length, missing: false, distances: boardsFor(mine, distances) };
}
