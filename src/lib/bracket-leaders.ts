// =============================================================================
// bracket-leaders — the fastest finisher in each age group, for one field
// (2026-09-13)
// =============================================================================
// WHAT THIS IS FOR. A year page showed a men's and a women's winner and then
// ninety-odd rows of table. This fills the gap between the two: the fastest
// runner in each age group, split by gender, for that year and distance.
//
// IT IS NOT "AGE GROUP WINNERS", AND THE DIFFERENCE MATTERS. The race's own
// divisions have moved around over the years, and the archived results pages
// record it: 2007 awarded under 30, 30-39, 40-49, 50-59 and over 60; 2008 and
// 2009 awarded a single UNDER 40 in place of the first two; 2010 to 2014 went
// back to under 30 upward; and 2003 to 2006, 2015 and 2016 published no
// divisions at all. No year has ever had an over-70 division. So a page calling
// these people age group winners would, in 2008 and 2009, split one award the
// race gave into two it never gave, and in several other years name a medal
// nobody received.
//
// What IS true in every year is who ran the fastest time in each age band, and
// that is a fact about the clock rather than a claim about a medal. The site's
// own brackets (AGE_BRACKETS) are used consistently, and the copy on the page
// says "fastest in each age group" for the same reason.
//
// TREKKERS ARE EXCLUDED. They take the optional early start and the race makes
// them ineligible for age group awards, which is the same rule bracketRecords
// applies to the all-time board.
//
// ONLY BRACKETS WITH SOMEBODY IN THEM COME BACK. Rendering all six would give
// the thin early years a column of blanks that reads as missing data rather
// than as a small field, and would give 2006 six empty rows, since that year's
// source published age RANGES rather than ages and so has none on file.
// =============================================================================

import { AGE_BRACKETS, bracketForAge } from './age-brackets.ts';

/** The minimum a row needs to lead a bracket. */
export interface LeaderRow {
  age?: number | null;
  gender?: string | null;
  timeSeconds?: number | null;
  trekker?: boolean | null;
  name?: string | null;
  slug?: string | null;
}

export interface BracketLeader<T> {
  /** The bracket id, e.g. "40s". */
  bracket: string;
  /** Its label, e.g. "40 to 49". */
  label: string;
  /** The fastest row in it. */
  row: T;
}

/**
 * The fastest finisher in each age group, for one gender, in bracket order.
 *
 * Rows with no age cannot be placed in a bracket and are skipped, which is the
 * same refusal `bracketForAge` makes: a missing age is not a reason to guess.
 */
export function fastestByBracket<T extends LeaderRow>(
  rows: readonly T[],
  gender: string,
): BracketLeader<T>[] {
  const best = new Map<string, T>();
  for (const r of rows) {
    if (r.gender !== gender) continue;
    if (r.trekker) continue;
    if (typeof r.timeSeconds !== 'number' || r.timeSeconds <= 0) continue;
    const b = bracketForAge(r.age);
    if (!b) continue;
    const current = best.get(b.id);
    if (!current || (r.timeSeconds as number) < (current.timeSeconds as number)) best.set(b.id, r);
  }
  return AGE_BRACKETS.filter((b) => best.has(b.id)).map((b) => ({
    bracket: b.id,
    label: b.label,
    row: best.get(b.id) as T,
  }));
}
