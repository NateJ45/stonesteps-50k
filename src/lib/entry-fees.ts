// Safe to edit by hand
// =============================================================================
// The entry-fee answer, written from the fee tiers
// =============================================================================
// WHY THIS EXISTS. The contact page's FAQ answered "how much is it, and when do
// prices go up?" with a hand-typed sentence, and on 2026-09-13 it disagreed with
// the tickets on the home page: the FAQ said the 50K was $50 from February and
// $60 from October, the distance documents said $45 and $55. Both were on the
// live site at the same time, so a runner registering in February was quoted a
// different price depending on which page they happened to read.
//
// That is the failure this whole site is built to avoid, and it says so in
// several other places already: the donation figure lives on The Race, the
// director's name lives on The Race, the group's URL lives on The Race. A
// number that appears in two places is a number that will eventually disagree
// with itself. The fee tiers are structured data on the distance documents and
// the tickets already render from them; this makes the FAQ render from them too,
// so the two cannot drift again and a price change is one edit in one place.
//
// It deliberately writes the SAME SENTENCE the editor had typed, rather than a
// table. The answer to a question should read like an answer.
// =============================================================================

export interface FeeTier {
  label?: string;
  amount?: number;
  endsOn?: string;
}

export interface FeeDistance {
  name?: string;
  entryCap?: number;
  feeTiers?: FeeTier[] | null;
}

/** A tier we can actually quote: it has both a price and something to call it. */
interface UsableTier {
  label: string;
  amount: number;
}

/**
 * Words that already carry the preposition, so "Through January 31" reads as
 * "$35 through January 31" while "February 1 to September 30" needs a "from" in
 * front of it. Lowercasing the whole label is not an option: most of them start
 * with a month.
 */
const SELF_PREPOSITIONED = new Set(['through', 'until', 'before', 'from', 'after', 'on']);

function phraseFor(label: string): string {
  const first = label.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  if (SELF_PREPOSITIONED.has(first)) {
    // Only the connector word is lowercased; the rest of the label is left
    // alone because it is nearly always a date.
    return label.trim().replace(/^\S+/, first);
  }
  return `from ${label.trim()}`;
}

function usableTiers(d: FeeDistance): UsableTier[] {
  return (d.feeTiers ?? [])
    .filter((t): t is FeeTier & { amount: number } => typeof t.amount === 'number')
    .map((t) => ({ label: (t.label ?? '').trim(), amount: t.amount }));
}

/** "a, b and c", with no Oxford comma, matching the rest of the site's copy. */
function list(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

const money = (n: number) => `$${n}`;

/**
 * The full answer, or null when there is nothing to say.
 *
 * Null rather than an empty string on purpose: the caller falls back to the
 * editor's typed answer, so an unconfigured or half-configured set of distances
 * degrades to whatever the page said before rather than to a blank card.
 */
export function feeAnswer(distances: readonly FeeDistance[] | null | undefined): string | null {
  const priced = (distances ?? []).filter((d) => d.name && usableTiers(d).length > 0);
  if (priced.length === 0) return null;

  const sentences: string[] = [];

  const first = priced[0];
  const firstTiers = usableTiers(first);
  sentences.push(
    `The ${first.name} is ${list(firstTiers.map((t) => `${money(t.amount)} ${phraseFor(t.label)}`))}.`,
  );

  // A distance whose tiers are labelled identically does not need the dates
  // repeated; saying them twice is what makes a short answer feel like a form.
  const firstLabels = firstTiers.map((t) => t.label).join('|');
  for (const d of priced.slice(1)) {
    const tiers = usableTiers(d);
    const sameDates = tiers.map((t) => t.label).join('|') === firstLabels;
    sentences.push(
      sameDates
        ? `The ${d.name} is ${list(tiers.map((t) => money(t.amount)))} on the same dates.`
        : `The ${d.name} is ${list(tiers.map((t) => `${money(t.amount)} ${phraseFor(t.label)}`))}.`,
    );
  }

  // Not derived, because it is not a number: registration is handled by
  // RunSignUp, which adds its own fee on top of whatever the race charges.
  sentences.push(priced.length === 2 ? 'Both plus a processing fee.' : 'Plus a processing fee.');

  const capped = priced.filter((d) => typeof d.entryCap === 'number');
  if (capped.length === 1) {
    sentences.push(`The ${capped[0].name} is capped at ${capped[0].entryCap} entries.`);
  } else if (capped.length === 2) {
    sentences.push(
      `The ${capped[0].name} is capped at ${capped[0].entryCap} entries and the ${capped[1].name} at ${capped[1].entryCap}.`,
    );
  } else if (capped.length > 2) {
    sentences.push(
      `Entries are capped at ${list(capped.map((d) => `${d.entryCap} for the ${d.name}`))}.`,
    );
  }

  return sentences.join(' ');
}
