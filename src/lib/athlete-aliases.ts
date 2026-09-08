// One runner, one athlete document, even when the race spelled them two ways.
//
// The whole results model rests on a runner producing a single slug, because
// that slug is their identity: it is the athlete document's _id, the reference
// every result carries, and the thing /runners/<slug> renders. When the source
// spells someone two ways, the slug forks and so does their history. That is
// not cosmetic. Wesley Fenton ran six consecutive years and the archive showed
// four, because the other two arrived under a second spelling.
//
// Casing and punctuation are handled upstream in titleCaseName and slugify, so
// "TED BROSS", "Ted Bross" and "O'Hara" versus "O’Hara" never reach this file.
// What reaches this file is the residue: a suffix the race printed one year and
// not the next, a middle initial, a shortened first name. There is no rule that
// catches those, so they are listed, one at a time, with the evidence.
//
// THE BAR FOR ADDING AN ENTRY. Merging two people is a worse error than leaving
// one person split, because it silently attributes someone's finishing times to
// a stranger and the page states it as fact. So an entry needs positive
// evidence of identity, not just a similar-looking name. In practice that has
// meant a continuous age sequence across the two spellings, which a coincidence
// of names does not produce.
//
// The rejected candidates at the bottom are as much a part of this file as the
// accepted ones: they stop the next person re-deriving the same analysis and
// reaching a bolder conclusion on a tired afternoon.

export interface AthleteAlias {
  /** The canonical slug and the name to publish under it. */
  slug: string;
  name: string;
}

/**
 * Variant slug to canonical identity.
 *
 * Keyed by the slug the variant spelling produces, so lookups happen after
 * slugify and never depend on matching raw source text.
 */
export const ATHLETE_ALIASES: Record<string, AthleteAlias> = {
  // The 2011 results page printed his full name with the generational suffix;
  // every other year printed it without.
  //
  // EVIDENCE: ages 35 (2011), 36 (2012), 37 (2013), 38 (2014), one per year
  // without a gap, and both spellings give Cincinnati, OH.
  'harvey-lewis-iii': { slug: 'harvey-lewis', name: 'Harvey Lewis' },

  // A middle initial that appears in two years out of eleven.
  //
  // EVIDENCE: ages 43 (2011), 44 (2012), 46 (2014), 47 (2015) run straight
  // through the two spellings, and both give Cincinnati, OH.
  'brian-k-young': { slug: 'brian-young', name: 'Brian Young' },

  // The HTML years published the short form, the timing spreadsheets the long
  // one. Canonical is the short form: it is what the race printed most often
  // and what he is known by.
  //
  // EVIDENCE: ages 42, 43, 44 (2003 to 2005, as Rob) then 46 in 2007 (as
  // Robert), which is the same person aging one year per race with 2006
  // carrying no age. Both spellings are the only Apple in twenty-two years.
  'robert-apple': { slug: 'rob-apple', name: 'Rob Apple' },
};

/**
 * Deliberately NOT merged. Each looks like a typo and might be one, and none of
 * them carries evidence that two records belong to one person.
 *
 * Kept as data rather than a comment so a future session can see what was
 * examined. If an age or a city ever turns up that settles one, move it up.
 */
export const REJECTED_ALIASES: { slugs: string[]; why: string }[] = [
  {
    slugs: ['garry-blair', 'gary-blair'],
    why:
      'One letter apart and both Ohio, but the 2006 row carries no age, so there is ' +
      'nothing to line up against the 2009 age of 46. Garry and Gary are both real ' +
      'spellings of a real name.',
  },
  {
    slugs: ['jerry-swartzel', 'jerry-swatzel'],
    why:
      'Almost certainly one man, and still not merged: the 2006 row carries no age. ' +
      'Swatzel is independently attested in the 2007 timing sheet (Tammy Swatzel), ' +
      'which makes Swartzel the likely typo, but likely is not the bar.',
  },
];

/** The canonical identity for a slug, or null when it is already canonical. */
export function aliasFor(slug: string): AthleteAlias | null {
  return ATHLETE_ALIASES[slug] ?? null;
}

/** Collapse a slug onto its canonical form. Safe to call on any slug. */
export function canonicalSlug(slug: string): string {
  return ATHLETE_ALIASES[slug]?.slug ?? slug;
}

/** The name to publish for a runner, given the spelling this source used. */
export function canonicalName(slug: string, sourceName: string): string {
  return ATHLETE_ALIASES[slug]?.name ?? sourceName;
}
