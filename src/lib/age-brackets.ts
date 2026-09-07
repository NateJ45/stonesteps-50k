// Age brackets, and the reduce that turns a pile of results into a records table.
//
// WHY THIS IS CODE AND NOT GROQ. Deriving a course record is one ordered query.
// Deriving SIX age-bracket records would be six more, per distance, per gender,
// which is twenty-four round trips to build one page. Fetching the set once and
// reducing here is both cheaper and testable: the bracket boundaries are the
// part most likely to be got wrong, and here they are covered by unit tests
// instead of being retyped into every row by hand.
//
// The bracket labels follow the race's own published tables so the new site's
// records page can be read against the old one during the migration.
//
// Foundation, edit with care. Covered by src/lib/age-brackets.test.ts.

/** A bracket id, its label, and the inclusive age range it covers. */
export type AgeBracket = {
  id: string;
  label: string;
  min: number;
  /** Inclusive upper bound. Infinity for the open-ended top bracket. */
  max: number;
};

export const AGE_BRACKETS: AgeBracket[] = [
  { id: 'u30', label: 'Under 30', min: 0, max: 29 },
  { id: '30s', label: '30 to 39', min: 30, max: 39 },
  { id: '40s', label: '40 to 49', min: 40, max: 49 },
  { id: '50s', label: '50 to 59', min: 50, max: 59 },
  { id: '60s', label: '60 to 69', min: 60, max: 69 },
  { id: '70plus', label: 'Over 70', min: 70, max: Infinity },
];

export const BRACKET_BY_ID: Record<string, AgeBracket> = Object.fromEntries(
  AGE_BRACKETS.map((b) => [b.id, b]),
);

/**
 * The bracket an age falls in, or null when the age is missing or nonsense.
 *
 * Returns null rather than guessing: a result with no recorded age must not
 * silently land in "Under 30" and take a record off someone.
 */
export function bracketForAge(age: number | null | undefined): AgeBracket | null {
  if (typeof age !== 'number' || !Number.isFinite(age) || age < 0) return null;
  return AGE_BRACKETS.find((b) => age >= b.min && age <= b.max) ?? null;
}

/** The shape both a derived result and a transcribed historical record reduce to. */
export type RecordRow = {
  bracket: string;
  label: string;
  athlete: string | null;
  /** Slug of the athlete document, so a record can link to their history. */
  athleteSlug?: string | null;
  year: number | null;
  timeSeconds: number | null;
  sourceNote?: string;
  /** True when this row came from the transcribed tables, not the results archive. */
  historical?: boolean;
};

/** The minimum a result needs to compete for a record. */
export type ResultLike = {
  athlete?: { name?: string | null; slug?: string | null } | null;
  year?: number | null;
  timeSeconds?: number | null;
  age?: number | null;
  sourceNote?: string;
};

/** A transcribed row, which already knows its bracket and may have no athlete. */
export type HistoricalLike = {
  athlete?: { name?: string | null; slug?: string | null } | null;
  bracket?: string | null;
  year?: number | null;
  timeSeconds?: number | null;
  sourceNote?: string;
};

function toRow(
  b: AgeBracket,
  r: {
    athlete?: { name?: string | null; slug?: string | null } | null;
    year?: number | null;
    timeSeconds?: number | null;
    sourceNote?: string;
  },
  historical: boolean,
): RecordRow {
  return {
    bracket: b.id,
    label: b.label,
    athlete: r.athlete?.name ?? null,
    athleteSlug: r.athlete?.slug ?? null,
    year: r.year ?? null,
    timeSeconds: r.timeSeconds ?? null,
    ...(r.sourceNote ? { sourceNote: r.sourceNote } : {}),
    ...(historical ? { historical: true } : {}),
  };
}

/**
 * Build the age-bracket records table for one distance and gender.
 *
 * Merges the derived results with the transcribed historical rows and keeps
 * whichever is faster per bracket, so a new finisher can beat a 2007 mark and
 * the table updates itself, while an unbeaten 2007 mark stays visible even
 * though no result document for it can exist.
 *
 * Every bracket is returned, in order, including ones nobody holds. An empty
 * bracket renders as "Unclaimed" rather than vanishing, because a missing row
 * reads as an oversight.
 */
export function bracketRecords(
  results: ResultLike[],
  historical: HistoricalLike[] = [],
): RecordRow[] {
  const best = new Map<string, RecordRow>();

  const consider = (row: RecordRow) => {
    if (row.timeSeconds == null || row.timeSeconds <= 0) return;
    const current = best.get(row.bracket);
    if (!current || current.timeSeconds == null || row.timeSeconds < current.timeSeconds) {
      best.set(row.bracket, row);
    }
  };

  for (const r of results) {
    const b = bracketForAge(r.age);
    if (!b) continue;
    consider(toRow(b, r, false));
  }

  for (const h of historical) {
    const b = h.bracket ? BRACKET_BY_ID[h.bracket] : undefined;
    if (!b) continue;
    consider(toRow(b, h, true));
  }

  return AGE_BRACKETS.map(
    (b) =>
      best.get(b.id) ?? {
        bracket: b.id,
        label: b.label,
        athlete: null,
        year: null,
        timeSeconds: null,
      },
  );
}

/**
 * The outright record: the single fastest row across every bracket.
 *
 * DERIVED, never stored. The live site stores this as a hand-copied duplicate
 * of whichever age row holds it, which is precisely how it came to publish one
 * 1:58:36 as 2011 in the course row and 2010 in the age row. A computed
 * minimum cannot disagree with the row it came from.
 */
export function courseRecord(rows: RecordRow[]): RecordRow | null {
  const held = rows.filter((r) => r.timeSeconds != null && r.timeSeconds > 0);
  if (held.length === 0) return null;
  return held.reduce((a, b) => ((b.timeSeconds as number) < (a.timeSeconds as number) ? b : a));
}
