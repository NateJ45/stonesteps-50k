// =============================================================================
// derive-place — a finishing place for the years whose pages published none
// (2026-09-12)
// =============================================================================
// THE BUG THIS EXISTS TO FIX. Marc Teismann's 2014 row said place 3 on the year
// page and nothing at all on his own runner page. Both were reading the same
// document, which carries no place: the 2014 results page does not publish one
// (its table starts at Name), and neither do 2003's or 2004's, which lead with
// a bib. The year table was filling the gap with the row's index and the runner
// page was leaving it blank, so the site gave two answers to one question.
//
// The place is derived once, here, at import, so there is only ever one answer.
//
// THE RULE IS THE ONE A RACE SCORES BY, not "row number":
//   - A published place always wins. If any row in a year and distance has one,
//     that whole field is left exactly as the race published it.
//   - Otherwise finishers are ranked by time, fastest first.
//   - EQUAL TIMES SHARE A PLACE, and the next place skips, which is how the
//     race's own pages do it: 2004 lists Justin Bakken and Molly Moilanen both
//     as 10th on 6:56:54.
//   - TREKKERS GET NO PLACE. They take the optional early start and the race
//     makes them ineligible for awards, so their finish order is not a placing.
//     Their time is real and still shows; the place column stays empty, which
//     the runner page renders as a dash.
// =============================================================================

/** The minimum a row needs to be placed. */
export interface PlaceableRow {
  year: number;
  distance: string;
  timeSeconds?: number | null;
  place?: number | null;
  /** Trekkers take the early start and are ineligible for awards. */
  trekker?: boolean | null;
}

/**
 * Fill the finishing place for every year and distance that has none.
 *
 * Returns a NEW array; the input is untouched, so the recovered transcript can
 * stay exactly as it was recovered and the derivation stays a derivation.
 */
export function derivePlaces<T extends PlaceableRow>(rows: readonly T[]): T[] {
  const key = (r: PlaceableRow) => `${r.year}|${r.distance}`;

  // A field the race placed itself is never touched.
  const published = new Set<string>();
  for (const r of rows) if (r.place != null) published.add(key(r));

  const placeFor = new Map<T, number>();
  const groups = new Map<string, T[]>();
  for (const r of rows) {
    if (published.has(key(r))) continue;
    const g = groups.get(key(r)) ?? [];
    g.push(r);
    groups.set(key(r), g);
  }

  for (const group of groups.values()) {
    const ranked = group
      .filter((r) => !r.trekker && typeof r.timeSeconds === 'number' && r.timeSeconds > 0)
      .sort((a, b) => (a.timeSeconds as number) - (b.timeSeconds as number));
    let place = 0;
    let lastTime: number | null = null;
    ranked.forEach((r, i) => {
      // Standard competition ranking: a tie shares the place, the next skips.
      if (r.timeSeconds !== lastTime) place = i + 1;
      lastTime = r.timeSeconds as number;
      placeFor.set(r, place);
    });
  }

  return rows.map((r) => (placeFor.has(r) ? { ...r, place: placeFor.get(r) } : r));
}

/** How many rows this pass placed, per year, for an importer that says so. */
export function derivedPlaceReport<T extends PlaceableRow>(
  before: readonly T[],
  after: readonly T[],
): Record<number, number> {
  const out: Record<number, number> = {};
  for (let i = 0; i < before.length; i++) {
    if (before[i]?.place == null && after[i]?.place != null) {
      out[after[i].year] = (out[after[i].year] ?? 0) + 1;
    }
  }
  return out;
}
