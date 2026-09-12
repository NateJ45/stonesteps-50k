// =============================================================================
// display-words — splitting a headline for the per-letter wordmark (2026-09-12)
// =============================================================================
// One function, extracted from RaceHero.astro so a test can reach it, because
// the thing it guards against is invisible by construction.
//
// THE BUG THIS EXISTS TO PREVENT. The hero wordmark is drawn one character at a
// time so each letter can carry a fraction of a degree of rotation, and the
// characters are grouped into words so a word never breaks across a line end.
// Grouping meant `headline.split(/\s+/)`.
//
// In the Studio's preview every string arrives carrying a STEGA RUN: a few
// hundred invisible characters appended by @vercel/stega holding the field's
// edit intent. Its four-character alphabet is U+200B, U+200C, U+200D and
// U+FEFF, and U+FEFF IS WHITESPACE to a JavaScript regex. So the split did not
// see "Stone Steps 50k" plus an opaque tail: it saw 157 words. Each is an
// `inline-block`, so the wordmark stacked 157 rows deep and the hero band grew
// from 1032px to 1879px. Live text carries no run, so the live page was fine
// and only the preview showed the gap, which is the hardest kind of bug to
// believe a report of.
//
// The run is removed here, not preserved: these spans are aria-hidden
// decoration, and one character per span leaves no contiguous run for a decoder
// to read anyway. The real string, payload intact, is rendered separately in the
// heading's sr-only copy.
// =============================================================================

import { splitStega } from './preview-stega.ts';

/**
 * A headline as the words the wordmark should draw.
 *
 * Always split the CLEANED string. See the note above: a stega run contains a
 * character that `\s` matches, so splitting the raw string is a preview-only
 * explosion rather than an ordinary off-by-one.
 */
export function displayWords(headline: string): string[] {
  return splitStega(headline).cleaned.split(/\s+/).filter(Boolean);
}
