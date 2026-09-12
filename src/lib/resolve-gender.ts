// =============================================================================
// resolve-gender — filling an unknown gender from the same runner's other years
// (2026-09-12)
// =============================================================================
// THE BUG THIS EXISTS TO FIX. The 2004 archive row said the race had no women's
// winner: the results page showed a men's winner and a dash beside it, while
// Linda Barhorst's 6:17:05 sat in the finisher table below. Her row carried
// `gender: "X"`, unknown, and the winner lookup asks for "F".
//
// Four rows in 2,188 carry X, all of them recovered from the Wayback captures
// of the race's own results pages, where three women's rows and one man's came
// through without a gender while everyone around them had one. It is a
// transcription gap in the source, not a statement about anybody.
//
// WHAT THIS DOES, AND WHAT IT REFUSES TO DO. It fills an unknown gender ONLY
// from the same runner's other finishes in the same archive, and only when
// those other finishes AGREE. Linda Barhorst is recorded F in six other years,
// Rosemary Evans in two, Wesley Fenton M in five. That is the race's own
// published record of the same person, which is evidence.
//
// It does NOT guess from a name. Molly Moilanen ran 2004 and no other year on
// file, so there is nothing to resolve her from and she stays X. Inferring a
// person's gender from their first name is exactly the kind of confident
// mistake this codebase should not make about a real runner, and an unknown
// gender costs the site one dash. Guessing wrong costs somebody their record.
//
// Conflicting evidence also leaves the row alone: if a slug carried both M and
// F elsewhere it would mean the alias table has merged two people, which is a
// data problem to look at rather than to paper over.
// =============================================================================

/** The minimum a row needs: who it belongs to, and what gender it claims. */
export interface GenderedRow {
  slug: string;
  gender?: string | null;
}

/** A gender that names a person rather than standing in for a gap. */
const KNOWN = new Set(['M', 'F']);

/**
 * Fill every unknown gender that the same runner's other rows can settle.
 *
 * Returns a NEW array; the input is not touched, so a caller can keep the
 * recovered transcript exactly as it was recovered and derive from it.
 */
export function resolveUnknownGenders<T extends GenderedRow>(rows: readonly T[]): T[] {
  // What each runner is recorded as elsewhere. A runner with two different
  // known genders on file is deliberately left unresolvable: see the note above.
  const seen = new Map<string, Set<string>>();
  for (const row of rows) {
    const g = row.gender ?? '';
    if (!KNOWN.has(g)) continue;
    const set = seen.get(row.slug) ?? new Set<string>();
    set.add(g);
    seen.set(row.slug, set);
  }

  return rows.map((row) => {
    if (KNOWN.has(row.gender ?? '')) return row;
    const evidence = seen.get(row.slug);
    if (!evidence || evidence.size !== 1) return row;
    return { ...row, gender: [...evidence][0] };
  });
}

/** The rows this pass changed, for an importer that wants to say so. */
export function resolvedGenderReport<T extends GenderedRow>(
  before: readonly T[],
  after: readonly T[],
): { slug: string; gender: string }[] {
  const out: { slug: string; gender: string }[] = [];
  for (let i = 0; i < before.length; i++) {
    const a = before[i];
    const b = after[i];
    if (a && b && a.gender !== b.gender) out.push({ slug: b.slug, gender: b.gender ?? '' });
  }
  return out;
}
