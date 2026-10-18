// Safe to edit by hand
// =============================================================================
// Small builders shared by the race's page templates and section patterns
// =============================================================================
// pageTemplates.ts (a whole new page) and sectionPatterns.ts (a few sections
// dropped into a page that exists) use the same blocks the same way, so a
// race-week page and a race-week band on the home page read alike.
//
// Every line the race must supply goes through example(), so it starts
// "Example:" and the page builder warns until it is replaced
// (src/lib/page-guardrails.ts). Keys are added by freshKeys() in the callers.
//
// No `sanity` import here on purpose: node --test loads this file directly.
// =============================================================================

import { example } from '../lib/authoring.ts';

export { example };

type Rec = Record<string, unknown>;

/** One Portable Text paragraph (or heading, with a style). */
export const para = (text: string, style = 'normal'): Rec => ({
  _type: 'block',
  style,
  markDefs: [],
  children: [{ _type: 'span', marks: [], text }],
});

/** A button to a page on this site (the editor can repoint it). */
export const button = (label: string, internalPath?: string): Rec => ({
  _type: 'ctaBlock',
  label,
  linkType: 'internal',
  ...(internalPath ? { internalPath } : {}),
});

/** A button to somewhere else: RunSignUp, a sign-up sheet, a photo album. */
export const outLink = (label: string): Rec => ({
  _type: 'ctaBlock',
  label,
  linkType: 'external',
});

/** The page's opening band, the one every page on the site starts with. */
export const header = (eyebrow: string, headline: string, lede: string): Rec => ({
  _type: 'pageHeaderSection',
  eyebrow: example(eyebrow),
  headline: example(headline),
  lede: example(lede),
});

/** A text block: a heading and a few paragraphs. */
export const text = (heading: string, ...paragraphs: string[]): Rec => ({
  _type: 'richTextSection',
  heading: example(heading),
  body: paragraphs.map((p) => para(example(p))),
});

/** The call-to-action band: a headline, a line and one button. */
export const band = (headline: string, subhead: string, cta: Rec): Rec => ({
  _type: 'ctaBandSection',
  headline: example(headline),
  subhead: example(subhead),
  cta,
});

/** A race block that draws itself from the race's own data, with its heading. */
export const raceBlock = (type: string, eyebrow: string, headline: string): Rec => ({
  _type: type,
  eyebrow: example(eyebrow),
  headline: example(headline),
});
